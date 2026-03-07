const geminiService = require("../services/geminiService");
const meetingService = require("../services/meetingService");
const logger = require("../utils/logger");
const { AppError, asyncHandler } = require("../utils/errorHandler");

// @desc    Generate meeting summary
// @route   POST /api/meetings/summarize
// @access  Public
const summarizeMeeting = asyncHandler(async (req, res, next) => {
  const { text, meetingId } = req.body;

  if (!text) {
    return next(new AppError("Transcript text is required", 400));
  }

  logger.info("Generating meeting summary", {
    meetingId,
    textLength: text.length,
  });

  const summary = await geminiService.summarizeMeeting(text);

  // Update meeting if meetingId provided
  if (meetingId) {
    await meetingService.setSummary(meetingId, summary);
  }

  res.status(200).json({
    success: true,
    data: summary,
  });
});

// @desc    Generate real-time summary
// @route   POST /api/meetings/realtime-summary
// @access  Public
const generateRealtimeSummary = asyncHandler(async (req, res, next) => {
  const { transcript } = req.body;

  if (!transcript) {
    return next(new AppError("Transcript is required", 400));
  }

  logger.debug("Generating real-time summary", {
    textLength: transcript.length,
  });

  const summary = await geminiService.generateRealtimeSummary(transcript);

  res.status(200).json({
    success: true,
    data: summary,
  });
});

// @desc    Get meeting summary
// @route   GET /api/meetings/:id/summary
// @access  Public
const getMeetingSummary = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const meeting = meetingService.getMeeting(id);

  res.status(200).json({
    success: true,
    data: meeting.summary,
  });
});

module.exports = {
  summarizeMeeting,
  generateRealtimeSummary,
  getMeetingSummary,
};
