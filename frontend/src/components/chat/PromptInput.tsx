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
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`;
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
    <div className="input-bar w-full px-2 py-2 flex items-end gap-2 rounded-3xl shadow-sm bg-white/90 backdrop-blur-md">
      <textarea
        ref={textareaRef}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className={cn(
          'w-full bg-transparent border-none focus:outline-none text-[#1a1a2e] placeholder:text-gray-400 resize-none leading-relaxed py-2',
          isLg ? 'text-base' : 'text-sm',
        )}
        style={{ minHeight: '36px' }}
      />

      <div className="flex items-center shrink-0 mb-0.5 gap-1">
        {!value.trim() ? (
          <button
            type="button"
            onClick={() => setIsRecording(true)}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-pink-500 transition-colors rounded-full hover:bg-pink-50"
          >
            <Mic size={18} />
          </button>
        ) : (
          <motion.button
            type="button"
            onClick={submit}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 flex items-center justify-center bg-black text-white rounded-full hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Send size={15} className="ml-0.5" />
          </motion.button>
        )}
      </div>
    </div>
  );
};
