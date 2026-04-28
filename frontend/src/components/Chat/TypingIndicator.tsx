import { motion } from 'framer-motion';

export function TypingIndicator() {
  return (
    <div className="flex justify-start my-2">
      <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut"
            }}
            className="w-1.5 h-1.5 bg-gray-400 rounded-full"
          />
        ))}
      </div>
    </div>
  );
}
