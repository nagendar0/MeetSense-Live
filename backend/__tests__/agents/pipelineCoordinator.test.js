/**
 * PipelineCoordinator Unit Tests
 */

// Mock all agents
jest.mock("../../services/geminiService", () => ({
  isConfigured: jest.fn().mockReturnValue(true),
  generateContent: jest.fn().mockResolvedValue("Generated content"),
  generateStructuredContent: jest.fn().mockResolvedValue({
    topics: [{ name: "Topic 1", description: "Description", confidence: 0.9 }],
    currentTopic: "Topic 1",
    context: "Meeting in progress",
    sentiment: "neutral",
  }),
}));

const pipelineCoordinator = require("../../agents/pipelineCoordinator");

describe("PipelineCoordinator", () => {
  beforeEach(() => {
    // Clear all pipelines before each test
    pipelineCoordinator.activePipelines.clear();
    pipelineCoordinator.eventCallbacks = [];
  });

  describe("Initialization", () => {
    test("should have all agents defined", () => {
      expect(pipelineCoordinator.agents).toBeDefined();
      expect(pipelineCoordinator.agents.transcription).toBeDefined();
      expect(pipelineCoordinator.agents.understanding).toBeDefined();
      expect(pipelineCoordinator.agents.insights).toBeDefined();
      expect(pipelineCoordinator.agents.vision).toBeDefined();
      expect(pipelineCoordinator.agents.assistant).toBeDefined();
    });
  });

  describe("createPipeline", () => {
    test("should create a new pipeline for a meeting", () => {
      const meetingId = "meeting-123";
      const result = pipelineCoordinator.createPipeline(meetingId);

      expect(result).toBeDefined();
      expect(result.id).toBe(meetingId);
      expect(result.status).toBe("initializing");
    });

    test("should create pipeline with metadata", () => {
      const meetingId = "meeting-456";
      const metadata = { title: "Team Standup" };
      const result = pipelineCoordinator.createPipeline(meetingId, {
        metadata,
      });

      expect(result.metadata).toEqual(metadata);
    });
  });

  describe("getPipeline", () => {
    test("should get existing pipeline", () => {
      const meetingId = "meeting-get";
      pipelineCoordinator.createPipeline(meetingId);

      const pipeline = pipelineCoordinator.getPipeline(meetingId);

      expect(pipeline).toBeDefined();
    });

    test("should throw error for non-existent pipeline", () => {
      expect(() => {
        pipelineCoordinator.getPipeline("non-existent");
      }).toThrow();
    });
  });

  describe("Event Handling", () => {
    test("should subscribe to events", () => {
      const callback = jest.fn();
      pipelineCoordinator.onEvent(callback);

      expect(pipelineCoordinator.eventCallbacks).toContain(callback);
    });

    test("should emit events to subscribers", () => {
      const callback = jest.fn();
      pipelineCoordinator.onEvent(callback);

      pipelineCoordinator.emit("test-event", { data: "test" });

      expect(callback).toHaveBeenCalledWith("test-event", { data: "test" });
    });
  });

  describe("deletePipeline", () => {
    test("should delete existing pipeline", () => {
      const meetingId = "meeting-delete";
      pipelineCoordinator.createPipeline(meetingId);

      const result = pipelineCoordinator.deletePipeline(meetingId);

      expect(result).toBe(true);
      expect(pipelineCoordinator.activePipelines.has(meetingId)).toBe(false);
    });

    test("should return false for non-existent pipeline", () => {
      const result = pipelineCoordinator.deletePipeline("non-existent");

      expect(result).toBe(false);
    });
  });

  describe("getActivePipelines", () => {
    test("should return array of active pipeline IDs", () => {
      pipelineCoordinator.createPipeline("meeting-1");
      pipelineCoordinator.createPipeline("meeting-2");

      const activePipelines = pipelineCoordinator.getActivePipelines();

      expect(activePipelines).toHaveLength(2);
    });
  });

  describe("formatMeetingState", () => {
    test("should format meeting state for frontend", () => {
      const meetingState = {
        id: "meeting-format",
        transcript: "Test transcript",
        insights: { tasks: ["Task 1"] },
        topics: ["Topic 1"],
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const formatted = pipelineCoordinator.formatMeetingState(meetingState);

      expect(formatted).toHaveProperty("id");
      expect(formatted).toHaveProperty("insights");
    });
  });

  describe("isProcessing", () => {
    test("should return true for processing pipeline", () => {
      const meetingId = "meeting-processing";
      pipelineCoordinator.createPipeline(meetingId);

      const pipeline = pipelineCoordinator.getPipeline(meetingId);
      pipeline.isProcessing = true;

      expect(pipelineCoordinator.isProcessing(meetingId)).toBe(true);
    });

    test("should return false for non-processing pipeline", () => {
      const meetingId = "meeting-not-processing";
      pipelineCoordinator.createPipeline(meetingId);

      expect(pipelineCoordinator.isProcessing(meetingId)).toBe(false);
    });
  });
});
