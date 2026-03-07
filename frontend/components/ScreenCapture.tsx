"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../services/api";

interface ScreenCaptureProps {
  isActive: boolean;
  onAnalysisComplete?: (analysis: string) => void;
}

export default function ScreenCapture({
  isActive,
  onAnalysisComplete,
}: ScreenCaptureProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [screenAnalysis, setScreenAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const lastAnalysisRef = useRef<string>("");

  const startScreenShare = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 5 },
        },
        audio: false,
      });

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      setScreenStream(stream);
      setIsSharing(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      startPeriodicCapture();
    } catch (err) {
      console.error("Screen share error:", err);
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Screen sharing was cancelled");
      } else {
        setError("Failed to start screen sharing");
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    setIsSharing(false);
    setScreenAnalysis(null);
  };

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx || video.readyState !== 4) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/png", 0.5);

    if (imageData === lastAnalysisRef.current) return;
    lastAnalysisRef.current = imageData;

    setIsAnalyzing(true);
    try {
      const result = await api.analyzeScreen(imageData);
      setScreenAnalysis(result.analysis);
      onAnalysisComplete?.(result.analysis);
    } catch (err) {
      console.error("Screen analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isActive, onAnalysisComplete]);

  const startPeriodicCapture = useCallback(() => {
    captureIntervalRef.current = setInterval(captureAndAnalyze, 10000);
    setTimeout(captureAndAnalyze, 2000);
  }, [captureAndAnalyze]);

  useEffect(() => {
    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [screenStream]);

  useEffect(() => {
    if (isSharing && isActive) {
      if (!captureIntervalRef.current) {
        startPeriodicCapture();
      }
    }
  }, [isActive, isSharing, startPeriodicCapture]);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
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
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          Screen Capture
        </h3>
        <div className="flex items-center gap-2">
          {!isSharing ? (
            <button
              onClick={startScreenShare}
              disabled={!isActive}
              className="px-3 py-1.5 bg-accent-600 hover:bg-accent-700 disabled:bg-dark-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-smooth"
            >
              Share Screen
            </button>
          ) : (
            <button
              onClick={stopScreenShare}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-smooth"
            >
              Stop Sharing
            </button>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <AnimatePresence>
        {isSharing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="relative bg-dark-900 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-48 object-contain"
              />
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-white">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing screen...</span>
                  </div>
                </div>
              )}
              <div className="absolute top-2 left-2 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
                  Live
                </span>
              </div>
            </div>

            {screenAnalysis && (
              <div className="bg-dark-800 rounded-lg p-3">
                <h4 className="text-sm font-medium text-accent-400 mb-2 flex items-center gap-2">
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
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Screen Analysis
                </h4>
                <p className="text-sm text-dark-300">{screenAnalysis}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!isSharing && isActive && (
        <p className="text-sm text-dark-500 text-center py-4">
          Click "Share Screen" to capture and analyze your screen during
          meetings
        </p>
      )}
    </div>
  );
}
