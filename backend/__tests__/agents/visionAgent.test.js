/**
 * VisionAgent Unit Tests
 * Tests for the Vision Agent
 */

// Mock the geminiService
jest.mock("../../services/geminiService", () => ({
  isConfigured: jest.fn().mockReturnValue(true),
  analyzeImage: jest
    .fn()
    .mockResolvedValue(
      "This image shows a presentation slide with project timeline.",
    ),
  analyzeScreen: jest
    .fn()
    .mockResolvedValue("Screen shows a code editor with React components."),
}));

const visionAgent = require("../../agents/visionAgent");

describe("VisionAgent", () => {
  describe("Initialization", () => {
    test("should have correct name", () => {
      expect(visionAgent.name).toBe("Vision");
    });
  });

  describe("initialize", () => {
    test("should initialize successfully", async () => {
      await visionAgent.initialize();
      expect(visionAgent.isInitialized).toBe(true);
    });
  });

  describe("process", () => {
    beforeEach(async () => {
      await visionAgent.initialize();
    });

    test("should process image and return analysis", async () => {
      const input = {
        imageData: "base64-encoded-image",
      };

      const result = await visionAgent.process(input);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("analysis");
      expect(result.agent).toBe("Vision");
    });

    test("should throw error for missing imageData", async () => {
      const input = {};

      await expect(visionAgent.process(input)).rejects.toThrow();
    });
  });
});
