'use client';

import { motion } from 'framer-motion';

export function MatchAnimation() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: 1 }}
        exit={{ scale: 2, opacity: 0 }}
        transition={{ duration: 0.5, ease: "backOut" }}
        className="bg-white/90 backdrop-blur-md p-10 rounded-full shadow-2xl border-4 border-blue-500"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="text-6xl mb-4"
          >
            ✨
          </motion.div>
          <h2 className="text-3xl font-black text-blue-600 uppercase tracking-tighter italic">
            Matched!
          </h2>
        </div>
      </motion.div>
    </div>
  );
}
