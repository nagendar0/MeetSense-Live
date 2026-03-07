"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SummaryResponse, InsightsResponse } from "../services/api";

export interface MeetingRecord {
  id: string;
  date: string;
  transcript: string;
  summary: SummaryResponse | null;
  insights: InsightsResponse | null;
  duration: number;
}

interface MeetingHistoryProps {
  onLoadMeeting?: (meeting: MeetingRecord) => void;
  onChatWithMeeting?: (meeting: MeetingRecord) => void;
}

const STORAGE_KEY = "meetsense_meeting_history";

export default function MeetingHistory({
  onLoadMeeting,
  onChatWithMeeting,
}: MeetingHistoryProps) {
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setMeetings(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse meeting history:", e);
      }
    }
  }, []);

  const saveMeeting = useCallback(
    (meeting: MeetingRecord) => {
      const updatedMeetings = [meeting, ...meetings].slice(0, 20);
      setMeetings(updatedMeetings);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMeetings));
    },
    [meetings],
  );

  useEffect(() => {
    (
      window as unknown as { saveMeetingToHistory: (m: MeetingRecord) => void }
    ).saveMeetingToHistory = saveMeeting;
  }, [saveMeeting]);

  const deleteMeeting = (id: string) => {
    const updatedMeetings = meetings.filter((m) => m.id !== id);
    setMeetings(updatedMeetings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMeetings));
  };

  const clearHistory = () => {
    setMeetings([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="glass rounded-2xl p-4">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <svg
            className="w-5 h-5 text-accent-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Meeting History
          <span className="text-sm text-dark-500">({meetings.length})</span>
        </h3>
        <svg
          className={`w-5 h-5 text-dark-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {meetings.length === 0 ? (
                <p className="text-dark-500 text-sm text-center py-4">
                  No meetings recorded yet. Start a meeting to see history.
                </p>
              ) : (
                <>
                  {meetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="bg-dark-800 rounded-lg p-3 hover:bg-dark-700 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => onLoadMeeting?.(meeting)}
                        >
                          <h4 className="font-medium text-dark-200 text-sm">
                            {meeting.summary?.meeting_title ||
                              "Untitled Meeting"}
                          </h4>
                          <p className="text-xs text-dark-500 mt-1">
                            {formatDate(meeting.date)} •{" "}
                            {formatDuration(meeting.duration)}
                          </p>
                          <p className="text-xs text-dark-400 mt-2 line-clamp-2">
                            {meeting.summary?.summary || "No summary available"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {onChatWithMeeting && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onChatWithMeeting(meeting);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-dark-500 hover:text-accent-400 hover:bg-dark-600 rounded-lg transition-all"
                              title="Chat with this meeting"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                                />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMeeting(meeting.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-dark-500 hover:text-red-400 transition-all"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {meetings.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="w-full text-xs text-dark-500 hover:text-red-400 py-2 transition-colors"
                    >
                      Clear All History
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
