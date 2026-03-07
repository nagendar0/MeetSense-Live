const AgentBase = require("./agentBase");
const logger = require("../utils/logger");
const { AppError } = require("../utils/errorHandler");

/**
 * Transcription Agent
 * Converts meeting audio into text using Gemini's native audio processing
 * or handles transcript input from speech-to-text services
 */
class TranscriptionAgent extends AgentBase {
  constructor() {
    super("Transcription");
    this.minConfidence = 0.7;
    this.processingFormat = "plain"; // plain, segments, timestamps
  }

  /**
   * Initialize the transcription agent
   */
  async initialize() {
    await super.initialize();
    this.log("info", "Transcription Agent ready");
  }

  /**
   * Process audio and convert to transcript
   * @param {Object} input - { audioData, audioFormat, language }
   * @param {Object} context - meeting state object
   * @returns {Object} - { transcript, segments, language, duration }
   */
  async process(input, context = {}) {
    this.validateInput(input, ["audioData"]);

    const { audioData, audioFormat = "webm", language = "en-US" } = input;
    const meetingState = context.meetingState;

    this.log("info", "Processing audio transcription", {
      audioFormat,
      language,
      hasMeetingState: !!meetingState,
    });

    try {
      // Convert base64 audio to buffer if needed
      const audioBuffer = Buffer.isBuffer(audioData)
        ? audioData
        : Buffer.from(audioData, "base64");

      // Use Gemini to transcribe audio
      const result = await this.retryWithBackoff(async () => {
        return await this.transcribeWithGemini(
          audioBuffer,
          audioFormat,
          language,
        );
      });

      const transcriptData = {
        transcript: result.text,
        segments: result.segments || [],
        language: language,
        confidence: result.confidence || 0.9,
        duration: result.duration || 0,
        timestamp: new Date().toISOString(),
      };

      // Update meeting state if provided
      if (meetingState) {
        this.updateMeetingState(
          meetingState,
          "transcript",
          (meetingState.transcript || "") + " " + transcriptData.transcript,
        );
        this.updateMeetingState(meetingState, "transcription", transcriptData);
        this.log("info", "Updated meeting state with transcript", {
          transcriptLength: transcriptData.transcript.length,
        });
      }

      this.log("info", "Transcription completed", {
        transcriptLength: transcriptData.transcript.length,
      });

      return {
        success: true,
        data: transcriptData,
        agent: this.name,
      };
    } catch (error) {
      this.log("error", "Transcription failed", { error: error.message });
      throw new AppError(`Transcription failed: ${error.message}`, 500);
    }
  }

  /**
   * Transcribe audio using Gemini
   * Note: Gemini 2.0 Flash has native audio support
   */
  async transcribeWithGemini(audioBuffer, format, language) {
    const mimeType = this.getMimeType(format);
    const audioBase64 = audioBuffer.toString("base64");

    const prompt = `You are a transcription service. Convert this meeting audio to text accurately. 
    - Include speaker identification if possible
    - Preserve important technical terms and names
    - Mark unclear segments with [unclear]
    - Return the complete transcript`;

    const result = await this.geminiService.analyzeAudio(
      audioBase64,
      mimeType,
      prompt,
    );

    return {
      text: result,
      confidence: 0.9,
      segments: [],
    };
  }

  /**
   * Process text transcript (for pre-transcribed content or real-time)
   */
  async processTranscript(input, context = {}) {
    const { transcript, addTimestamps = false } = input;
    const meetingState = context.meetingState;

    if (!transcript) {
      throw new AppError("Transcript text is required", 400);
    }

    this.log("info", "Processing transcript text", {
      transcriptLength: transcript.length,
    });

    // Enhance transcript with timestamps if needed
    let processedTranscript = transcript;

    if (addTimestamps && !meetingState?.transcript) {
      // Add segment markers for new content
      const timestamp = new Date().toISOString();
      processedTranscript = `[${timestamp}] ${transcript}`;
    }

    // Update meeting state
    if (meetingState) {
      const previousTranscript = meetingState.transcript || "";
      this.updateMeetingState(
        meetingState,
        "transcript",
        previousTranscript + " " + processedTranscript,
      );
    }

    return {
      success: true,
      data: {
        transcript: processedTranscript,
        originalLength: transcript.length,
        timestamp: new Date().toISOString(),
      },
      agent: this.name,
    };
  }

  /**
   * Get MIME type from audio format
   */
  getMimeType(format) {
    const mimeTypes = {
      webm: "audio/webm",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      mp4: "audio/mp4",
      ogg: "audio/ogg",
    };
    return mimeTypes[format] || "audio/webm";
  }

  /**
   * Merge multiple transcript segments
   */
  mergeTranscripts(transcripts) {
    return transcripts.map((t) => t.transcript).join(" ");
  }

  /**
   * Get transcript statistics
   */
  getTranscriptStats(transcript) {
    const words = transcript.split(/\s+/).filter((w) => w.length > 0);
    const sentences = transcript
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      characterCount: transcript.length,
      estimatedDuration: Math.ceil(words.length / 150) * 60, // ~150 words per minute
    };
  }
}

module.exports = new TranscriptionAgent();
