/**
 * AI Agents Index
 * Exports all AI agents and the pipeline coordinator
 */

const agentBase = require("./agentBase");
const transcriptionAgent = require("./transcriptionAgent");
const understandingAgent = require("./understandingAgent");
const insightsAgent = require("./insightsAgent");
const visionAgent = require("./visionAgent");
const assistantAgent = require("./assistantAgent");
const pipelineCoordinator = require("./pipelineCoordinator");

module.exports = {
  // Base class
  AgentBase: agentBase,

  // Individual agents
  transcriptionAgent,
  understandingAgent,
  insightsAgent,
  visionAgent,
  assistantAgent,

  // Pipeline coordinator
  pipelineCoordinator,

  /**
   * Initialize all agents and pipeline
   */
  async initialize() {
    await pipelineCoordinator.initialize();
    return this;
  },

  /**
   * Get all agent names
   */
  getAgentNames() {
    return [
      "transcription",
      "understanding",
      "insights",
      "vision",
      "assistant",
    ];
  },

  /**
   * Get agent by name
   */
  getAgent(name) {
    const agents = {
      transcription: transcriptionAgent,
      understanding: understandingAgent,
      insights: insightsAgent,
      vision: visionAgent,
      assistant: assistantAgent,
    };

    return agents[name] || null;
  },
};
