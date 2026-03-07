"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../services/api";

interface ImageUploadProps {}

export default function ImageUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ripple effect state
  const [ripples, setRipples] = useState<
    { id: number; x: number; y: number }[]
  >([]);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setExplanation("");
    } else {
      alert("Please select a valid image file.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Add ripple effect
  const addRipple = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newRipple = { id: Date.now(), x, y };
    setRipples((prev) => [...prev, newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  }, []);

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      const response = await api.analyzeImage(selectedFile);
      setExplanation(response.explanation);
    } catch (error) {
      console.error("Analyze error:", error);
      setExplanation("Failed to analyze image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setExplanation("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6"
    >
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
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
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        Slide / Image Analysis
      </h2>

      {/* Drop Zone with Distortion Effects */}
      <motion.div
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={addRipple}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-smooth overflow-hidden ${
          dragActive
            ? "border-accent-500 bg-accent-500/10"
            : "border-dark-600 hover:border-dark-500"
        } ${isHovering ? "image-distort-container" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {/* Ripple effects */}
        <AnimatePresence>
          {ripples.map((ripple) => (
            <motion.span
              key={ripple.id}
              className="ripple"
              style={{ left: ripple.x, top: ripple.y }}
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          ))}
        </AnimatePresence>

        {/* Shine effect on hover */}
        <motion.div
          className="absolute inset-0 pointer-events-none z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovering ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background:
              "linear-gradient(45deg, transparent 40%, rgba(76, 175, 80, 0.2) 50%, transparent 60%)",
            transform: isHovering ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.6s ease",
          }}
        />

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
          id="image-upload"
        />

        {!previewUrl ? (
          <label
            htmlFor="image-upload"
            className="cursor-pointer relative z-20"
          >
            <div className="flex flex-col items-center">
              <motion.div
                animate={{
                  scale: isHovering ? 1.1 : 1,
                  rotate: isHovering ? 5 : 0,
                }}
                transition={{ duration: 0.3 }}
              >
                <svg
                  className="w-12 h-12 text-dark-500 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </motion.div>
              <p className="text-dark-300 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-dark-500">PNG, JPG, GIF up to 10MB</p>
            </div>
          </label>
        ) : (
          <div className="relative z-20">
            {/* Image with distortion on hover */}
            <motion.div
              className="relative overflow-hidden rounded-lg"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <motion.img
                src={previewUrl}
                alt="Preview"
                className="max-h-48 mx-auto"
                animate={
                  isHovering
                    ? {
                        scale: 1.1,
                        filter: "contrast(1.1) saturate(1.2)",
                      }
                    : {
                        scale: 1,
                        filter: "contrast(1) saturate(1)",
                      }
                }
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              />
              {/* Overlay shine effect */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ x: "-100%" }}
                animate={isHovering ? { x: "100%" } : { x: "-100%" }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                }}
              />
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClear}
              className="absolute top-2 right-2 p-1 bg-dark-900/80 rounded-full hover:bg-dark-700 transition-smooth z-30"
            >
              <svg
                className="w-5 h-5 text-dark-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Analyze Button with morph effect */}
      {selectedFile && !explanation && (
        <motion.button
          whileHover={{
            scale: 1.02,
            boxShadow: "0 10px 40px rgba(76, 175, 80, 0.3)",
          }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAnalyze}
          disabled={isLoading}
          className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-accent-600 hover:bg-accent-700 text-white rounded-xl font-medium transition-smooth disabled:opacity-50 disabled:cursor-not-allowed morph-button"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
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
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              Analyze Image
            </>
          )}
        </motion.button>
      )}

      {/* Explanation with animation */}
      <AnimatePresence>
        {explanation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-dark-400">Explanation</h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClear}
                className="text-xs text-dark-500 hover:text-dark-300 transition-smooth"
              >
                Analyze another
              </motion.button>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-dark-900 rounded-xl p-4"
            >
              <p className="text-dark-200 leading-relaxed">{explanation}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
