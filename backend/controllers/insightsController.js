const geminiService = require("../services/geminiService");
const meetingService = require("../services/meetingService");
const logger = require("../utils/logger");
const { AppError, asyncHandler } = require("../utils/errorHandler");

// @desc    Generate meeting insights
// @route   POST /api/ai/insights
// @access  Public
const generateInsights = asyncHandler(async (req, res, next) => {
  const { text, meetingId } = req.body;

  if (!text) {
    return next(new AppError("Transcript text is required", 400));
  }

  logger.info("Generating meeting insights", {
    meetingId,
    textLength: text.length,
  });

  const insights = await geminiService.extractInsights(text);

  if (meetingId) {
    await meetingService.setInsights(meetingId, insights);
  }

  res.status(200).json({
    success: true,
    data: insights,
  });
});

// @desc    Generate real-time insights
// @route   POST /api/ai/realtime-insights
// @access  Public
const generateRealtimeInsights = asyncHandler(async (req, res, next) => {
  const { transcript, previousInsights } = req.body;

  if (!transcript) {
    return next(new AppError("Transcript is required", 400));
  }

  logger.debug("Generating real-time insights", {
    textLength: transcript.length,
  });

  const insights = await geminiService.generateRealtimeInsights(
    transcript,
    previousInsights,
  );

  res.status(200).json({
    success: true,
    data: insights,
  });
});

// @desc    Generate suggestions
// @route   POST /api/ai/suggestions
// @access  Public
const generateSuggestions = asyncHandler(async (req, res, next) => {
  const { transcript, insights } = req.body;

  if (!transcript) {
    return next(new AppError("Transcript is required", 400));
  }

  logger.debug("Generating suggestions");

  const suggestions = await geminiService.generateSuggestions(
    transcript,
    insights,
  );

  res.status(200).json({
    success: true,
    data: suggestions,
  });
});

// @desc    Get meeting insights
// @route   GET /api/meetings/:id/insights
// @access  Public
const getMeetingInsights = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const meeting = meetingService.getMeeting(id);

  res.status(200).json({
    success: true,
    data: meeting.insights,
  });
});

module.exports = {
  generateInsights,
  generateRealtimeInsights,
  generateSuggestions,
  getMeetingInsights,
};
