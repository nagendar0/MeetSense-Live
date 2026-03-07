"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import dynamic from "next/dynamic";

// Dynamic import for 3D component (client-side only)
const LandingHero = dynamic(() => import("../components/LandingHero"), {
  ssr: false,
  loading: () => <div className="h-[600px] bg-dark-900 animate-pulse" />,
});

const features = [
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
      </svg>
    ),
    title: "Live Voice Transcription",
    description:
      "Real-time speech-to-text conversion with Web Speech API. Capture every word instantly.",
  },
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    title: "AI Meeting Summaries",
    description:
      "Get structured summaries with key points, action items, and deadlines automatically.",
  },
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
    title: "Task & Deadline Detection",
    description:
      "Automatically identify tasks, deadlines, and assignments from your meeting conversations.",
  },
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
    ),
    title: "AI Meeting Chat Assistant",
    description:
      "Ask questions about your meeting and get instant answers about discussed topics.",
  },
  {
    icon: (
      <svg
        className="w-8 h-8"
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
    ),
    title: "Slide & Image Understanding",
    description:
      "Upload meeting slides and get AI-powered explanations using Gemini multimodal AI.",
  },
];

const steps = [
  {
    icon: "🎤",
    title: "Voice Input",
    description: "Start recording your meeting",
  },
  {
    icon: "📝",
    title: "Transcript",
    description: "AI converts speech to text",
  },
  {
    icon: "⚡",
    title: "AI Processing",
    description: "Gemini analyzes the content",
  },
  {
    icon: "💡",
    title: "Insights",
    description: "Get actionable insights instantly",
  },
];

const techStack = [
  { name: "Next.js", icon: "🔵" },
  { name: "Node.js", icon: "🟢" },
  { name: "Express", icon: "⚡" },
  { name: "Google Gemini", icon: "✨" },
  { name: "Tailwind CSS", icon: "💨" },
  { name: "Web Speech API", icon: "🎙️" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// ============================================
// SCROLL PROGRESS COMPONENT
// ============================================
function ScrollProgress() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      className="fixed top-0 left-0 h-1 bg-gradient-to-r from-accent-500 via-accent-400 to-accent-500 z-50"
      style={{
        scaleX: scrollYProgress,
        transformOrigin: "0%",
      }}
    />
  );
}

// ============================================
// FEATURE CARD WITH MORPH ANIMATION
// ============================================
function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1.05, 0.9]);
  const rotate = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 0]);
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [0.5, 1, 1, 0.5],
  );

  return (
    <motion.div
      ref={ref}
      style={{ scale, rotate, opacity }}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ scale: 1.05, y: -10 }}
      className="glass rounded-2xl p-6 cursor-pointer group morph-card"
    >
      <motion.div
        className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-700/20 flex items-center justify-center text-accent-400 mb-4"
        whileHover={{ scale: 1.2, rotate: 5 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {feature.icon}
      </motion.div>
      <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
      <p className="text-dark-400">{feature.description}</p>
    </motion.div>
  );
}

// ============================================
// STEP COMPONENT WITH MORPH
// ============================================
function StepCard({ step, index }: { step: (typeof steps)[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1.2, 1]);
  const borderRadius = useTransform(scrollYProgress, [0, 0.5, 1], [20, 50, 20]);

  return (
    <motion.div
      ref={ref}
      style={{ scale, borderRadius }}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className="flex flex-col items-center"
    >
      <motion.div
        whileHover={{ scale: 1.15, rotate: 8 }}
        className="w-20 h-20 rounded-2xl glass flex items-center justify-center text-4xl mb-4"
      >
        {step.icon}
      </motion.div>
      <h3 className="text-lg font-semibold text-white mb-1">{step.title}</h3>
      <p className="text-sm text-dark-500">{step.description}</p>
      {index < steps.length - 1 && (
        <motion.div
          className="hidden md:block w-16 h-0.5 bg-gradient-to-r from-accent-500 to-transparent mt-4"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        />
      )}
    </motion.div>
  );
}

// ============================================
// TECH CARD WITH HOVER EFFECTS
// ============================================
function TechCard({
  tech,
  index,
}: {
  tech: (typeof techStack)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);

  return (
    <motion.div
      ref={ref}
      style={{ y, opacity }}
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ scale: 1.15, y: -10 }}
      className="glass rounded-xl px-6 py-4 flex items-center gap-3 cursor-pointer group image-distort-container"
    >
      <motion.span
        className="text-2xl"
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.6 }}
      >
        {tech.icon}
      </motion.span>
      <span className="font-medium text-dark-200 group-hover:text-white transition-colors">
        {tech.name}
      </span>
    </motion.div>
  );
}

// ============================================
// HERO SECTION WITH PARALLAX
// ============================================
function HeroSection() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 150]);
  const y2 = useTransform(scrollY, [0, 500], [0, -100]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section className="relative pt-24 pb-12 overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-accent-900/20 via-transparent to-transparent"
        style={{ y: y1 }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
            style={{ y: y2 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="gradient-text">MeetSense Live</span>
              <br />
              <span className="text-white">Your AI Meeting Assistant</span>
            </h1>
            <p className="text-lg md:text-xl text-dark-400 mb-8 max-w-xl mx-auto lg:mx-0">
              Turn meetings into insights instantly with AI-powered summaries,
              tasks, and slide understanding.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent-600 hover:bg-accent-700 text-white rounded-xl font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-accent-500/25 morph-button"
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
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                </svg>
                Start Meeting
              </Link>
              <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-dark-800 hover:bg-dark-700 text-white rounded-xl font-semibold text-lg border border-dark-700 transition-all hover:border-dark-600 glow-pulse">
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
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                View Demo
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            style={{ opacity }}
            className="relative"
          >
            <LandingHero />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-dark-950 text-dark-100 overflow-x-hidden">
      {/* Scroll Progress Bar */}
      <ScrollProgress />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
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
              <span className="text-xl font-bold gradient-text">
                MeetSense Live
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <Link
                href="/dashboard"
                className="px-4 py-2 text-dark-300 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard"
                className="px-5 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-xl font-medium transition-all hover:scale-105"
              >
                Launch App
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <HeroSection />

      {/* Features Section with Scroll Morphing */}
      <section className="py-24 bg-dark-900/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="gradient-text">Powerful Features</span>
            </h2>
            <p className="text-dark-400 text-lg max-w-2xl mx-auto">
              Everything you need to transform your meetings into actionable
              insights
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="gradient-text">How It Works</span>
            </h2>
            <p className="text-dark-400 text-lg">
              From voice to insight in seconds
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">
            {steps.map((step, index) => (
              <StepCard key={index} step={step} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack Section with Parallax */}
      <section className="py-24 bg-dark-900/50 relative overflow-hidden">
        <motion.div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, rgba(76, 175, 80, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(129, 199, 132, 0.3) 0%, transparent 50%)",
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="gradient-text">Built With</span>
            </h2>
            <p className="text-dark-400 text-lg">
              Modern technologies for the best experience
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-6"
          >
            {techStack.map((tech, index) => (
              <TechCard key={index} tech={tech} index={index} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-accent-900/30 via-transparent to-transparent"
          style={{
            transform: "scale(1.2)",
          }}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Make every meeting <span className="gradient-text">smarter</span>{" "}
              with AI
            </h2>
            <p className="text-dark-400 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of teams who have transformed their meetings into
              actionable insights. Start your free trial today.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-accent-600 hover:bg-accent-700 text-white rounded-xl font-bold text-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-accent-500/25 morph-button"
            >
              <svg
                className="w-6 h-6"
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
              Launch App
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-700/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
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
              <span className="text-dark-400">MeetSense Live</span>
            </div>
            <p className="text-dark-500 text-sm">Powered by Google Gemini AI</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
