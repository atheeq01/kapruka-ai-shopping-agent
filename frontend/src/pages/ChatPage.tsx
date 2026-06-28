import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, ShoppingBag } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { CartPanel } from '../components/layout/CartPanel';
import { MessageBubble } from '../components/chat/MessageBubble';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { PromptInput } from '../components/chat/PromptInput';
import { LanguageToggle } from '../components/ui/LanguageToggle';
import { useAppStore } from '../store/cartStore';
import { sendAgentMessage, sendVoiceMessage } from '../lib/agentStream';
import { cn } from '../lib/utils';

export const ChatPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const conversation = useAppStore((s) => (id ? s.conversations[id] : undefined));
  const cartCount = useAppStore((s) => s.cart.reduce((acc, i) => acc + i.quantity, 0));
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !conversation) navigate('/', { replace: true });
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

  const isAnyPanelOpen = isSidebarOpen || isCartOpen;
  const containerClass = cn(
    "mx-auto flex flex-col transition-all duration-700 ease-in-out w-full @container",
    isAnyPanelOpen ? "max-w-4xl" : "max-w-4xl lg:max-w-[75%]"
  );

  return (
    <div className="flex h-screen overflow-hidden bg-app relative">
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-16 h-80 w-80 rounded-full bg-pink-300/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-300/10 blur-3xl" />
      </div>

      {/* Sidebar */}
      <Sidebar onPanelChange={setIsSidebarOpen} />

      {/* Main chat column */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3 glass-card border-b border-white/60 sticky top-0 z-20">
          <button
            onClick={() => navigate('/')}
            title="Back to home"
            className="w-8 h-8 rounded-full bg-white/90 border border-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-white shadow-sm transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <X size={15} />
          </button>

          <p className="text-sm font-semibold text-gray-600 truncate max-w-[200px] md:max-w-xs">
            {conversation.title === 'New chat' ? 'Kapruka AI' : conversation.title}
          </p>

          <div className="flex items-center gap-2">
          <LanguageToggle className="hidden sm:flex" />
          <button
            onClick={() => setIsCartOpen((v) => !v)}
            className="relative flex items-center gap-1.5 bg-white/90 border border-gray-100 rounded-full px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-white shadow-sm transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <ShoppingBag size={13} />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto chat-bg px-4 md:px-8 py-6">
          <div className={containerClass}>
            {conversation.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isTyping && <TypingIndicator />}
          </div>
        </div>

        {/* Input */}
        <div className="px-4 md:px-8 py-4 pb-6 chat-footer">
          <div className={containerClass}>
            <PromptInput
              placeholder="Ask me anything — flowers, cakes, gifts..."
              onSubmit={(text) => sendAgentMessage(id, text)}
              onVoiceBlob={(blob) => sendVoiceMessage(id, blob)}
            />
          </div>
        </div>
      </div>

      {/* Inline cart panel (no overlay, expands from right) */}
      <CartPanel
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        conversationId={id}
      />
    </div>
  );
};
