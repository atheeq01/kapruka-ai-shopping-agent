import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { Check, Copy, ThumbsUp, Volume2 } from 'lucide-react';
import type { ChatMessage } from '../../store/cartStore';
import { ProductResultsPanel } from '../shop/ProductResultsPanel';
import { ProductDetailCard } from '../shop/ProductDetailCard';
import { OrderCard } from '../shop/OrderCard';
import { OrderConfirmationCard } from '../shop/OrderConfirmationCard';
import { ThoughtProcess } from './ThoughtProcess';
import { AgentThinking } from './AgentThinking';
import { LanguageBadge } from './LanguageBadge';
import { VoiceBubble } from './VoiceBubble';

interface MessageBubbleProps {
  message: ChatMessage;
}

const VoiceShimmer: React.FC = () => (
  <div className="flex flex-col gap-2 max-w-[80%] ml-auto">
    <div className="bubble-user rounded-2xl rounded-tr-md px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-white/30 animate-pulse" />
      <div className="flex items-center gap-[2px] flex-1 h-6">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="rounded-full bg-white/50 w-[3px] animate-pulse"
            style={{ height: `${8 + Math.random() * 16}px`, animationDelay: `${i * 0.05}s` }}
          />
        ))}
      </div>
    </div>
    <div className="h-3 w-28 bg-pink-100 rounded-full animate-pulse self-end" />
  </div>
);

const KAvatar: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={`w-9 h-9 rounded-xl shrink-0 flex flex-col items-center justify-center gap-[2px] shadow-md ${className ?? ''}`}
    style={{ background: 'linear-gradient(135deg, #2A0E55 0%, #4a148c 100%)' }}
  >
    <span className="text-white font-extrabold text-sm leading-none select-none">K</span>
    <svg width="13" height="5" viewBox="0 0 12 6" fill="none">
      <path d="M1 1C1 1 3.5 5 6 5C8.5 5 11 1 11 1" stroke="#FF9800" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  </div>
);

const ProcessingVoiceShimmer: React.FC = () => (
  <div className="flex items-center gap-3 my-2">
    <KAvatar />
    <div className="bubble-ai rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
      <span className="text-sm text-gray-500">Processing voice…</span>
    </div>
  </div>
);

const AiAvatar: React.FC = () => (
  <KAvatar className="self-start mt-0.5" />
);

const MessageActions: React.FC<{ content: string }> = ({ content }) => {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <ActionBtn onClick={handleCopy} title="Copy">
        {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      </ActionBtn>
      <ActionBtn onClick={() => setLiked((v) => !v)} title="Like">
        <ThumbsUp size={12} className={liked ? 'text-pink-500 fill-pink-500' : ''} />
      </ActionBtn>
      <ActionBtn title="Read aloud">
        <Volume2 size={12} />
      </ActionBtn>
    </div>
  );
};

const ActionBtn: React.FC<{ children: React.ReactNode; onClick?: () => void; title?: string }> = ({
  children, onClick, title,
}) => (
  <button
    onClick={onClick}
    title={title}
    className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
  >
    {children}
  </button>
);

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser      = message.role === 'user';
  const isStreaming = message.done === false;
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  });

  /* ── User messages ── */
  if (isUser) {
    if (message.type === 'voice' && !message.content) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="flex flex-col items-end my-2.5"
        >
          <VoiceShimmer />
        </motion.div>
      );
    }

    if (message.type === 'voice') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="flex flex-col items-end my-2.5"
        >
          <VoiceBubble
            audioUrl={message.audioUrl}
            transcript={message.transcript ?? message.content}
            lang={message.lang}
          />
          <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-400">
            {time}
            <Check size={11} className="text-green-400" />
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="flex flex-col items-end my-2.5"
      >
        <div className="max-w-[78%] bubble-user rounded-2xl rounded-tr-md px-4 py-3 text-sm md:text-base whitespace-pre-wrap">
          {message.content}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {message.lang && <LanguageBadge lang={message.lang} auto />}
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            {time}
            <Check size={11} className="text-green-400" />
          </div>
        </div>
      </motion.div>
    );
  }

  /* ── Bot messages ── */

  if (message.isProcessingVoice && !message.content) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="my-2.5">
        <ProcessingVoiceShimmer />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      className="flex items-start gap-3 my-3 group"
    >
      <AiAvatar />

      <div className="flex-1 min-w-0">
        {/* Live reasoning while streaming */}
        {isStreaming && message.steps && message.steps.length > 0 && (
          <AgentThinking steps={message.steps} active />
        )}

        {/* Collapsed reasoning once done */}
        {!isStreaming && message.thought && <ThoughtProcess text={message.thought} />}

        {message.content && (
          <div className="bubble-ai rounded-2xl rounded-tl-sm px-4 py-3 text-sm md:text-base leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
            <ReactMarkdown
              components={{
                a: ({ ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" className="text-pink-500 underline" />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-[2px] -mb-0.5 animate-pulse rounded-full bg-pink-400 align-middle" />
            )}
          </div>
        )}

        {message.productDetail && <ProductDetailCard product={message.productDetail} />}

        {message.products && message.products.length > 0 && (
          <ProductResultsPanel products={message.products} />
        )}

        {message.orderConfirmation && (
          <OrderConfirmationCard order={message.orderConfirmation as any} />
        )}

        {message.order && <OrderCard order={message.order as any} />}

        {/* Footer */}
        {!isStreaming &&
          (message.content || message.products || message.productDetail || message.order || message.orderConfirmation) && (
          <div className="flex items-center gap-2 mt-1.5">
            {message.content && <MessageActions content={message.content} />}
            {message.lang && <LanguageBadge lang={message.lang} auto />}
            <span className="text-[11px] text-gray-400 ml-auto">{time}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
