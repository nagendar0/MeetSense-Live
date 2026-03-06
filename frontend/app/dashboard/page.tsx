"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { api, SummaryResponse, InsightsResponse } from "../../services/api";
import socketService from "../../services/socket";
import { MeetingRecord } from "../../components/MeetingHistory";

// Components
import TranscriptPanel from "../../components/TranscriptPanel";
import SummaryPanel from "../../components/SummaryPanel";
import InsightsPanel from "../../components/InsightsPanel";
import ChatAssistant from "../../components/ChatAssistant";
import ImageUpload from "../../components/ImageUpload";
import ScreenCapture from "../../components/ScreenCapture";
import MeetingHistory from "../../components/MeetingHistory";
import SideAssistant from "../../components/SideAssistant";

interface Suggestion {
  message: string;
  type: "info" | "warning" | "tip";
}

export default function Dashboard() {
  const [transcript, setTranscript] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");
  const [realtimeMode, setRealtimeMode] = useState<boolean>(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  // Setup socket listeners
  useEffect(() => {
    isMounted.current = true;

    // Connect to socket
    socketService.connect();

    // Set up listeners
    socketService.on("insights-update", (data: InsightsResponse) => {
      if (isMounted.current) {
        setInsights(data);
        setLastUpdate(new Date());
      }
    });

    socketService.on("summary-update", (data: SummaryResponse) => {
      if (isMounted.current) {
        setSummary(data);
        setLastUpdate(new Date());
      }
    });

    socketService.on("suggestions", (data: string[]) => {
      if (isMounted.current && data.length > 0) {
        const newSuggestions: Suggestion[] = data.map(
          (msg: string, idx: number) => ({
            message: msg,
            type: idx === 0 ? "tip" : "info",
          }),
        );
        setSuggestions((prev) => [...newSuggestions, ...prev].slice(0, 5));
      }
    });

    socketService.on("answer-result", (data: { answer: string }) => {
      // Handle in ChatAssistant component
    });

    socketService.on("socket-error", (data: { message: string }) => {
      console.error("Socket error:", data.message);
    });

    socketService.on("session-reset", () => {
      if (isMounted.current) {
        setTranscript("");
        setSummary(null);
        setInsights(null);
        setSuggestions([]);
      }
    });

    // Check backend connection
    const checkConnection = async () => {
      try {
        const health = await api.healthCheck();
        setConnectionStatus(
          health.geminiConfigured ? "connected" : "disconnected",
        );
      } catch {
        setConnectionStatus("disconnected");
      }
    };
    checkConnection();

    return () => {
      isMounted.current = false;
      socketService.disconnect();
    };
  }, []);

  // Send transcript to backend for real-time processing
  const processTranscriptUpdate = useCallback(
    (text: string) => {
      if (realtimeMode && socketService.isConnected() && text.length > 20) {
        // Debounce the updates
        if (transcriptTimeoutRef.current) {
          clearTimeout(transcriptTimeoutRef.current);
        }

        transcriptTimeoutRef.current = setTimeout(() => {
          socketService.sendTranscriptUpdate(text, false);
        }, 1500); // Process after 1.5 seconds of silence
      }
    },
    [realtimeMode],
  );

  const startRecording = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(
        "Speech recognition is not supported in this browser. Please use Chrome or Edge.",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsRecording(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart + " ";
        } else {
          interimTranscript += transcriptPart;
        }
      }

      if (finalTranscript) {
        const newTranscript = transcript + finalTranscript;
        setTranscript(newTranscript);

        // Send to real-time AI processing
        processTranscriptUpdate(newTranscript);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        alert(
          "Microphone access denied. Please allow microphone access to use voice transcription.",
        );
        stopRecording();
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (transcriptTimeoutRef.current) {
      clearTimeout(transcriptTimeoutRef.current);
    }
    setIsRecording(false);
  };

  // Manual summary generation (non-real-time)
  const generateSummary = async () => {
    if (!transcript.trim()) {
      alert("Please provide a transcript to summarize.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await api.summarize(transcript);
      setSummary(result);
    } catch (error) {
      console.error("Summary error:", error);
      alert(
        "Failed to generate summary. Please check if the backend is running.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Manual insights generation
  const generateInsights = async () => {
    if (!transcript.trim()) {
      alert("Please provide a transcript to analyze.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await api.getInsights(transcript);
      setInsights(result);
    } catch (error) {
      console.error("Insights error:", error);
      alert(
        "Failed to generate insights. Please check if the backend is running.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Force real-time update
  const forceRealtimeUpdate = () => {
    if (transcript.trim() && socketService.isConnected()) {
      socketService.sendTranscriptUpdate(transcript, true);
      setLastUpdate(new Date());
    }
  };

  const clearTranscript = () => {
    setTranscript("");
    setSummary(null);
    setInsights(null);
    setSuggestions([]);
    socketService.resetSession();
  };

  return (
    <main className="min-h-screen bg-dark-950 text-dark-100">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold gradient-text">
                    MeetSense Live
                  </h1>
                  <p className="text-xs text-dark-500">AI Meeting Agent</p>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              {/* Real-time Mode Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRealtimeMode(!realtimeMode)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    realtimeMode
                      ? "bg-accent-600 text-white"
                      : "bg-dark-700 text-dark-400"
                  }`}
                >
                  {realtimeMode ? "⚡ Real-time" : "📝 Manual"}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-accent-500"
                      : connectionStatus === "checking"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                />
                <span className="text-sm text-dark-400">
                  {connectionStatus === "connected"
                    ? "Ready"
                    : connectionStatus === "checking"
                      ? "Checking..."
                      : "Backend Offline"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Real-time Status Banner */}
        <AnimatePresence>
          {isRecording && realtimeMode && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 glass rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-accent-400 font-medium">
                  Live AI Processing Active
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-dark-400">
                {lastUpdate && (
                  <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
                )}
                <button
                  onClick={forceRealtimeUpdate}
                  className="px-3 py-1 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
                >
                  Refresh Now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Voice Controls */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">
                Voice Transcription
              </h2>
              <div className="flex items-center gap-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 px-6 py-3 bg-accent-600 hover:bg-accent-700 text-white rounded-xl font-medium transition-smooth hover:scale-105"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                    Start Voice
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-smooth hover:scale-105 recording-pulse"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                      />
                    </svg>
                    Stop Voice
                  </button>
                )}

                {transcript && (
                  <button
                    onClick={clearTranscript}
                    className="px-4 py-3 text-dark-400 hover:text-dark-200 hover:bg-dark-800 rounded-xl transition-smooth"
                  >
                    Clear
                  </button>
                )}
              </div>

              {isRecording && (
                <div className="mt-4 flex items-center gap-2 text-red-400">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm">Listening... Speak naturally</span>
                </div>
              )}
            </div>

            {/* Transcript Panel */}
            <TranscriptPanel transcript={transcript} />

            {/* Summary & Insights Buttons */}
            {transcript && !realtimeMode && (
              <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">AI Analysis</h2>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={generateSummary}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-5 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl font-medium transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    )}
                    Generate Summary
                  </button>
                  <button
                    onClick={generateInsights}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-5 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl font-medium transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    )}
                    Get Insights
                  </button>
                </div>
              </div>
            )}

            {/* Summary Panel - Real-time */}
            {(summary || (realtimeMode && lastUpdate)) && (
              <SummaryPanel
                summary={summary}
                isRealtime={realtimeMode}
                lastUpdate={lastUpdate}
              />
            )}

            {/* Insights Panel - Real-time */}
            {(insights || (realtimeMode && lastUpdate)) && (
              <InsightsPanel
                insights={insights}
                suggestions={suggestions}
                isRealtime={realtimeMode}
              />
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Chat Assistant */}
            <ChatAssistant transcript={transcript} />

            {/* Image Upload */}
            <ImageUpload />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-dark-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-dark-500 text-sm">
            MeetSense Live - Powered by Google Gemini AI - Real-time Mode:{" "}
            {realtimeMode ? "ON" : "OFF"}
          </p>
        </div>
      </footer>
    </main>
  );
}
