import React from 'react';
import { LANG_CONFIG, type LangCode } from '../../lib/detectLang';

interface LanguageBadgeProps {
  lang: string;
  auto?: boolean;
  size?: 'xs' | 'sm';
  className?: string;
}

export const LanguageBadge: React.FC<LanguageBadgeProps> = ({
  lang,
  auto = true,
  size = 'xs',
  className = '',
}) => {
  const cfg = LANG_CONFIG[lang as LangCode];
  if (!cfg) return null;

  const sizeClass = size === 'xs'
    ? 'text-[10px] px-1.5 py-0.5 gap-0.5'
    : 'text-xs px-2 py-0.5 gap-1';

  return (
    <span
      className={`inline-flex items-center border rounded-full font-semibold tracking-wide ${cfg.className} ${sizeClass} ${className}`}
    >
      {cfg.short}
      {auto && (
        <span className="opacity-50 font-normal text-[9px]">auto</span>
      )}
    </span>
  );
};
