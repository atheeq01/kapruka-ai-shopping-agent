import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Search, Truck, Sparkles, Loader2, PackageCheck } from 'lucide-react';
import type { AgentStep } from '../../store/cartStore';

interface AgentThinkingProps {
  steps: AgentStep[];
  active: boolean;
}

const iconFor = (step: AgentStep) => {
  if (step.kind === 'thinking') return Sparkles;
  if (/deliver|delivery|checked|checking/i.test(step.label)) return Truck;
  if (/order|placed|placing/i.test(step.label)) return PackageCheck;
  if (/search/i.test(step.label)) return Search;
  return Sparkles;
};

export const AgentThinking: React.FC<AgentThinkingProps> = ({ steps, active }) => {
  if (!steps || steps.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mb-3 overflow-hidden rounded-2xl border border-pink-100/60 bg-gradient-to-br from-pink-50/60 via-white to-violet-50/40 p-3.5"
    >
      {/* Sweeping sheen */}
      {active && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/55 to-transparent"
          initial={{ x: '-120%' }}
          animate={{ x: '120%' }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="relative flex flex-col gap-2">
        {steps.map((step, i) => {
          const Icon = step.status === 'done' ? Check : iconFor(step);
          const running = step.status === 'running';
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2.5"
            >
              <span
                className={[
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors',
                  step.status === 'done'
                    ? 'bg-green-100 text-green-500'
                    : 'bg-pink-100 text-pink-500',
                ].join(' ')}
              >
                {running ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Icon size={13} strokeWidth={2.5} />
                )}
              </span>

              {running ? (
                <span
                  className="text-sm font-medium bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #ec4899, #a855f7, #ec4899)',
                    backgroundSize: '200% auto',
                    animation: 'shimmer 2s linear infinite',
                  }}
                >
                  {step.label}
                  <ThinkingDots />
                </span>
              ) : (
                <span className="text-sm font-medium text-gray-500">{step.label}</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

const ThinkingDots: React.FC = () => (
  <AnimatePresence>
    <span className="ml-0.5 inline-flex">
      {[0, 1, 2].map((d) => (
        <motion.span
          key={d}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.2 }}
        >
          .
        </motion.span>
      ))}
    </span>
  </AnimatePresence>
);
