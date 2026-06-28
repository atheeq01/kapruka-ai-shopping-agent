import React from 'react';
import { motion } from 'framer-motion';
import { easeOutExpo } from '../../lib/motion';

export const TypingIndicator: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easeOutExpo }}
      className="flex items-center gap-2.5 my-3"
    >
      {/* K avatar */}
      <div
        className="w-7 h-7 rounded-lg shrink-0 flex flex-col items-center justify-center gap-[1px] shadow-sm ring-1 ring-white/10"
        style={{ background: 'linear-gradient(135deg, #2A0E55 0%, #4a148c 100%)' }}
      >
        <span className="text-white font-extrabold text-[11px] leading-none select-none">K</span>
        <svg width="11" height="4" viewBox="0 0 12 6" fill="none">
          <path d="M1 1C1 1 3.5 5 6 5C8.5 5 11 1 11 1" stroke="#FF9800" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </div>

      {/* "Analyzing" bubble */}
      <div className="bubble-ai rounded-2xl rounded-tl-md px-3.5 py-2.5 flex items-center gap-2.5">
        <div className="flex gap-[4px] items-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-[5px] h-[5px] rounded-full bg-pink-400"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <span className="text-[13px] text-gray-500 font-medium">Analyzing data, please wait...</span>
      </div>
    </motion.div>
  );
};
