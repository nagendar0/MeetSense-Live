/**
 * InsightsAgent Unit Tests
 */

jest.mock("../../services/geminiService", () => ({
  isConfigured: jest.fn().mockReturnValue(true),
  generateContent: jest.fn().mockImplementation((prompt) => {
    if (prompt.includes("helpful suggestions")) {
      return Promise.resolve("[]");
    }
    if (prompt.includes("key highlights")) {
      return Promise.resolve("[]");
    }
    return Promise.resolve("Extracted insights");
  }),
  generateStructuredContent: jest.fn().mockResolvedValue({
    tasks: [{ description: "Task 1", assignee: "John" }],
    decisions: [{ description: "Decision 1" }],
    deadlines: [{ description: "Deadline 1", date: "2024-12-31" }],
    topics: ["Topic 1"],
    keyInsights: ["Insight 1"],
  }),
}));

const insightsAgent = require("../../agents/insightsAgent");

describe("InsightsAgent", () => {
  describe("Initialization", () => {
    test("should have correct name", () => {
      expect(insightsAgent.name).toBe("Insights");
    });
  });

  describe("initialize", () => {
    test("should initialize successfully", async () => {
      await insightsAgent.initialize();
      expect(insightsAgent.isInitialized).toBe(true);
    });
  });

  describe("process", () => {
    beforeEach(async () => {
      await insightsAgent.initialize();
    });

    test("should extract insights from transcript", async () => {
      const input = {
        transcript:
          "This is a test meeting. We need to finish the project by Friday.",
      };

      const result = await insightsAgent.process(input);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("tasks");
      expect(result.agent).toBe("Insights");
    });

    test("should throw error for missing transcript", async () => {
      const input = {};

      await expect(insightsAgent.process(input)).rejects.toThrow();
    });
  });

  describe("getTaskSummary", () => {
    test("should calculate task summary", () => {
      const insights = {
        tasks: [
          { priority: "high" },
          { priority: "high" },
          { priority: "medium" },
          { status: "pending" },
          { status: "completed" },
        ],
      };

      const summary = insightsAgent.getTaskSummary(insights);

      expect(summary.total).toBe(5);
      expect(summary.byPriority.high).toBe(2);
      expect(summary.byPriority.medium).toBe(1);
    });

    test("should handle empty tasks", () => {
      const insights = {};

      const summary = insightsAgent.getTaskSummary(insights);

      expect(summary.total).toBe(0);
    });
  });

  describe("formatForFrontend", () => {
    test("should format insights for frontend", () => {
      const insights = {
        tasks: ["Task 1"],
        decisions: ["Decision 1"],
        deadlines: ["Deadline 1"],
        topics: ["Topic 1"],
        suggestions: ["Suggestion 1"],
        highlights: ["Highlight 1"],
      };

      const formatted = insightsAgent.formatForFrontend(insights);

      expect(formatted).toHaveProperty("taskSummary");
    });
  });
});
