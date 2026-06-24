import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageBadge } from './LanguageBadge';

interface VoiceBubbleProps {
  audioUrl?: string;
  transcript?: string;
  lang?: string;
  failed?: boolean;
  onRetry?: () => void;
}

export const VoiceBubble: React.FC<VoiceBubbleProps> = ({
  audioUrl,
  transcript,
  lang,
  failed,
  onRetry,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration]   = useState(0);
  const [elapsed, setElapsed]     = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.onended = () => {
      setIsPlaying(false);
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    return () => {
      audio.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      audio.play();
      setIsPlaying(true);
      intervalRef.current = setInterval(() => {
        setElapsed(audio.currentTime);
      }, 100);
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? elapsed / duration : 0;

  const BAR_HEIGHTS = [0.3, 0.6, 0.9, 0.5, 0.8, 0.4, 0.7, 0.95, 0.6, 0.4,
                       0.8, 0.5, 0.9, 0.3, 0.7, 0.6, 0.4, 0.85, 0.5, 0.3];

  if (failed) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl rounded-tr-md px-4 py-3">
        <span className="text-xs text-red-600">Voice upload failed</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
          >
            <RotateCcw size={12} /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 max-w-[80%]">
      <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-md shadow-violet-200/60">
        {/* Player row */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            disabled={!audioUrl}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors shrink-0 disabled:opacity-40"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>

          {/* Waveform bars */}
          <div className="flex items-center gap-[2px] flex-1 h-8">
            {BAR_HEIGHTS.map((h, i) => {
              const played = i / BAR_HEIGHTS.length < progress;
              return (
                <motion.div
                  key={i}
                  className={`rounded-full w-[3px] ${played || isPlaying ? 'bg-white' : 'bg-white/40'}`}
                  animate={{
                    height: isPlaying
                      ? [`${h * 24}px`, `${Math.max(4, h * 24 * (0.4 + Math.random() * 0.6))}px`, `${h * 24}px`]
                      : `${h * 24}px`,
                  }}
                  transition={isPlaying ? {
                    repeat: Infinity,
                    duration: 0.4 + Math.random() * 0.4,
                    delay: i * 0.03,
                    ease: 'easeInOut',
                  } : { duration: 0.2 }}
                  style={{ height: `${h * 24}px` }}
                />
              );
            })}
          </div>

          {/* Duration */}
          <span className="text-[11px] text-white/70 shrink-0 tabular-nums">
            {duration > 0 ? fmt(isPlaying ? elapsed : duration) : '—'}
          </span>
        </div>

        {/* Transcript toggle */}
        {transcript && (
          <button
            onClick={() => setShowTranscript(v => !v)}
            className="mt-2 flex items-center gap-1 text-[11px] text-white/60 hover:text-white/90 transition-colors"
          >
            {showTranscript ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {showTranscript ? 'Hide transcript' : 'Show transcript'}
          </button>
        )}
      </div>

      {/* Transcript panel */}
      <AnimatePresence>
        {showTranscript && transcript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 leading-relaxed">
              {transcript}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lang badge */}
      {lang && <LanguageBadge lang={lang} auto className="self-end mt-0.5" />}
    </div>
  );
};
