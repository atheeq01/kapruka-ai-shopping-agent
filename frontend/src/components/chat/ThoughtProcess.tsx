import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Brain } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ThoughtProcessProps {
  text: string;
}

export const ThoughtProcess: React.FC<ThoughtProcessProps> = ({ text }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-pink-500"
      >
        <Brain size={13} />
        Show thought process
        <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-2 whitespace-pre-wrap rounded-xl border border-pink-100 bg-pink-50/40 p-3 text-sm leading-relaxed text-gray-500">
              {text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
