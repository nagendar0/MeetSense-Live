const logger = require("../utils/logger");
const { AppError } = require("../utils/errorHandler");

// In-memory storage (can be replaced with database)
const meetings = new Map();

// Meeting status enum
const MeetingStatus = {
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
};

class MeetingService {
  constructor() {
    this.meetings = meetings;
  }

  createMeeting(meetingData = {}) {
    const id = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const meeting = {
      id,
      date: new Date().toISOString(),
      status: MeetingStatus.ACTIVE,
      transcript: "",
      summary: null,
      insights: null,
      screenAnalysis: [],
      duration: 0,
      startTime: Date.now(),
      endTime: null,
      participants: [],
      metadata: {
        ...meetingData,
        createdAt: new Date().toISOString(),
      },
    };

    this.meetings.set(id, meeting);
    logger.info(`Meeting created: ${id}`);

    return meeting;
  }

  getMeeting(id) {
    const meeting = this.meetings.get(id);
    if (!meeting) {
      throw new AppError("Meeting not found", 404);
    }
    return meeting;
  }

  getAllMeetings() {
    return Array.from(this.meetings.values()).sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );
  }

  updateMeeting(id, updates) {
    const meeting = this.getMeeting(id);

    const updatedMeeting = {
      ...meeting,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.meetings.set(id, updatedMeeting);
    logger.info(`Meeting updated: ${id}`);

    return updatedMeeting;
  }

  appendTranscript(id, transcriptChunk) {
    const meeting = this.getMeeting(id);

    const updatedMeeting = {
      ...meeting,
      transcript: meeting.transcript + transcriptChunk,
      updatedAt: new Date().toISOString(),
    };

    this.meetings.set(id, updatedMeeting);
    return updatedMeeting;
  }

  setSummary(id, summary) {
    return this.updateMeeting(id, { summary });
  }

  setInsights(id, insights) {
    return this.updateMeeting(id, { insights });
  }

  addScreenAnalysis(id, analysis) {
    const meeting = this.getMeeting(id);

    const screenAnalysis = [
      ...meeting.screenAnalysis,
      {
        timestamp: new Date().toISOString(),
        analysis,
      },
    ];

    return this.updateMeeting(id, { screenAnalysis });
  }

  completeMeeting(id) {
    const meeting = this.getMeeting(id);

    const duration = meeting.startTime
      ? Math.floor((Date.now() - meeting.startTime) / 1000)
      : 0;

    const updatedMeeting = {
      ...meeting,
      status: MeetingStatus.COMPLETED,
      endTime: new Date().toISOString(),
      duration,
      completedAt: new Date().toISOString(),
    };

    this.meetings.set(id, updatedMeeting);
    logger.info(`Meeting completed: ${id}, duration: ${duration}s`);

    return updatedMeeting;
  }

  deleteMeeting(id) {
    if (!this.meetings.has(id)) {
      throw new AppError("Meeting not found", 404);
    }

    this.meetings.delete(id);
    logger.info(`Meeting deleted: ${id}`);
  }

  getMeetingStats() {
    const allMeetings = this.getAllMeetings();
    const completedMeetings = allMeetings.filter(
      (m) => m.status === MeetingStatus.COMPLETED,
    );

    const totalDuration = completedMeetings.reduce(
      (sum, m) => sum + (m.duration || 0),
      0,
    );
    const avgDuration =
      completedMeetings.length > 0
        ? Math.floor(totalDuration / completedMeetings.length)
        : 0;

    return {
      total: allMeetings.length,
      active: allMeetings.filter((m) => m.status === MeetingStatus.ACTIVE)
        .length,
      completed: completedMeetings.length,
      totalDuration,
      avgDuration,
    };
  }

  // Export meeting data for storage
  exportMeeting(id) {
    const meeting = this.getMeeting(id);
    return {
      id: meeting.id,
      date: meeting.date,
      transcript: meeting.transcript,
      summary: meeting.summary,
      insights: meeting.insights,
      screenAnalysis: meeting.screenAnalysis,
      duration: meeting.duration,
      metadata: meeting.metadata,
    };
  }

  // Import meeting data from storage
  importMeeting(meetingData) {
    const { id, ...data } = meetingData;
    const meeting = {
      ...data,
      id:
        id ||
        `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: MeetingStatus.COMPLETED,
    };

    this.meetings.set(meeting.id, meeting);
    logger.info(`Meeting imported: ${meeting.id}`);

    return meeting;
  }
}

module.exports = new MeetingService();
