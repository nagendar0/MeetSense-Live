"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function LandingHero() {
  const [particles, setParticles] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      size: number;
      duration: number;
      delay: number;
    }>
  >([]);

  useEffect(() => {
    // Generate random particles on mount
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 2,
      duration: Math.random() * 10 + 15,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="h-[600px] w-full relative overflow-hidden bg-dark-900 rounded-2xl">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(76, 175, 80, 0.4) 0%, transparent 40%),
              radial-gradient(circle at 80% 70%, rgba(129, 199, 132, 0.3) 0%, transparent 40%),
              radial-gradient(circle at 50% 50%, rgba(46, 125, 50, 0.2) 0%, transparent 50%)
            `,
            backgroundSize: "200% 200%",
          }}
        />
      </div>

      {/* Floating particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-accent-500/30"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 0.8, 0],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Central glowing orb */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(76, 175, 80, 0.8) 0%, rgba(46, 125, 50, 0.4) 50%, transparent 70%)",
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Animated rings */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent-500/30"
          style={{
            width: 120 + i * 60,
            height: 120 + i * 60,
          }}
          animate={{
            rotate: 360,
            scale: [1, 1.05, 1],
          }}
          transition={{
            rotate: {
              duration: 20 + i * 5,
              repeat: Infinity,
              ease: "linear",
            },
            scale: {
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
        />
      ))}

      {/* Mic icon */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="w-16 h-24 relative">
          {/* Mic body */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-14 bg-gradient-to-b from-accent-600 to-accent-700 rounded-full" />
          {/* Mic head */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-10 h-10 bg-gradient-to-b from-accent-500 to-accent-600 rounded-full" />
          {/* Mic stand */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-accent-700 rounded-sm" />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-accent-600 rounded-full" />
        </div>
      </motion.div>

      {/* Glow effects */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-dark-900/50" />
    </div>
  );
}
