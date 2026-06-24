import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Mic } from 'lucide-react';
import { cn } from '../../lib/utils';
import { RecordingBar } from './RecordingBar';

interface PromptInputProps {
  placeholder?: string;
  onSubmit: (text: string) => void;
  onVoiceBlob?: (blob: Blob) => void;
  size?: 'lg' | 'md';
  autoFocus?: boolean;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  placeholder = 'Type in English, தமிழ், සිංහල, or romanized…',
  onSubmit,
  onVoiceBlob,
  size = 'md',
  autoFocus,
}) => {
  const [value, setValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isLg = size === 'lg';

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [value]);

  const submit = () => {
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleVoiceSend = (blob: Blob) => {
    setIsRecording(false);
    onVoiceBlob?.(blob);
  };

  if (isRecording) {
    return (
      <RecordingBar
        onCancel={() => setIsRecording(false)}
        onSend={handleVoiceSend}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-end gap-2 bg-white rounded-2xl border border-gray-200 shadow-sm w-full',
        'focus-within:ring-2 focus-within:ring-violet-400/30 focus-within:border-violet-400 transition-all',
        isLg ? 'p-2' : 'p-1 pr-2',
      )}
    >
      <textarea
        ref={textareaRef}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className={cn(
          'flex-1 bg-transparent border-none focus:outline-none text-kapruka-dark placeholder:text-gray-400 resize-none overflow-hidden leading-relaxed',
          isLg ? 'text-base py-2 px-2' : 'text-sm py-2 px-1',
        )}
        style={{ minHeight: isLg ? '44px' : '36px' }}
      />

      <button
        type="button"
        onClick={() => setIsRecording(true)}
        className={cn(
          'shrink-0 rounded-full transition-colors text-gray-400 hover:text-violet-500 hover:bg-violet-50',
          isLg ? 'p-3' : 'p-2',
        )}
        title="Record voice message"
      >
        <Mic size={isLg ? 18 : 16} />
      </button>

      <motion.button
        type="button"
        onClick={submit}
        disabled={!value.trim()}
        whileHover={value.trim() ? { scale: 1.08 } : undefined}
        whileTap={value.trim() ? { scale: 0.92 } : undefined}
        className={cn(
          'shrink-0 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-300/50 transition-opacity',
          'disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none',
          isLg ? 'p-3' : 'p-2',
        )}
      >
        <Send size={isLg ? 18 : 16} />
      </motion.button>
    </div>
  );
};
