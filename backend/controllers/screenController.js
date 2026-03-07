const screenAnalysisService = require("../services/screenAnalysisService");
const logger = require("../utils/logger");
const { AppError, asyncHandler } = require("../utils/errorHandler");

const analyzeScreen = asyncHandler(async (req, res, next) => {
  const { image, meetingId } = req.body;

  if (!image) {
    return next(new AppError("Image data is required", 400));
  }

  logger.info("Analyzing screen", { meetingId });

  const analysis = await screenAnalysisService.analyzeScreen(image, meetingId);

  res.status(200).json({
    success: true,
    data: { analysis },
  });
});

const analyzeImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("Image file is required", 400));
  }

  logger.info("Analyzing uploaded image", { filename: req.file.originalname });

  const prompt =
    "Describe this image in detail. Explain what it shows, any text visible, diagrams, charts, or any important visual elements.";

  const explanation = await screenAnalysisService.analyzeImage(
    req.file.buffer,
    req.file.mimetype,
    prompt,
  );

  res.status(200).json({
    success: true,
    data: { explanation },
  });
});

const getScreenHistory = asyncHandler(async (req, res, next) => {
  const { meetingId } = req.params;

  const history =
    await screenAnalysisService.getScreenAnalysisHistory(meetingId);

  res.status(200).json({
    success: true,
    data: history,
  });
});

const getScreenSummary = asyncHandler(async (req, res, next) => {
  const { meetingId } = req.params;

  const summary = await screenAnalysisService.generateScreenSummary(meetingId);

  res.status(200).json({
    success: true,
    data: summary,
  });
});

const getCacheStats = asyncHandler(async (req, res, next) => {
  const stats = screenAnalysisService.getCacheStats();

  res.status(200).json({
    success: true,
    data: stats,
  });
});

const clearCache = asyncHandler(async (req, res, next) => {
  screenAnalysisService.clearCache();

  res.status(200).json({
    success: true,
    message: "Cache cleared successfully",
  });
});

module.exports = {
  analyzeScreen,
  analyzeImage,
  getScreenHistory,
  getScreenSummary,
  getCacheStats,
  clearCache,
};
