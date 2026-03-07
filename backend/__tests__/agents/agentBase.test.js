/**
 * AgentBase Unit Tests
 */

jest.mock("../../services/geminiService", () => ({
  isConfigured: jest.fn().mockReturnValue(true),
  generateContent: jest.fn().mockResolvedValue("Mocked response"),
  generateStructuredContent: jest.fn().mockResolvedValue({ result: "test" }),
}));

jest.mock("../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock("../../utils/errorHandler", () => ({
  AppError: class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

const AgentBase = require("../../agents/agentBase");

describe("AgentBase", () => {
  describe("Constructor", () => {
    test("should set correct name", () => {
      const agent = new AgentBase("TestAgent");
      expect(agent.name).toBe("TestAgent");
    });

    test("should set default values", () => {
      const agent = new AgentBase("Test");
      expect(agent.maxRetries).toBe(3);
      expect(agent.retryDelay).toBe(1000);
      expect(agent.isInitialized).toBe(false);
    });
  });

  describe("initialize", () => {
    test("should initialize when Gemini is configured", async () => {
      const agent = new AgentBase("Test");
      await agent.initialize();
      expect(agent.isInitialized).toBe(true);
    });

    test("should initialize even without Gemini", async () => {
      const geminiService = require("../../services/geminiService");
      const originalIsConfigured = geminiService.isConfigured;
      geminiService.isConfigured = jest.fn().mockReturnValue(false);

      const agent = new AgentBase("Test");
      await agent.initialize();
      expect(agent.isInitialized).toBe(true);

      geminiService.isConfigured = originalIsConfigured;
    });
  });

  describe("isReady", () => {
    test("should return true when initialized and Gemini configured", () => {
      const agent = new AgentBase("Test");
      agent.isInitialized = true;

      expect(agent.isReady()).toBe(true);
    });

    test("should return false when not initialized", () => {
      const agent = new AgentBase("Test");
      agent.isInitialized = false;

      expect(agent.isReady()).toBe(false);
    });
  });

  describe("validateInput", () => {
    test("should validate successfully when all fields present", () => {
      const agent = new AgentBase("Test");
      const input = { field1: "value1", field2: "value2" };

      expect(agent.validateInput(input, ["field1", "field2"])).toBe(true);
    });

    test("should throw error when fields missing", () => {
      const agent = new AgentBase("Test");
      const input = { field1: "value1" };

      expect(() => {
        agent.validateInput(input, ["field1", "field2"]);
      }).toThrow();
    });
  });

  describe("updateMeetingState", () => {
    test("should update meeting state correctly", () => {
      const agent = new AgentBase("Test");
      const meetingState = {};

      const result = agent.updateMeetingState(meetingState, "key", "value");

      expect(meetingState.key).toBe("value");
      expect(meetingState.lastUpdated).toBeDefined();
    });

    test("should throw error when meetingState is missing", () => {
      const agent = new AgentBase("Test");

      expect(() => {
        agent.updateMeetingState(null, "key", "value");
      }).toThrow();
    });
  });

  describe("sleep", () => {
    test("should resolve after specified time", async () => {
      const agent = new AgentBase("Test");
      const start = Date.now();
      await agent.sleep(50);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(45);
    });
  });
});
