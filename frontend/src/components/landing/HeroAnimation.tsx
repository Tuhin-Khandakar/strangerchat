'use client';

import { motion } from 'framer-motion';

export function HeroAnimation() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Background Glow */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute w-72 h-72 bg-blue-400/30 rounded-full blur-3xl"
      />
      
      {/* Floating Chat Bubbles */}
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-10 left-10 bg-white p-4 rounded-2xl shadow-xl border border-blue-100 flex items-center gap-3"
      >
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">👨</div>
        <div>
          <div className="w-16 h-2 bg-gray-200 rounded-full mb-1" />
          <div className="w-24 h-2 bg-gray-100 rounded-full" />
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute bottom-10 right-10 bg-white p-4 rounded-2xl shadow-xl border border-cyan-100 flex items-center gap-3"
      >
        <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center text-xl">👩</div>
        <div>
          <div className="w-20 h-2 bg-gray-200 rounded-full mb-1" />
          <div className="w-12 h-2 bg-gray-100 rounded-full" />
        </div>
      </motion.div>

      {/* Main Illustration Placeholder */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-64 h-64 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-3xl shadow-2xl flex items-center justify-center border-4 border-white/20"
      >
        <span className="text-8xl">💬</span>
      </motion.div>

      {/* Connecting Lines Animation */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <motion.path
          d="M 100 100 Q 200 150 300 100"
          fill="transparent"
          stroke="url(#gradient)"
          strokeWidth="2"
          strokeDasharray="10 5"
          animate={{ strokeDashoffset: [-20, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
