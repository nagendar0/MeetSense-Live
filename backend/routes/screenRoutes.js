const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const {
  analyzeScreen,
  analyzeImage,
  getScreenHistory,
  getScreenSummary,
  getCacheStats,
  clearCache,
} = require("../controllers/screenController");

router.post("/analyze", analyzeScreen);
router.post("/analyze-image", upload.single("image"), analyzeImage);
router.get("/history/:meetingId", getScreenHistory);
router.get("/summary/:meetingId", getScreenSummary);
router.get("/cache-stats", getCacheStats);
router.delete("/cache", clearCache);

module.exports = router;
