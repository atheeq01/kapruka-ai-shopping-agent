import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore, type LanguagePreference } from '../../store/cartStore';
import { cn } from '../../lib/utils';

interface Option {
  value: LanguagePreference;
  label: string;
  title: string;
}

const OPTIONS: Option[] = [
  { value: 'AUTO', label: 'Auto', title: 'Auto-detect & mirror your language' },
  { value: 'EN', label: 'EN', title: 'Reply in English' },
  { value: 'SI', label: 'සිං', title: 'Reply in Sinhala — සිංහලෙන් පිළිතුරු' },
  { value: 'TA', label: 'தமி', title: 'Reply in Tamil — தமிழில் பதில்' },
];

/**
 * Compact pill toggle that forces the agent's reply language. 'Auto' (default)
 * mirrors whatever language the user writes in; EN/SI/TA override it. Putting
 * Sinhala (සිං) front-and-centre makes the app's multilingual range obvious in
 * the first few seconds of a demo.
 */
export const LanguageToggle: React.FC<{ className?: string }> = ({ className }) => {
  const pref = useAppStore((s) => s.languagePreference);
  const setPref = useAppStore((s) => s.setLanguagePreference);

  const activeIndex = OPTIONS.findIndex((o) => o.value === pref);
  const activeOpt = OPTIONS[activeIndex] || OPTIONS[0];

  const handleCycle = () => {
    const nextIndex = (activeIndex + 1) % OPTIONS.length;
    setPref(OPTIONS[nextIndex].value);
  };

  return (
    <>
      {/* Mobile view: single button that cycles */}
      <button
        type="button"
        onClick={handleCycle}
        className={cn(
          'sm:hidden flex items-center justify-center rounded-full bg-gradient-to-r from-[#7c3aed] to-[#c026d3] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-transform active:scale-95',
          className,
        )}
      >
        {activeOpt.label}
      </button>

      {/* Desktop view: expanded pills */}
      <div
        className={cn(
          'hidden sm:flex items-center gap-0.5 rounded-full border border-white/90 bg-white/80 p-0.5 shadow-sm backdrop-blur-sm',
          className,
        )}
        role="group"
        aria-label="Reply language"
      >
        {OPTIONS.map((opt) => {
          const active = pref === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              title={opt.title}
              onClick={() => setPref(opt.value)}
              className={cn(
                'relative rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
                active ? 'text-white' : 'text-gray-500 hover:text-gray-800',
              )}
            >
              {active && (
                <motion.span
                  layoutId="lang-toggle-active"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #c026d3)' }}
                />
              )}
              <span className="relative z-10">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
