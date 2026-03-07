const logger = require("../utils/logger");
const { AppError } = require("../utils/errorHandler");

// Import agents
const transcriptionAgent = require("./transcriptionAgent");
const understandingAgent = require("./understandingAgent");
const insightsAgent = require("./insightsAgent");
const visionAgent = require("./visionAgent");
const assistantAgent = require("./assistantAgent");

/**
 * Pipeline Coordinator
 * Orchestrates the AI agent pipeline and manages meeting state
 * Flow: Audio → Transcription → Understanding → Insights → Assistant
 */
class PipelineCoordinator {
  constructor() {
    this.agents = {
      transcription: transcriptionAgent,
      understanding: understandingAgent,
      insights: insightsAgent,
      vision: visionAgent,
      assistant: assistantAgent,
    };

    this.activePipelines = new Map();
    this.eventCallbacks = [];
  }

  /**
   * Initialize all agents
   */
  async initialize() {
    logger.info("Initializing AI Agent Pipeline...");

    for (const [name, agent] of Object.entries(this.agents)) {
      try {
        await agent.initialize();
        logger.info(`✓ ${name} agent initialized`);
      } catch (error) {
        logger.error(`✗ Failed to initialize ${name} agent:`, error);
      }
    }

    logger.info("AI Agent Pipeline initialized successfully");
    return this;
  }

  /**
   * Create a new meeting pipeline
   */
  createPipeline(meetingId, options = {}) {
    const meetingState = {
      id: meetingId,
      transcript: "",
      transcription: null,
      understanding: null,
      insights: null,
      screenAnalysis: [],
      summary: null,
      actionItems: [],
      topics: [],
      status: "initializing", // initializing, active, processing, completed
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: options.metadata || {},
    };

    this.activePipelines.set(meetingId, {
      meetingState,
      isProcessing: false,
      lastAgent: null,
      processingQueue: [],
    });

    logger.info(`Pipeline created for meeting: ${meetingId}`);
    return meetingState;
  }

  /**
   * Get pipeline by meeting ID
   */
  getPipeline(meetingId) {
    const pipeline = this.activePipelines.get(meetingId);
    if (!pipeline) {
      throw new AppError(`Pipeline not found for meeting: ${meetingId}`, 404);
    }
    return pipeline;
  }

  /**
   * Get meeting state
   */
  getMeetingState(meetingId) {
    const pipeline = this.getPipeline(meetingId);
    return pipeline.meetingState;
  }

  /**
   * Emit event to all subscribers
   */
  emit(event, data) {
    this.eventCallbacks.forEach((callback) => {
      try {
        callback(event, data);
      } catch (error) {
        logger.error("Event callback error:", error);
      }
    });
  }

  /**
   * Subscribe to pipeline events
   */
  onEvent(callback) {
    this.eventCallbacks.push(callback);
  }

  /**
   * Process audio through the full pipeline
   * Audio → Transcription → Understanding → Insights
   */
  async processAudio(meetingId, audioData, options = {}) {
    const pipeline = this.getPipeline(meetingId);
    const { meetingState } = pipeline;

    logger.info(`Processing audio for meeting: ${meetingId}`);

    try {
      pipeline.isProcessing = true;
      meetingState.status = "processing";

      // Step 1: Transcription
      this.emit("agent:start", { agent: "transcription", meetingId });

      const transcriptionResult = await this.agents.transcription.process(
        { audioData, ...options },
        { meetingState },
      );

      meetingState.transcript = transcriptionResult.data.transcript;
      this.emit("agent:complete", {
        agent: "transcription",
        meetingId,
        data: transcriptionResult.data,
      });

      // Step 2: Understanding (using transcript and screen analysis)
      this.emit("agent:start", { agent: "understanding", meetingId });

      const understandingResult = await this.agents.understanding.process(
        {
          transcript: meetingState.transcript,
          screenAnalysis: meetingState.screenAnalysis,
          previousTopics: meetingState.topics,
        },
        { meetingState },
      );

      meetingState.understanding = understandingResult.data;
      meetingState.topics = understandingResult.data.topics;
      this.emit("agent:complete", {
        agent: "understanding",
        meetingId,
        data: understandingResult.data,
      });

      // Step 3: Insights
      this.emit("agent:start", { agent: "insights", meetingId });

      const insightsResult = await this.agents.insights.process(
        {
          transcript: meetingState.transcript,
          previousInsights: meetingState.insights,
          topics: meetingState.topics,
        },
        { meetingState },
      );

      meetingState.insights = insightsResult.data;
      meetingState.actionItems = insightsResult.data.tasks;
      this.emit("agent:complete", {
        agent: "insights",
        meetingId,
        data: insightsResult.data,
      });

      // Pipeline complete
      meetingState.status = "active";
      meetingState.updatedAt = new Date().toISOString();
      pipeline.isProcessing = false;
      pipeline.lastAgent = "pipeline";

      this.emit("pipeline:complete", {
        meetingId,
        meetingState: this.formatMeetingState(meetingState),
      });

      logger.info(`Audio pipeline completed for meeting: ${meetingId}`);

      return {
        success: true,
        data: {
          transcription: transcriptionResult.data,
          understanding: understandingResult.data,
          insights: insightsResult.data,
        },
      };
    } catch (error) {
      pipeline.isProcessing = false;
      meetingState.status = "error";
      meetingState.error = error.message;

      this.emit("pipeline:error", { meetingId, error: error.message });

      logger.error(`Audio pipeline failed for meeting ${meetingId}:`, error);
      throw error;
    }
  }

  /**
   * Process transcript text (for pre-transcribed content or real-time)
   */
  async processTranscript(meetingId, transcriptData, options = {}) {
    const pipeline = this.getPipeline(meetingId);
    const { meetingState } = pipeline;

    logger.info(`Processing transcript for meeting: ${meetingId}`);

    try {
      pipeline.isProcessing = true;
      meetingState.status = "processing";

      // Update transcript in meeting state
      const previousTranscript = meetingState.transcript || "";
      meetingState.transcript =
        previousTranscript + " " + transcriptData.transcript;

      // Step 1: Understanding
      const understandingResult = await this.agents.understanding.process(
        {
          transcript: meetingState.transcript,
          screenAnalysis: meetingState.screenAnalysis,
          previousTopics: meetingState.topics,
        },
        { meetingState },
      );

      meetingState.understanding = understandingResult.data;
      meetingState.topics = understandingResult.data.topics;

      // Step 2: Insights
      const insightsResult = await this.agents.insights.process(
        {
          transcript: meetingState.transcript,
          previousInsights: meetingState.insights,
          topics: meetingState.topics,
        },
        { meetingState },
      );

      meetingState.insights = insightsResult.data;
      meetingState.actionItems = insightsResult.data.tasks;

      meetingState.status = "active";
      meetingState.updatedAt = new Date().toISOString();
      pipeline.isProcessing = false;

      this.emit("transcript:update", {
        meetingId,
        meetingState: this.formatMeetingState(meetingState),
      });

      return {
        success: true,
        data: {
          understanding: understandingResult.data,
          insights: insightsResult.data,
        },
      };
    } catch (error) {
      pipeline.isProcessing = false;
      meetingState.status = "error";
      logger.error(`Transcript processing failed:`, error);
      throw error;
    }
  }

  /**
   * Process screen capture through Vision Agent
   */
  async processScreen(meetingId, imageData, options = {}) {
    const pipeline = this.getPipeline(meetingId);
    const { meetingState } = pipeline;

    logger.info(`Processing screen capture for meeting: ${meetingId}`);

    try {
      const visionResult = await this.agents.vision.process(
        { imageData, ...options },
        { meetingState },
      );

      // Meeting state is updated inside the agent
      meetingState.updatedAt = new Date().toISOString();

      this.emit("screen:analyzed", {
        meetingId,
        analysis: visionResult.data,
      });

      return visionResult;
    } catch (error) {
      logger.error(`Screen processing failed:`, error);
      throw error;
    }
  }

  /**
   * Process user question through Assistant Agent
   */
  async askQuestion(meetingId, question, options = {}) {
    const pipeline = this.getPipeline(meetingId);
    const { meetingState } = pipeline;

    logger.info(`Processing question for meeting: ${meetingId}`);

    try {
      const answerResult = await this.agents.assistant.process(
        { question, ...options },
        { meetingState },
      );

      return answerResult;
    } catch (error) {
      logger.error(`Question answering failed:`, error);
      throw error;
    }
  }

  /**
   * Process chat message
   */
  async processChat(meetingId, message, options = {}) {
    const pipeline = this.getPipeline(meetingId);
    const { meetingState } = pipeline;

    logger.info(`Processing chat for meeting: ${meetingId}`);

    try {
      const chatResult = await this.agents.assistant.processChat(
        { message, ...options },
        { meetingState },
      );

      return chatResult;
    } catch (error) {
      logger.error(`Chat processing failed:`, error);
      throw error;
    }
  }

  /**
   * Generate real-time updates (for incremental processing)
   */
  async generateRealtimeUpdate(meetingId, transcriptChunk) {
    const pipeline = this.getPipeline(meetingId);
    const { meetingState } = pipeline;

    if (pipeline.isProcessing) {
      // Queue for later processing
      pipeline.processingQueue.push({ transcriptChunk });
      return { queued: true };
    }

    // Append new transcript
    meetingState.transcript += " " + transcriptChunk;

    // Generate real-time insights
    const insightsResult = await this.agents.insights.processRealtime(
      {
        transcript: meetingState.transcript,
        previousInsights: meetingState.insights,
      },
      { meetingState },
    );

    meetingState.insights = insightsResult.data;
    meetingState.updatedAt = new Date().toISOString();

    this.emit("realtime:update", {
      meetingId,
      insights: insightsResult.data,
      transcriptLength: meetingState.transcript.length,
    });

    return {
      success: true,
      data: insightsResult.data,
    };
  }

  /**
   * Complete a meeting pipeline
   */
  async completeMeeting(meetingId) {
    const pipeline = this.getPipeline(meetingId);
    const { meetingState } = pipeline;

    meetingState.status = "completed";
    meetingState.completedAt = new Date().toISOString();
    meetingState.updatedAt = new Date().toISOString();

    // Generate final summary
    const summaryResult = await this.agents.assistant.generateSummary(
      {},
      { meetingState },
    );

    meetingState.summary = summaryResult.data.summary;

    logger.info(`Meeting completed: ${meetingId}`);

    this.emit("meeting:complete", {
      meetingId,
      meetingState: this.formatMeetingState(meetingState),
    });

    return {
      success: true,
      data: this.formatMeetingState(meetingState),
    };
  }

  /**
   * Delete a pipeline
   */
  deletePipeline(meetingId) {
    if (this.activePipelines.has(meetingId)) {
      this.activePipelines.delete(meetingId);
      logger.info(`Pipeline deleted for meeting: ${meetingId}`);
      return true;
    }
    return false;
  }

  /**
   * Get all active pipelines
   */
  getActivePipelines() {
    return Array.from(this.activePipelines.keys());
  }

  /**
   * Format meeting state for frontend
   */
  formatMeetingState(meetingState) {
    return {
      id: meetingState.id,
      transcript: meetingState.transcript,
      transcription: meetingState.transcription,
      understanding: meetingState.understanding,
      insights: meetingState.insights
        ? this.agents.insights.formatForFrontend(meetingState.insights)
        : null,
      screenAnalysis: meetingState.screenAnalysis,
      summary: meetingState.summary,
      actionItems: meetingState.actionItems,
      topics: meetingState.topics,
      status: meetingState.status,
      createdAt: meetingState.createdAt,
      updatedAt: meetingState.updatedAt,
      completedAt: meetingState.completedAt,
      metadata: meetingState.metadata,
    };
  }

  /**
   * Get meeting state for frontend
   */
  getMeetingStateForFrontend(meetingId) {
    const meetingState = this.getMeetingState(meetingId);
    return this.formatMeetingState(meetingState);
  }

  /**
   * Check if pipeline is processing
   */
  isProcessing(meetingId) {
    const pipeline = this.activePipelines.get(meetingId);
    return pipeline ? pipeline.isProcessing : false;
  }
}

// Export singleton instance
module.exports = new PipelineCoordinator();
