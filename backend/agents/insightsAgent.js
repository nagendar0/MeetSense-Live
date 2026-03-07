const AgentBase = require("./agentBase");
const logger = require("../utils/logger");
const { AppError } = require("../utils/errorHandler");

/**
 * Insights Agent
 * Extracts tasks, deadlines, decisions, and key insights from transcript
 * Builds on understanding agent's topic analysis
 */
class InsightsAgent extends AgentBase {
  constructor() {
    super("Insights");
  }

  /**
   * Initialize the insights agent
   */
  async initialize() {
    await super.initialize();
    this.log("info", "Insights Agent ready");
  }

  /**
   * Process transcript to extract insights
   * @param {Object} input - { transcript, previousInsights, topics }
   * @param {Object} context - meeting state object
   * @returns {Object} - { tasks, decisions, deadlines, keyInsights, suggestions }
   */
  async process(input, context = {}) {
    this.validateInput(input, ["transcript"]);

    const { transcript, previousInsights = null, topics = [] } = input;
    const meetingState = context.meetingState;

    this.log("info", "Extracting meeting insights", {
      transcriptLength: transcript.length,
      hasPreviousInsights: !!previousInsights,
      topicCount: topics.length,
    });

    try {
      // Extract comprehensive insights
      const insightsResult = await this.retryWithBackoff(async () => {
        return await this.extractInsights(transcript, previousInsights);
      });

      // Generate actionable suggestions
      const suggestions = await this.generateSuggestions(
        transcript,
        insightsResult,
      );

      // Identify key highlights
      const highlights = await this.extractHighlights(
        transcript,
        insightsResult,
      );

      const insightsData = {
        tasks: insightsResult.tasks || [],
        decisions: insightsResult.decisions || [],
        deadlines: insightsResult.deadlines || [],
        topics: insightsResult.topics || topics,
        keyInsights: insightsResult.keyInsights || [],
        suggestions,
        highlights,
        timestamp: new Date().toISOString(),
      };

      // Update meeting state if provided
      if (meetingState) {
        this.updateMeetingState(meetingState, "insights", insightsData);
        this.updateMeetingState(
          meetingState,
          "actionItems",
          insightsData.tasks,
        );
        this.log("info", "Updated meeting state with insights", {
          taskCount: insightsData.tasks?.length || 0,
          decisionCount: insightsData.decisions?.length || 0,
        });
      }

      this.log("info", "Insights extraction completed", {
        taskCount: insightsData.tasks?.length || 0,
        decisionCount: insightsData.decisions?.length || 0,
      });

      return {
        success: true,
        data: insightsData,
        agent: this.name,
      };
    } catch (error) {
      this.log("error", "Insights extraction failed", {
        error: error.message,
      });
      throw new AppError(`Insights extraction failed: ${error.message}`, 500);
    }
  }

  /**
   * Extract insights from transcript
   */
  async extractInsights(transcript, previousInsights = null) {
    const previousContext = previousInsights
      ? `Previous insights to update from:\n${JSON.stringify(
          {
            tasks: previousInsights.tasks,
            decisions: previousInsights.decisions,
            deadlines: previousInsights.deadlines,
          },
          null,
          2,
        )}\n\n`
      : "";

    const prompt = `Analyze this meeting transcript and extract comprehensive insights in JSON format:

${previousContext}

Transcript:
${transcript.slice(-6000)}

Provide JSON with:
- tasks: Array of tasks/action items with {description, assignee?, dueDate?, priority?, status?}
- decisions: Array of decisions made with {description, participants?, consensus?}
- deadlines: Array of deadlines with {description, date, urgency?}
- topics: Array of key discussion topics
- keyInsights: Array of important observations or findings

Respond ONLY with valid JSON.`;

    const schema = {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              assignee: { type: "string" },
              dueDate: { type: "string" },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              status: {
                type: "string",
                enum: ["pending", "in-progress", "completed"],
              },
            },
            required: ["description"],
          },
        },
        decisions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              participants: { type: "array", items: { type: "string" } },
              consensus: { type: "boolean" },
            },
            required: ["description"],
          },
        },
        deadlines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              date: { type: "string" },
              urgency: { type: "string", enum: ["high", "medium", "low"] },
            },
            required: ["description", "date"],
          },
        },
        topics: {
          type: "array",
          items: { type: "string" },
        },
        keyInsights: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["tasks", "decisions", "deadlines", "topics", "keyInsights"],
    };

    return this.geminiService.generateStructuredContent(prompt, schema);
  }

  /**
   * Generate actionable suggestions based on insights
   */
  async generateSuggestions(transcript, insights) {
    const prompt = `Based on this meeting transcript and extracted insights, provide helpful suggestions.

Transcript excerpt:
${transcript.slice(-1000)}

Current insights:
${JSON.stringify(insights)}

Generate suggestions like:
- "You mentioned a deadline but did not assign a task owner"
- "Consider summarizing key decisions made"
- "This topic seems important - might want to add action items"
- "Several tasks were mentioned, consider prioritizing"

Return as JSON array of strings.`;

    const result = await this.geminiService.generateContent(prompt);

    try {
      return JSON.parse(result);
    } catch {
      return [];
    }
  }

  /**
   * Extract key highlights from the meeting
   */
  async extractHighlights(transcript, insights) {
    const prompt = `Identify the key highlights from this meeting transcript.

Transcript:
${transcript.slice(-3000)}

Insights:
${JSON.stringify({
  tasks: insights.tasks?.slice(0, 5),
  decisions: insights.decisions?.slice(0, 5),
  deadlines: insights.deadlines?.slice(0, 5),
})}

Extract 3-5 most important highlights in JSON array format:
- Each highlight should be a concise string
- Focus on actionable or memorable points

Respond ONLY with valid JSON array.`;

    const result = await this.geminiService.generateContent(prompt);

    try {
      return JSON.parse(result);
    } catch {
      return [];
    }
  }

  /**
   * Generate real-time insights (incremental update)
   */
  async processRealtime(input, context = {}) {
    const { transcript, previousInsights = null } = input;
    const meetingState = context.meetingState;

    this.log("info", "Generating real-time insights", {
      transcriptLength: transcript.length,
      hasPreviousInsights: !!previousInsights,
    });

    try {
      // Get previous insights from meeting state if not provided
      if (!previousInsights && meetingState?.insights) {
        input.previousInsights = meetingState.insights;
      }

      // Use the main process for comprehensive insights
      const result = await this.process(input, context);

      return result;
    } catch (error) {
      this.log("error", "Real-time insights failed", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get task summary with status
   */
  getTaskSummary(insights) {
    if (!insights?.tasks) {
      return { total: 0, byPriority: {}, byStatus: {} };
    }

    const tasks = insights.tasks;
    const byPriority = {
      high: tasks.filter((t) => t.priority === "high").length,
      medium: tasks.filter((t) => t.priority === "medium").length,
      low: tasks.filter((t) => t.priority === "low").length,
    };

    const byStatus = {
      pending: tasks.filter((t) => t.status === "pending").length,
      inProgress: tasks.filter((t) => t.status === "in-progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
    };

    return {
      total: tasks.length,
      byPriority,
      byStatus,
    };
  }

  /**
   * Format insights for frontend display
   */
  formatForFrontend(insights) {
    return {
      tasks: insights.tasks || [],
      decisions: insights.decisions || [],
      deadlines: insights.deadlines || [],
      topics: insights.topics || [],
      suggestions: insights.suggestions || [],
      highlights: insights.highlights || [],
      taskSummary: this.getTaskSummary(insights),
    };
  }
}

module.exports = new InsightsAgent();
