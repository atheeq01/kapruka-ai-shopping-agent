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
  placeholder = 'Ask me anything...',
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

  if (isRecording) {
    return (
      <RecordingBar
        onCancel={() => setIsRecording(false)}
        onSend={(blob) => {
          setIsRecording(false);
          onVoiceBlob?.(blob);
        }}
      />
    );
  }

  return (
    <div className="input-bar w-full px-4 pt-3 pb-2.5">
      <textarea
        ref={textareaRef}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className={cn(
          'w-full bg-transparent border-none focus:outline-none text-[#1a1a2e] placeholder:text-gray-400 resize-none overflow-hidden leading-relaxed',
          isLg ? 'text-base' : 'text-sm',
        )}
        style={{ minHeight: isLg ? '44px' : '36px' }}
      />

      <div className="flex items-center justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={() => setIsRecording(true)}
          className="flex items-center gap-1.5 text-gray-400 hover:text-pink-500 text-xs font-medium transition-all duration-200 rounded-full px-2.5 py-1.5 hover:bg-pink-50"
        >
          <Mic size={13} />
          <span>Voice</span>
        </button>

        <motion.button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          whileHover={value.trim() ? { scale: 1.06 } : undefined}
          whileTap={value.trim() ? { scale: 0.93 } : undefined}
          className="btn-send rounded-full px-4 py-1.5 text-sm font-semibold flex items-center gap-1.5"
        >
          <Send size={13} />
          <span>Send</span>
        </motion.button>
      </div>
    </div>
  );
};
