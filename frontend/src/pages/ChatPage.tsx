import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronLeft, Share2, ShoppingBag } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { CartDrawer } from '../components/layout/CartDrawer';
import { MessageBubble } from '../components/chat/MessageBubble';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { PromptInput } from '../components/chat/PromptInput';
import { useAppStore } from '../store/cartStore';
import { sendAgentMessage, sendVoiceMessage } from '../lib/agentStream';

export const ChatPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const conversation = useAppStore((s) => (id ? s.conversations[id] : undefined));
  const cartCount = useAppStore((s) => s.cart.reduce((acc, i) => acc + i.quantity, 0));
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !conversation) {
      navigate('/', { replace: true });
    }
  }, [id, conversation, navigate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages]);

  if (!conversation || !id) return null;

  const lastMessage = conversation.messages[conversation.messages.length - 1];
  const isTyping =
    lastMessage?.role === 'model' &&
    !lastMessage.content &&
    !lastMessage.thought &&
    !lastMessage.steps?.length &&
    !lastMessage.products?.length;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/c/${id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable, fail silently */
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-kapruka-dark transition-colors"
          >
            <ChevronLeft size={16} /> Back
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-full px-3.5 py-1.5 hover:bg-gray-50 transition-colors"
            >
              <ShoppingBag size={14} /> Cart
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-kapruka-orange text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-full px-3.5 py-1.5 hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check size={14} className="text-kapruka-green" /> : <Share2 size={14} />}
              {copied ? 'Copied' : 'Share'}
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 bg-white">
          <div className="max-w-3xl mx-auto flex flex-col">
            {conversation.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isTyping && <TypingIndicator />}
          </div>
        </div>

        <div className="px-4 md:px-8 py-4 pb-6 bg-white">
          <div className="max-w-3xl mx-auto">
            <PromptInput
                placeholder="Type in English, தமிழ், සිංහල, or romanized…"
                onSubmit={(text) => sendAgentMessage(id, text)}
                onVoiceBlob={(blob) => sendVoiceMessage(id, blob)}
              />
          </div>
        </div>
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} conversationId={id} />
    </div>
  );
};
