const AgentBase = require("./agentBase");
const logger = require("../utils/logger");
const { AppError } = require("../utils/errorHandler");

/**
 * Understanding Agent
 * Analyzes transcript and screen content to detect discussion topics,
 * context shifts, and provides semantic understanding of meeting content
 */
class UnderstandingAgent extends AgentBase {
  constructor() {
    super("Understanding");
    this.topicThreshold = 0.3;
    this.minTopicLength = 50;
  }

  /**
   * Initialize the understanding agent
   */
  async initialize() {
    await super.initialize();
    this.log("info", "Understanding Agent ready");
  }

  /**
   * Process transcript and screen analysis to understand meeting context
   * @param {Object} input - { transcript, screenAnalysis, previousTopics }
   * @param {Object} context - meeting state object
   * @returns {Object} - { topics, context, shifts, entities }
   */
  async process(input, context = {}) {
    this.validateInput(input, ["transcript"]);

    const { transcript, screenAnalysis = [], previousTopics = [] } = input;
    const meetingState = context.meetingState;

    this.log("info", "Analyzing meeting understanding", {
      transcriptLength: transcript.length,
      screenAnalysisCount: screenAnalysis.length,
      hasPreviousTopics: previousTopics.length > 0,
    });

    try {
      // Extract topics from transcript
      const topicResult = await this.retryWithBackoff(async () => {
        return await this.analyzeTopics(transcript, previousTopics);
      });

      // Analyze context shifts if screen analysis available
      let contextShifts = [];
      if (screenAnalysis.length > 0) {
        contextShifts = await this.detectContextShifts(
          transcript,
          screenAnalysis,
        );
      }

      // Extract key entities (people, dates, projects, etc.)
      const entities = await this.extractEntities(transcript);

      const understandingData = {
        topics: topicResult.topics,
        currentTopic: topicResult.currentTopic,
        context: topicResult.context,
        contextShifts,
        entities,
        sentiment: topicResult.sentiment,
        timestamp: new Date().toISOString(),
      };

      // Update meeting state if provided
      if (meetingState) {
        this.updateMeetingState(
          meetingState,
          "understanding",
          understandingData,
        );
        this.updateMeetingState(meetingState, "topics", topicResult.topics);
        this.log("info", "Updated meeting state with understanding", {
          topicCount: topicResult.topics.length,
        });
      }

      this.log("info", "Understanding analysis completed", {
        topicCount: topicResult.topics.length,
        entityCount: Object.keys(entities).length,
      });

      return {
        success: true,
        data: understandingData,
        agent: this.name,
      };
    } catch (error) {
      this.log("error", "Understanding analysis failed", {
        error: error.message,
      });
      throw new AppError(
        `Understanding analysis failed: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Analyze topics from transcript
   */
  async analyzeTopics(transcript, previousTopics = []) {
    const previousContext =
      previousTopics.length > 0
        ? `Previous topics detected:\n${previousTopics
            .map((t) => `- ${t.name}: ${t.description}`)
            .join("\n")}\n\n`
        : "";

    const prompt = `Analyze this meeting transcript and identify discussion topics in JSON format:

${previousContext}

Transcript:
${transcript.slice(-5000)}

Provide JSON with:
- topics: Array of objects with {name, description, confidence, startTime?, endTime?}
- currentTopic: The main topic currently being discussed
- context: Brief context summary of what's happening in the meeting
- sentiment: Overall sentiment (positive, neutral, negative, mixed)

Respond ONLY with valid JSON.`;

    const result = await this.geminiService.generateStructuredContent(prompt, {
      type: "object",
      properties: {
        topics: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              confidence: { type: "number" },
              startTime: { type: "string" },
              endTime: { type: "string" },
            },
            required: ["name", "description", "confidence"],
          },
        },
        currentTopic: { type: "string" },
        context: { type: "string" },
        sentiment: {
          type: "string",
          enum: ["positive", "neutral", "negative", "mixed"],
        },
      },
      required: ["topics", "currentTopic", "context", "sentiment"],
    });

    return result;
  }

  /**
   * Detect context shifts based on screen analysis
   */
  async detectContextShifts(transcript, screenAnalysis) {
    const screenDescriptions = screenAnalysis
      .map((s, i) => `Screen ${i + 1}: ${s.analysis || s}`)
      .join("\n\n");

    const prompt = `Analyze the screen captures and transcript to detect context shifts (when the meeting topic changes):

Screen Analyses:
${screenDescriptions}

Transcript excerpt:
${transcript.slice(-2000)}

Provide JSON array of context shifts, each with:
- timestamp: When the shift occurred
- fromTopic: What was being discussed before
- toTopic: What is being discussed now
- trigger: What triggered the change (e.g., "slide change", "new speaker", "new agenda item")

Respond ONLY with valid JSON array.`;

    const result = await this.geminiService.generateContent(prompt);

    try {
      return JSON.parse(result);
    } catch {
      return [];
    }
  }

  /**
   * Extract key entities from transcript
   */
  async extractEntities(transcript) {
    const prompt = `Extract key entities from this meeting transcript in JSON format:

Transcript:
${transcript.slice(-3000)}

Identify and categorize:
- people: Names of people mentioned
- projects: Project names or codes
- dates: Dates and deadlines mentioned
- numbers: Key numbers (budgets, percentages, quantities)
- locations: Places mentioned
- technical: Technical terms or tools

Provide JSON with keys as categories and arrays of strings as values.
Respond ONLY with valid JSON.`;

    const result = await this.geminiService.generateContent(prompt);

    try {
      return JSON.parse(result);
    } catch {
      return {
        people: [],
        projects: [],
        dates: [],
        numbers: [],
        locations: [],
        technical: [],
      };
    }
  }

  /**
   * Get topic progression over time
   */
  async analyzeTopicProgression(topics) {
    if (!topics || topics.length === 0) {
      return {
        progression: [],
        summary: "No topics to analyze",
      };
    }

    const progression = topics.map((topic, index) => ({
      order: index + 1,
      topic: topic.name,
      description: topic.description,
      duration:
        topic.endTime && topic.startTime
          ? new Date(topic.endTime) - new Date(topic.startTime)
          : null,
    }));

    return {
      progression,
      totalTopics: topics.length,
      mainTopics: topics.slice(0, 3).map((t) => t.name),
    };
  }

  /**
   * Compare current understanding with previous to detect changes
   */
  detectTopicChanges(current, previous) {
    if (!previous || !previous.topics) {
      return { hasChanges: false, newTopics: current.topics || [] };
    }

    const previousTopicNames = new Set(previous.topics.map((t) => t.name));
    const newTopics = (current.topics || []).filter(
      (t) => !previousTopicNames.has(t.name),
    );

    return {
      hasChanges: newTopics.length > 0,
      newTopics,
      maintainedTopics: (current.topics || []).filter((t) =>
        previousTopicNames.has(t.name),
      ),
    };
  }
}

module.exports = new UnderstandingAgent();
