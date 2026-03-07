const geminiService = require("../services/geminiService");
const logger = require("../utils/logger");
const { AppError } = require("../utils/errorHandler");

/**
 * Base class for all AI agents
 * Provides common functionality for Gemini integration, logging, and error handling
 */
class AgentBase {
  constructor(name) {
    this.name = name;
    this.geminiService = geminiService;
    this.isInitialized = false;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    if (this.geminiService.isConfigured()) {
      this.isInitialized = true;
      logger.info(`${this.name} agent initialized successfully`);
    } else {
      logger.warn(
        `${this.name} agent initialized without Gemini configuration`,
      );
      this.isInitialized = true; // Still initialize, but AI features will be limited
    }
  }

  /**
   * Check if agent is ready
   */
  isReady() {
    return this.isInitialized && this.geminiService.isConfigured();
  }

  /**
   * Sleep utility for retry logic
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff(fn, retries = this.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        const delay = this.retryDelay * Math.pow(2, i);
        logger.warn(
          `${this.name} retry ${i + 1}/${retries} after ${delay}ms: ${error.message}`,
        );
        await this.sleep(delay);
      }
    }
  }

  /**
   * Log agent activity
   */
  log(level, message, meta = {}) {
    logger[level](`[${this.name}] ${message}`, {
      agent: this.name,
      ...meta,
    });
  }

  /**
   * Process input and generate output - to be overridden by subclasses
   */
  async process(input, context) {
    throw new Error(`process() must be implemented by ${this.name}`);
  }

  /**
   * Validate input before processing
   */
  validateInput(input, requiredFields) {
    const missing = requiredFields.filter((field) => !input[field]);
    if (missing.length > 0) {
      throw new AppError(`Missing required fields: ${missing.join(", ")}`, 400);
    }
    return true;
  }

  /**
   * Update meeting state with new data
   */
  updateMeetingState(meetingState, key, value) {
    if (!meetingState) {
      throw new AppError("Meeting state is required", 400);
    }

    meetingState[key] = value;
    meetingState.lastUpdated = {
      agent: this.name,
      timestamp: new Date().toISOString(),
    };

    return meetingState;
  }
}

module.exports = AgentBase;
