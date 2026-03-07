const AgentBase = require("./agentBase");
const logger = require("../utils/logger");
const { AppError } = require("../utils/errorHandler");

/**
 * Vision Agent
 * Analyzes screenshots from screen sharing and explains slides,
 * diagrams, charts, code, and other visual content
 */
class VisionAgent extends AgentBase {
  constructor() {
    super("Vision");
    this.analysisCache = new Map();
    this.maxCacheSize = 50;
  }

  /**
   * Initialize the vision agent
   */
  async initialize() {
    await super.initialize();
    this.log("info", "Vision Agent ready");
  }

  /**
   * Process screen capture(s) to analyze visual content
   * @param {Object} input - { imageData, imageType, previousAnalyses }
   * @param {Object} context - meeting state object
   * @returns {Object} - { analysis, content, slides, diagrams, text }
   */
  async process(input, context = {}) {
    const { imageData, imageType = "png", previousAnalyses = [] } = input;
    const meetingState = context.meetingState;

    if (!imageData) {
      throw new AppError("Image data is required", 400);
    }

    this.log("info", "Analyzing screen capture", {
      imageType,
      hasMeetingState: !!meetingState,
      previousAnalysesCount: previousAnalyses.length,
    });

    try {
      // Remove data URL prefix if present
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");

      // Check cache to avoid duplicate analysis
      const cacheKey = this.generateCacheKey(base64Data);
      let analysis;

      if (this.analysisCache.has(cacheKey)) {
        this.log("debug", "Using cached vision analysis");
        analysis = this.analysisCache.get(cacheKey);
      } else {
        // Perform fresh analysis
        analysis = await this.retryWithBackoff(async () => {
          return await this.analyzeScreenCapture(base64Data, imageType);
        });

        // Cache the result
        this.addToCache(cacheKey, analysis);
      }

      const visionData = {
        analysis: analysis.description,
        content: analysis.content,
        slides: analysis.slides,
        diagrams: analysis.diagrams,
        charts: analysis.charts,
        code: analysis.code,
        text: analysis.extractedText,
        timestamp: new Date().toISOString(),
        cacheKey: cacheKey,
      };

      // Update meeting state if provided
      if (meetingState) {
        const screenAnalysis = meetingState.screenAnalysis || [];
        screenAnalysis.push(visionData);
        this.updateMeetingState(meetingState, "screenAnalysis", screenAnalysis);
        this.updateMeetingState(
          meetingState,
          "latestScreenAnalysis",
          visionData,
        );
        this.log("info", "Updated meeting state with screen analysis", {
          screenCount: screenAnalysis.length,
        });
      }

      this.log("info", "Vision analysis completed", {
        hasSlides: analysis.slides?.length > 0,
        hasCode: !!analysis.code,
        hasText: !!analysis.extractedText,
      });

      return {
        success: true,
        data: visionData,
        agent: this.name,
      };
    } catch (error) {
      this.log("error", "Vision analysis failed", { error: error.message });
      throw new AppError(`Vision analysis failed: ${error.message}`, 500);
    }
  }

  /**
   * Analyze a single screen capture
   */
  async analyzeScreenCapture(base64Data, imageType) {
    const mimeType = `image/${imageType}`;

    const prompt = `Analyze this screen capture from a meeting in detail. Provide a comprehensive JSON response:

{
  "description": "Overall description of what's shown",
  "content": {
    "type": "What type of content: presentation, code, document, spreadsheet, diagram, website, etc.",
    "mainElements": ["List of main visual elements"],
    "layout": "How the content is arranged"
  },
  "slides": ["If presentation, describe each slide's content"],
  "diagrams": ["Describe any diagrams or flowcharts"],
  "charts": ["Describe any charts or graphs with data insights"],
  "code": "If code is shown, describe the programming language and what the code does",
  "extractedText": "All readable text from the screen",
  "keyPoints": ["Most important points visible on this screen"],
  "context": "How this screen relates to a meeting context"
}

Respond ONLY with valid JSON.`;

    const result = await this.geminiService.analyzeImage(
      Buffer.from(base64Data, "base64"),
      mimeType,
      prompt,
    );

    try {
      return JSON.parse(result);
    } catch {
      // Return basic analysis if JSON parsing fails
      return {
        description: result,
        content: { type: "unknown", mainElements: [], layout: "" },
        slides: [],
        diagrams: [],
        charts: [],
        code: null,
        extractedText: "",
        keyPoints: [],
        context: "",
      };
    }
  }

  /**
   * Analyze multiple screenshots in batch
   */
  async processBatch(input, context = {}) {
    const { screenshots } = input;
    const meetingState = context.meetingState;

    if (!screenshots || screenshots.length === 0) {
      throw new AppError("Screenshots array is required", 400);
    }

    this.log("info", "Batch processing screenshots", {
      count: screenshots.length,
    });

    const results = [];

    for (const screenshot of screenshots) {
      try {
        const result = await this.process(
          { imageData: screenshot.imageData, imageType: screenshot.imageType },
          { meetingState },
        );
        results.push({
          timestamp: screenshot.timestamp,
          ...result.data,
        });
      } catch (error) {
        this.log("error", `Failed to analyze screenshot: ${error.message}`);
        results.push({
          timestamp: screenshot.timestamp,
          error: error.message,
        });
      }
    }

    // Generate summary of all screenshots
    const summary = await this.generateBatchSummary(results);

    return {
      success: true,
      data: {
        analyses: results,
        summary,
        totalScreens: screenshots.length,
      },
      agent: this.name,
    };
  }

  /**
   * Generate summary of multiple screen analyses
   */
  async generateBatchSummary(analyses) {
    const validAnalyses = analyses.filter((a) => a.analysis && !a.error);

    if (validAnalyses.length === 0) {
      return {
        total: analyses.length,
        successful: 0,
        summary: "No successful analyses",
      };
    }

    const prompt = `Summarize these ${validAnalyses.length} screen analyses from a meeting:

${validAnalyses.map((a, i) => `Screen ${i + 1}: ${a.analysis}`).join("\n\n")}

Provide a JSON summary with:
- overview: Brief summary of what was shown across all screens
- progression: How the content evolved across screens
- keyMoments: Most important screens/screenshots
- technicalContent: Any code, technical diagrams, or data shown

Respond ONLY with valid JSON.`;

    const result = await this.geminiService.generateContent(prompt);

    try {
      return {
        ...JSON.parse(result),
        total: analyses.length,
        successful: validAnalyses.length,
      };
    } catch {
      return {
        overview: `Analyzed ${validAnalyses.length} screens`,
        progression: [],
        keyMoments: [],
        technicalContent: [],
        total: analyses.length,
        successful: validAnalyses.length,
      };
    }
  }

  /**
   * Explain a specific screen in detail
   */
  async explainScreen(input, context = {}) {
    const { imageData, question } = input;

    if (!imageData) {
      throw new AppError("Image data is required", 400);
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");

    const prompt = question
      ? `Look at this screen from a meeting and answer this question: ${question}`
      : `Explain this screen in detail as if presenting it to someone who cannot see it. Cover:
- What is shown
- Key information
- How it would appear in a meeting context
- Any text or data that is visible`;

    const result = await this.geminiService.analyzeImage(
      Buffer.from(base64Data, "base64"),
      "image/png",
      prompt,
    );

    return {
      success: true,
      data: {
        explanation: result,
        question: question || null,
      },
      agent: this.name,
    };
  }

  /**
   * Generate cache key
   */
  generateCacheKey(base64Data) {
    return base64Data.substring(0, 100);
  }

  /**
   * Add result to cache
   */
  addToCache(key, value) {
    if (this.analysisCache.size >= this.maxCacheSize) {
      const firstKey = this.analysisCache.keys().next().value;
      this.analysisCache.delete(firstKey);
    }
    this.analysisCache.set(key, value);
  }

  /**
   * Clear analysis cache
   */
  clearCache() {
    this.analysisCache.clear();
    this.log("info", "Vision analysis cache cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.analysisCache.size,
      maxSize: this.maxCacheSize,
    };
  }
}

module.exports = new VisionAgent();
