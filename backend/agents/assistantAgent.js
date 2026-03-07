const AgentBase = require("./agentBase");
const logger = require("../utils/logger");
const { AppError } = require("../utils/errorHandler");

/**
 * Assistant Agent
 * Handles user chat questions and provides context-aware answers
 * Uses full meeting context including transcript, insights, and screen analysis
 */
class AssistantAgent extends AgentBase {
  constructor() {
    super("Assistant");
    this.conversationHistory = [];
    this.maxHistoryLength = 20;
  }

  /**
   * Initialize the assistant agent
   */
  async initialize() {
    await super.initialize();
    this.log("info", "Assistant Agent ready");
  }

  /**
   * Process user question and generate context-aware response
   * @param {Object} input - { question, transcript, insights, screenAnalysis, history }
   * @param {Object} context - meeting state object
   * @returns {Object} - { answer, sources, context }
   */
  async process(input, context = {}) {
    const { question, history = [] } = input;
    const meetingState = context.meetingState;

    if (!question) {
      throw new AppError("Question is required", 400);
    }

    this.log("info", "Processing user question", {
      questionLength: question.length,
      hasMeetingState: !!meetingState,
      historyLength: history.length,
    });

    try {
      // Gather context from meeting state if available
      let transcript = input.transcript;
      let insights = input.insights;
      let screenAnalysis = input.screenAnalysis;

      if (meetingState) {
        transcript = transcript || meetingState.transcript || "";
        insights = insights || meetingState.insights;
        screenAnalysis = screenAnalysis || meetingState.screenAnalysis || [];
      }

      // Build context for the question
      const contextData = this.buildContext(
        transcript,
        insights,
        screenAnalysis,
      );

      // Add to conversation history
      const conversationHistory = [
        ...history,
        ...this.conversationHistory.slice(-this.maxHistoryLength),
      ];

      // Generate answer
      const answer = await this.retryWithBackoff(async () => {
        return await this.generateAnswer(
          question,
          contextData,
          conversationHistory,
        );
      });

      // Update conversation history
      this.addToHistory(question, answer);

      const response = {
        answer,
        sources: this.extractSources(contextData),
        timestamp: new Date().toISOString(),
        context: {
          transcriptLength: transcript?.length || 0,
          hasInsights: !!insights,
          screenAnalysisCount: screenAnalysis?.length || 0,
        },
      };

      this.log("info", "Question answered successfully", {
        answerLength: answer.length,
      });

      return {
        success: true,
        data: response,
        agent: this.name,
      };
    } catch (error) {
      this.log("error", "Question answering failed", { error: error.message });
      throw new AppError(`Question answering failed: ${error.message}`, 500);
    }
  }

  /**
   * Build context from meeting data
   */
  buildContext(transcript, insights, screenAnalysis) {
    let context = "";

    // Add transcript context
    if (transcript && transcript.length > 0) {
      context += `MEETING TRANSCRIPT:\n${transcript}\n\n`;
    }

    // Add insights context
    if (insights) {
      context += `MEETING INSIGHTS:\n`;

      if (insights.tasks?.length > 0) {
        context += `Tasks/Action Items:\n${insights.tasks
          .map(
            (t) => `- ${t.description}${t.assignee ? ` (${t.assignee})` : ""}`,
          )
          .join("\n")}\n\n`;
      }

      if (insights.decisions?.length > 0) {
        context += `Decisions Made:\n${insights.decisions
          .map((d) => `- ${d.description}`)
          .join("\n")}\n\n`;
      }

      if (insights.deadlines?.length > 0) {
        context += `Deadlines:\n${insights.deadlines
          .map((d) => `- ${d.description} (${d.date})`)
          .join("\n")}\n\n`;
      }

      if (insights.topics?.length > 0) {
        context += `Discussion Topics:\n${insights.topics.join(", ")}\n\n`;
      }
    }

    // Add screen analysis context
    if (screenAnalysis && screenAnalysis.length > 0) {
      context += `SCREEN ANALYSIS:\n`;
      screenAnalysis.forEach((screen, index) => {
        context += `Screen ${index + 1}: ${screen.analysis || screen}\n`;
      });
    }

    return context;
  }

  /**
   * Generate answer using Gemini
   */
  async generateAnswer(question, context, history) {
    const historyContext =
      history.length > 0
        ? `Previous conversation:\n${history
            .map((h) => `User: ${h.question}\nAssistant: ${h.answer}`)
            .join("\n\n")}\n\n`
        : "";

    const prompt = `You are a helpful AI assistant for MeetSense Live, analyzing meeting content. 
Based on the meeting context provided, answer the user's question accurately and concisely.

${historyContext}

${context}

USER'S QUESTION: ${question}

Instructions:
- Answer based only on the meeting context provided
- If the answer cannot be determined from the context, say so clearly
- Be concise but informative
- If referencing specific parts of the meeting, mention them
- Use a friendly, professional tone

Provide your answer:`;

    return this.geminiService.generateContent(prompt);
  }

  /**
   * Extract source references from context
   */
  extractSources(contextData) {
    const sources = [];

    if (contextData.includes("MEETING TRANSCRIPT:")) {
      sources.push("transcript");
    }
    if (contextData.includes("MEETING INSIGHTS:")) {
      sources.push("insights");
    }
    if (contextData.includes("SCREEN ANALYSIS:")) {
      sources.push("screenAnalysis");
    }

    return sources;
  }

  /**
   * Add question/answer to conversation history
   */
  addToHistory(question, answer) {
    this.conversationHistory.push({
      question,
      answer,
      timestamp: new Date().toISOString(),
    });

    // Keep history limited
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(
        -this.maxHistoryLength,
      );
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
    this.log("info", "Conversation history cleared");
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return this.conversationHistory;
  }

  /**
   * Process chat message (similar to question but with full conversation context)
   */
  async processChat(input, context = {}) {
    const { message, transcript, insights, screenAnalysis } = input;
    const meetingState = context.meetingState;

    if (!message) {
      throw new AppError("Message is required", 400);
    }

    this.log("info", "Processing chat message", {
      messageLength: message.length,
      hasMeetingState: !!meetingState,
    });

    // Gather full context
    let fullTranscript = transcript;
    let fullInsights = insights;
    let fullScreenAnalysis = screenAnalysis;

    if (meetingState) {
      fullTranscript = fullTranscript || meetingState.transcript || "";
      fullInsights = fullInsights || meetingState.insights;
      fullScreenAnalysis =
        fullScreenAnalysis || meetingState.screenAnalysis || [];
    }

    // Build context with conversation history
    let contextString = "";

    if (fullTranscript) {
      contextString += `Meeting Transcript:\n${fullTranscript}\n\n`;
    }

    if (fullInsights) {
      contextString += `Meeting Insights:\n${JSON.stringify(fullInsights, null, 2)}\n\n`;
    }

    if (fullScreenAnalysis && fullScreenAnalysis.length > 0) {
      contextString += `Screen Analysis:\n${fullScreenAnalysis
        .map((s) => s.analysis || s)
        .join("\n")}\n\n`;
    }

    // Include conversation history
    if (this.conversationHistory.length > 0) {
      contextString += `Previous Conversation:\n${this.conversationHistory
        .map((h) => `User: ${h.question}\nAssistant: ${h.answer}`)
        .join("\n\n")}\n\n`;
    }

    contextString += `Current Message: ${message}`;

    const prompt = `You are a helpful AI assistant analyzing a meeting. Based on the context provided, respond to the user's message.

${contextString}

Provide a clear, helpful response:`;

    const answer = await this.geminiService.generateContent(prompt);

    // Add to history
    this.addToHistory(message, answer);

    return {
      success: true,
      data: {
        answer,
        timestamp: new Date().toISOString(),
        history: this.conversationHistory,
      },
      agent: this.name,
    };
  }

  /**
   * Generate quick summary of meeting
   */
  async generateSummary(input, context = {}) {
    const { transcript, insights } = input;
    const meetingState = context.meetingState;

    let fullTranscript = transcript;
    let fullInsights = insights;

    if (meetingState) {
      fullTranscript = fullTranscript || meetingState.transcript || "";
      fullInsights = fullInsights || meetingState.insights;
    }

    if (!fullTranscript) {
      throw new AppError("No transcript available", 400);
    }

    const prompt = `Provide a quick summary of this meeting in 2-3 sentences:

Transcript:
${fullTranscript.slice(-3000)}

${
  fullInsights
    ? `Additional Insights:\n${JSON.stringify({
        tasks: fullInsights.tasks?.slice(0, 3),
        decisions: fullInsights.decisions?.slice(0, 3),
      })}`
    : ""
}

Summarize:`;

    const summary = await this.geminiService.generateContent(prompt);

    return {
      success: true,
      data: {
        summary,
        transcriptLength: fullTranscript.length,
      },
      agent: this.name,
    };
  }
}

module.exports = new AssistantAgent();
