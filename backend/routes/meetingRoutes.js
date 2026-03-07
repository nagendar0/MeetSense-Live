const express = require("express");
const router = express.Router();
const meetingService = require("../services/meetingService");
const { asyncHandler } = require("../utils/errorHandler");

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const meeting = meetingService.createMeeting(req.body);
    res.status(201).json({ success: true, data: meeting });
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const meetings = meetingService.getAllMeetings();
    res.status(200).json({ success: true, data: meetings });
  }),
);

router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const stats = meetingService.getMeetingStats();
    res.status(200).json({ success: true, data: stats });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const meeting = meetingService.getMeeting(req.params.id);
    res.status(200).json({ success: true, data: meeting });
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const meeting = meetingService.updateMeeting(req.params.id, req.body);
    res.status(200).json({ success: true, data: meeting });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    meetingService.deleteMeeting(req.params.id);
    res.status(200).json({ success: true, message: "Meeting deleted" });
  }),
);

router.post(
  "/:id/complete",
  asyncHandler(async (req, res) => {
    const meeting = meetingService.completeMeeting(req.params.id);
    res.status(200).json({ success: true, data: meeting });
  }),
);

router.get(
  "/:id/export",
  asyncHandler(async (req, res) => {
    const data = meetingService.exportMeeting(req.params.id);
    res.status(200).json({ success: true, data });
  }),
);

module.exports = router;
