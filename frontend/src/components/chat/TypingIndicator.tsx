import React from 'react';
import { motion } from 'framer-motion';

export const TypingIndicator: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="flex items-center gap-3 my-3"
    >
      {/* K avatar */}
      <div
        className="w-9 h-9 rounded-xl shrink-0 flex flex-col items-center justify-center gap-[2px] shadow-md"
        style={{ background: 'linear-gradient(135deg, #2A0E55 0%, #4a148c 100%)' }}
      >
        <span className="text-white font-extrabold text-sm leading-none select-none">K</span>
        <svg width="13" height="5" viewBox="0 0 12 6" fill="none">
          <path d="M1 1C1 1 3.5 5 6 5C8.5 5 11 1 11 1" stroke="#FF9800" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>

      {/* "Analyzing" bubble */}
      <div className="bubble-ai rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2.5">
        <div className="flex gap-[5px] items-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-[5px] h-[5px] rounded-full bg-pink-400"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <span className="text-sm text-gray-500 font-medium">Analyzing data, please wait...</span>
      </div>
    </motion.div>
  );
};
