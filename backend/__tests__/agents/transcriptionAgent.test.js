/**
 * TranscriptionAgent Unit Tests
 */

jest.mock("../../services/geminiService", () => ({
  isConfigured: jest.fn().mockReturnValue(true),
  analyzeAudio: jest
    .fn()
    .mockResolvedValue("This is a transcribed text from the audio."),
}));

const transcriptionAgent = require("../../agents/transcriptionAgent");

describe("TranscriptionAgent", () => {
  describe("Initialization", () => {
    test("should have correct name", () => {
      expect(transcriptionAgent.name).toBe("Transcription");
    });

    test("should have default configuration", () => {
      expect(transcriptionAgent.minConfidence).toBe(0.7);
      expect(transcriptionAgent.processingFormat).toBe("plain");
    });
  });

  describe("initialize", () => {
    test("should initialize successfully", async () => {
      await transcriptionAgent.initialize();
      expect(transcriptionAgent.isInitialized).toBe(true);
    });
  });

  describe("process", () => {
    beforeEach(async () => {
      await transcriptionAgent.initialize();
    });

    test("should process audio and return transcript", async () => {
      const input = {
        audioData: "base64-encoded-audio",
        audioFormat: "webm",
        language: "en-US",
      };

      const result = await transcriptionAgent.process(input);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("transcript");
      expect(result.agent).toBe("Transcription");
    });

    test("should throw error for missing audioData", async () => {
      const input = {};

      await expect(transcriptionAgent.process(input)).rejects.toThrow();
    });
  });

  describe("getMimeType", () => {
    test("should return correct MIME types", () => {
      expect(transcriptionAgent.getMimeType("webm")).toBe("audio/webm");
      expect(transcriptionAgent.getMimeType("mp3")).toBe("audio/mpeg");
      expect(transcriptionAgent.getMimeType("wav")).toBe("audio/wav");
    });

    test("should return default for unknown format", () => {
      expect(transcriptionAgent.getMimeType("unknown")).toBe("audio/webm");
    });
  });

  describe("getTranscriptStats", () => {
    test("should calculate transcript statistics", () => {
      const transcript =
        "This is a test transcript. It has multiple sentences!";

      const stats = transcriptionAgent.getTranscriptStats(transcript);

      expect(stats.wordCount).toBeGreaterThan(0);
      expect(stats.sentenceCount).toBeGreaterThan(0);
      expect(stats.characterCount).toBeGreaterThan(0);
    });
  });
});
