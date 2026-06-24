import React from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
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

/** Shimmer skeleton shown while the voice transcript is in flight. */
const VoiceShimmer: React.FC = () => (
  <div className="flex flex-col gap-2 max-w-[80%] ml-auto">
    <div className="bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 rounded-2xl rounded-tr-md px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-white/30 animate-pulse" />
      <div className="flex items-center gap-[2px] flex-1 h-6">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="rounded-full bg-white/40 w-[3px] animate-pulse"
            style={{
              height: `${8 + Math.random() * 16}px`,
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>
    </div>
    <div className="h-3 w-32 bg-gray-200 rounded-full animate-pulse self-end" />
  </div>
);

/** Shimmer shown on the bot side while voice is processing. */
const ProcessingVoiceShimmer: React.FC = () => (
  <div className="flex flex-col gap-2 max-w-[80%] my-2">
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
      Processing voice…
    </div>
    <div className="space-y-1.5">
      <div className="h-3 w-48 bg-gray-100 rounded-full animate-pulse" />
      <div className="h-3 w-36 bg-gray-100 rounded-full animate-pulse" />
    </div>
  </div>
);

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser      = message.role === 'user';
  const isStreaming = message.done === false;
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // ── User messages ──────────────────────────────────────────────────────────
  if (isUser) {
    // Voice bubble (uploading but no transcript yet)
    if (message.type === 'voice' && !message.content) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="flex flex-col items-end my-2.5"
        >
          <VoiceShimmer />
        </motion.div>
      );
    }

    // Voice bubble with transcript resolved
    if (message.type === 'voice') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="flex flex-col items-end my-2.5"
        >
          <VoiceBubble
            audioUrl={message.audioUrl}
            transcript={message.transcript ?? message.content}
            lang={message.lang}
          />
          <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-400">
            {time}
            <Check size={12} className="text-kapruka-green" />
          </div>
        </motion.div>
      );
    }

    // Regular text bubble
    return (
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="flex flex-col items-end my-2.5"
      >
        <div className="max-w-[80%] bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-2xl rounded-tr-md px-4 py-3 text-sm md:text-base whitespace-pre-wrap shadow-md shadow-violet-200/60">
          {message.content}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {message.lang && <LanguageBadge lang={message.lang} auto />}
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            {time}
            <Check size={12} className="text-kapruka-green" />
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Bot messages ───────────────────────────────────────────────────────────

  // Voice processing shimmer
  if (message.isProcessingVoice && !message.content) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-2.5"
      >
        <ProcessingVoiceShimmer />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      className="flex flex-col my-2.5"
    >
      {/* Live reasoning + tool timeline while streaming */}
      {isStreaming && message.steps && message.steps.length > 0 && (
        <AgentThinking steps={message.steps} active />
      )}

      {/* Collapsible full reasoning once settled */}
      {!isStreaming && message.thought && <ThoughtProcess text={message.thought} />}

      {message.content && (
        <div className="text-sm md:text-base leading-relaxed text-kapruka-dark prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
          <ReactMarkdown
            components={{
              a: ({ ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" className="text-kapruka-orange underline" />
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-[2px] -mb-0.5 animate-pulse rounded-full bg-violet-500 align-middle" />
          )}
        </div>
      )}

      {/* Prominent detail card for a single looked-up product (with size choices) */}
      {message.productDetail && <ProductDetailCard product={message.productDetail} />}

      {/* Product grid (search results / suggested add-ons) */}
      {message.products && message.products.length > 0 && (
        <ProductResultsPanel products={message.products} />
      )}

      {/* Full order summary card (after create_order) */}
      {message.orderConfirmation && (
        <OrderConfirmationCard order={message.orderConfirmation as any} />
      )}

      {/* Order tracking card */}
      {message.order && (
        <OrderCard order={message.order as any} />
      )}

      {/* Footer: lang badge + timestamp */}
      {!isStreaming &&
        (message.content || message.products || message.productDetail || message.order || message.orderConfirmation) && (
        <div className="flex items-center gap-2 mt-2">
          {message.lang && <LanguageBadge lang={message.lang} auto />}
          <span className="text-[11px] text-gray-400">{time}</span>
        </div>
      )}
    </motion.div>
  );
};
