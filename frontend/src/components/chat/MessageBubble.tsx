import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { motion } from 'framer-motion';
import { Check, Copy, ThumbsUp, Volume2, Loader2 } from 'lucide-react';
import { easeOutExpo } from '../../lib/motion';
import { cn } from '../../lib/utils';
import { quickDetect } from '../../lib/detectLang';

/**
 * Stable, deterministic waveform heights for the voice-upload shimmer.
 * Hoisted to module scope so the bars don't jitter to new random heights on
 * every re-render (per rendering-hydration-no-flicker).
 */
const SHIMMER_BAR_HEIGHTS = [12, 18, 9, 15, 20, 11, 16, 8, 14, 19, 10, 17, 13, 7, 18, 12, 15, 9];

/**
 * Markdown renderer config hoisted out of render (rendering-hoist-jsx) so the
 * object identity is stable and isn't rebuilt on every message update.
 */
const MARKDOWN_COMPONENTS: Components = {
  a: ({ ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" className="text-pink-500 underline" />
  ),
};
import type { ChatMessage } from '../../store/cartStore';
import { ProductResultsPanel } from '../shop/ProductResultsPanel';
import { ProductDetailCard } from '../shop/ProductDetailCard';
import { OrderCard, type OrderData } from '../shop/OrderCard';
import { OrderConfirmationCard, type OrderConfirmation } from '../shop/OrderConfirmationCard';
import { InlineCheckout } from '../shop/InlineCheckout';
import { ThoughtProcess } from './ThoughtProcess';
import { AgentThinking } from './AgentThinking';
import { LanguageBadge } from './LanguageBadge';
import { VoiceBubble } from './VoiceBubble';

interface MessageBubbleProps {
  message: ChatMessage;
  conversationId: string;
}

const VoiceShimmer: React.FC = () => (
  <div className="flex flex-col gap-1.5 max-w-[72%] ml-auto">
    <div className="bubble-user rounded-2xl rounded-tr-md px-3.5 py-2.5 flex items-center gap-3">
      <div className="w-7 h-7 rounded-full bg-white/30 animate-pulse" />
      <div className="flex items-center gap-[2px] flex-1 h-5">
        {SHIMMER_BAR_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className="rounded-full bg-white/50 w-[3px] animate-pulse"
            style={{ height: `${h}px`, animationDelay: `${i * 0.05}s` }}
          />
        ))}
      </div>
    </div>
    <div className="h-2.5 w-24 bg-pink-100 rounded-full animate-pulse self-end" />
  </div>
);

const KAvatar: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={`w-7 h-7 rounded-lg shrink-0 flex flex-col items-center justify-center gap-[1px] shadow-sm ring-1 ring-white/10 ${className ?? ''}`}
    style={{ background: 'linear-gradient(135deg, #2A0E55 0%, #4a148c 100%)' }}
  >
    <span className="text-white font-extrabold text-[11px] leading-none select-none">K</span>
    <svg width="11" height="4" viewBox="0 0 12 6" fill="none">
      <path d="M1 1C1 1 3.5 5 6 5C8.5 5 11 1 11 1" stroke="#FF9800" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  </div>
);

const ProcessingVoiceShimmer: React.FC = () => (
  <div className="flex items-center gap-2.5 my-2">
    <KAvatar />
    <div className="bubble-ai rounded-2xl rounded-tl-md px-3.5 py-2.5 flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
      <span className="text-[13px] text-gray-500">Processing voice…</span>
    </div>
  </div>
);

const AiAvatar: React.FC = () => (
  <KAvatar className="self-start mt-0.5" />
);

/** Strip markdown syntax so TTS reads clean prose. */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')        // fenced code blocks
    .replace(/`[^`]+`/g, '')               // inline code
    .replace(/#{1,6}\s+/g, '')             // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')       // bold
    .replace(/\*(.+?)\*/g, '$1')           // italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links — keep label
    .replace(/[_~>|]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}



const MessageActions: React.FC<{ content: string; lang?: string }> = ({ content, lang }) => {
  const [copied,  setCopied]  = useState(false);
  const [liked,   setLiked]   = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const handleSpeak = async () => {
    if (loading) return;

    if (speaking) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setSpeaking(false);
      return;
    }

    const plain = stripMarkdown(content);
    if (!plain) return;

    try {
      if (!audioRef.current) {
        let url = audioUrl;
        if (!url) {
          setLoading(true);
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/chat/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: plain })
          });
          if (!res.ok) throw new Error('TTS failed');
          const blob = await res.blob();
          url = URL.createObjectURL(blob);
          setAudioUrl(url);
          setLoading(false);
        }
        audioRef.current = new Audio(url!);
        audioRef.current.onended = () => setSpeaking(false);
        audioRef.current.onerror = () => setSpeaking(false);
      }
      setSpeaking(true);
      await audioRef.current.play();
    } catch (e) {
      console.error(e);
      setLoading(false);
      setSpeaking(false);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1.5 opacity-100 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <ActionBtn onClick={handleCopy} title="Copy">
        {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      </ActionBtn>
      <ActionBtn onClick={() => setLiked((v) => !v)} title="Like">
        <ThumbsUp size={12} className={liked ? 'text-pink-500 fill-pink-500' : ''} />
      </ActionBtn>
      <ActionBtn onClick={handleSpeak} title={loading ? 'Processing voice...' : speaking ? 'Stop reading' : 'Read aloud'}>
        {loading ? (
          <Loader2 size={12} className="text-pink-500 animate-spin" />
        ) : (
          <Volume2 size={12} className={speaking ? 'text-pink-500 animate-pulse' : ''} />
        )}
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

/** Past this character count a completed answer collapses behind "Show more". */
const COLLAPSE_THRESHOLD = 600;

/**
 * Assistant answer body. Long, completed answers collapse behind a "Show more"
 * toggle so a single verbose reply can't push the whole conversation off-screen
 * (clamped to ~6 lines). Streaming answers always render in full.
 */
const AiText: React.FC<{ content: string; streaming: boolean }> = ({ content, streaming }) => {
  const [expanded, setExpanded] = useState(false);
  const collapsible = !streaming && content.length > COLLAPSE_THRESHOLD;

  return (
    <div className="inline-block w-fit max-w-full sm:max-w-[680px] bubble-ai rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[13.5px] leading-[1.55] prose prose-sm prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:text-[14px] prose-strong:text-gray-900">
      {/* Reliable clamp via max-height (line-clamp can't clamp markdown block
          children); a soft fade hints there's more below. */}
      <div className={cn('relative', collapsible && !expanded && 'max-h-[8.5rem] overflow-hidden')}>
        <ReactMarkdown components={MARKDOWN_COMPONENTS}>
          {content}
        </ReactMarkdown>
        {collapsible && !expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-white to-transparent" />
        )}
      </div>
      {streaming && (
        <span className="ml-0.5 inline-block h-3.5 w-[2px] -mb-0.5 animate-pulse rounded-full bg-primary-400 align-middle" />
      )}
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-[12px] font-semibold text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 rounded"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
};

const MessageBubbleInner: React.FC<MessageBubbleProps> = ({ message, conversationId }) => {
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeOutExpo }}
          className="chat-msg flex flex-col items-end my-2"
        >
          <VoiceShimmer />
        </motion.div>
      );
    }

    if (message.type === 'voice') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeOutExpo }}
          className="chat-msg flex flex-col items-end my-2"
        >
          <VoiceBubble
            audioUrl={message.audioUrl}
            transcript={message.transcript ?? message.content}
            lang={message.lang}
          />
          <div className="flex items-center gap-1 mt-1 text-[10.5px] text-gray-400">
            {time}
            <Check size={11} className="text-green-400" />
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOutExpo }}
        className="flex flex-col items-end my-2"
      >
        <div className="max-w-[85%] sm:max-w-[600px] bubble-user rounded-2xl rounded-tr-md px-3.5 py-2.5 text-[13.5px] leading-[1.5] whitespace-pre-wrap">
          {message.content}
        </div>
        <div className="flex items-center justify-end gap-2 mt-1 px-0.5 w-full">
          {message.lang && <LanguageBadge lang={message.lang} auto />}
          <div className="flex items-center gap-1 text-[10.5px] text-gray-400">
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
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: easeOutExpo }} className="my-2">
        <ProcessingVoiceShimmer />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOutExpo }}
      className="chat-msg flex items-start gap-2.5 my-3 group"
    >
      <AiAvatar />

      <div className="flex-1 min-w-0">
        {/* Live reasoning while streaming */}
        {isStreaming && message.steps && message.steps.length > 0 && (
          <AgentThinking steps={message.steps} active />
        )}

        {/* Collapsed reasoning once done */}
        {!isStreaming && message.thought && <ThoughtProcess text={message.thought} />}

        {message.content && <AiText content={message.content} streaming={isStreaming} />}

        {!!message.productDetail && <ProductDetailCard product={message.productDetail} />}

        {message.products && message.products.length > 0 && (
          <ProductResultsPanel products={message.products} />
        )}

        {message.checkoutForm && (
          <InlineCheckout items={message.checkoutForm.items} conversationId={conversationId} />
        )}

        {message.orderConfirmation && (
          <OrderConfirmationCard order={message.orderConfirmation as unknown as OrderConfirmation} />
        )}

        {message.order && <OrderCard order={message.order as unknown as OrderData} />}

        {/* Footer */}
        {!isStreaming &&
          Boolean(message.content || message.products || message.productDetail || message.order || message.orderConfirmation || message.checkoutForm) && (
          <div className="flex items-center gap-2 mt-1 px-0.5">
            {message.lang && <LanguageBadge lang={message.lang} auto />}
            {message.content && <MessageActions content={message.content} lang={message.lang} />}
            <span className="text-[10.5px] text-gray-400 ml-auto">{time}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Memoized so a streaming update (which only mutates the *last* message object)
 * doesn't re-render every earlier bubble in the conversation. Zustand preserves
 * referential identity of unchanged messages, so the default shallow prop
 * comparison is exactly what we want (rerender-memo).
 */
export const MessageBubble = React.memo(MessageBubbleInner);
