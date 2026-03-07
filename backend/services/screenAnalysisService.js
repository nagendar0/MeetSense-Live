const geminiService = require("./geminiService");
const meetingService = require("./meetingService");
const logger = require("../utils/logger");
const { AppError } = require("../utils/errorHandler");

class ScreenAnalysisService {
  constructor() {
    this.captureInterval = 10000; // 10 seconds
    this.analysisCache = new Map();
    this.maxCacheSize = 100;
  }

  async analyzeScreen(imageData, meetingId = null) {
    try {
      // Remove data URL prefix if present
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");

      // Check cache to avoid duplicate analysis
      const cacheKey = this.generateCacheKey(base64Data);
      if (this.analysisCache.has(cacheKey)) {
        logger.debug("Using cached screen analysis");
        const cached = this.analysisCache.get(cacheKey);

        if (meetingId) {
          await meetingService.addScreenAnalysis(meetingId, cached);
        }

        return cached;
      }

      // Perform analysis using Gemini
      const analysis = await geminiService.analyzeScreen(base64Data);

      // Cache the result
      this.addToCache(cacheKey, analysis);

      // Store in meeting if meetingId provided
      if (meetingId) {
        await meetingService.addScreenAnalysis(meetingId, analysis);
      }

      logger.info("Screen analysis completed successfully");
      return analysis;
    } catch (error) {
      logger.error("Screen analysis error:", error);
      throw new AppError(`Failed to analyze screen: ${error.message}`, 500);
    }
  }

  async analyzeImage(imageBuffer, mimeType, prompt) {
    try {
      const explanation = await geminiService.analyzeImage(
        imageBuffer,
        mimeType,
        prompt,
      );
      return { explanation };
    } catch (error) {
      logger.error("Image analysis error:", error);
      throw new AppError(`Failed to analyze image: ${error.message}`, 500);
    }
  }

  generateCacheKey(base64Data) {
    // Use first 100 chars as a simple hash for caching
    return base64Data.substring(0, 100);
  }

  addToCache(key, value) {
    // Implement LRU cache
    if (this.analysisCache.size >= this.maxCacheSize) {
      const firstKey = this.analysisCache.keys().next().value;
      this.analysisCache.delete(firstKey);
    }
    this.analysisCache.set(key, value);
  }

  clearCache() {
    this.analysisCache.clear();
    logger.info("Screen analysis cache cleared");
  }

  getCacheStats() {
    return {
      size: this.analysisCache.size,
      maxSize: this.maxCacheSize,
    };
  }

  // Batch analysis for multiple screenshots
  async analyzeScreensBatch(screenshots, meetingId = null) {
    const results = [];

    for (const screenshot of screenshots) {
      try {
        const analysis = await this.analyzeScreen(
          screenshot.imageData,
          meetingId,
        );
        results.push({
          timestamp: screenshot.timestamp,
          analysis,
        });
      } catch (error) {
        logger.error(`Failed to analyze screenshot: ${error.message}`);
        results.push({
          timestamp: screenshot.timestamp,
          error: error.message,
        });
      }
    }

    return results;
  }

  // Get screen analysis history for a meeting
  async getScreenAnalysisHistory(meetingId) {
    try {
      const meeting = meetingService.getMeeting(meetingId);
      return meeting.screenAnalysis || [];
    } catch (error) {
      logger.error("Failed to get screen analysis history:", error);
      return [];
    }
  }

  // Generate summary of all screen analyses
  async generateScreenSummary(meetingId) {
    try {
      const history = await this.getScreenAnalysisHistory(meetingId);

      if (history.length === 0) {
        return {
          totalScreens: 0,
          summary: "No screen analysis available",
        };
      }

      // Extract key themes from all analyses
      const allAnalyses = history.map((h) => h.analysis).join("\n");

      const summary = {
        totalScreens: history.length,
        firstAnalysis: history[0]?.timestamp,
        lastAnalysis: history[history.length - 1]?.timestamp,
        // Could use Gemini to summarize all analyses here
        summary: `Analyzed ${history.length} screens during the meeting`,
      };

      return summary;
    } catch (error) {
      logger.error("Failed to generate screen summary:", error);
      throw new AppError(
        `Failed to generate screen summary: ${error.message}`,
        500,
      );
    }
  }
}

module.exports = new ScreenAnalysisService();
