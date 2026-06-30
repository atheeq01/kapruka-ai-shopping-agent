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
import { MobileDrawer } from '../components/layout/MobileDrawer';
import { Menu } from 'lucide-react';

/* Static, prop-less decoration — hoisted so it isn't rebuilt each render (rendering-hoist-jsx). */
const AmbientBlobs = (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div className="absolute -top-24 -left-16 h-80 w-80 rounded-full bg-pink-300/10 blur-3xl" />
    <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-300/10 blur-3xl" />
  </div>
);

export const ChatPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const conversation = useAppStore((s) => (id ? s.conversations[id] : undefined));
  const cartCount = useAppStore((s) => s.cart.reduce((acc, i) => acc + i.quantity, 0));
  // Cart drawer open/step lives in the store so any in-chat card (e.g. the
  // compact checkout summary) can open the single checkout surface.
  const isCartOpen = useAppStore((s) => s.cartOpen);
  const openCart = useAppStore((s) => s.openCart);
  const closeCart = useAppStore((s) => s.closeCart);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
  // Centered, width-capped reading column. It widens with the viewport up to a
  // comfortable ceiling (so product grids get room on laptops/wide screens) but
  // never sprawls edge-to-edge on big monitors.
  const containerClass = cn(
    "mx-auto flex flex-col transition-all duration-500 ease-in-out w-full @container",
    isAnyPanelOpen
      ? "max-w-3xl xl:max-w-4xl"
      : "max-w-3xl lg:max-w-5xl 2xl:max-w-6xl"
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-app relative">
      {/* Ambient blobs */}
      {AmbientBlobs}

      {/* Sidebar - Desktop Only */}
      <div className="hidden md:flex h-full">
        <Sidebar onPanelChange={setIsSidebarOpen} />
      </div>

      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Main chat column */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-3 md:px-6 h-[56px] glass-card border-b border-white/60 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="md:hidden w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
            >
              <Menu size={22} />
            </button>
            <button
              onClick={() => navigate('/')}
              title="Back to home"
              className="hidden md:flex w-8 h-8 rounded-full bg-white/90 border border-gray-100 items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-white shadow-sm transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <X size={15} />
            </button>
          </div>

          <p className="text-sm font-semibold text-gray-800 truncate max-w-[90px] sm:max-w-[180px] md:max-w-xs absolute left-1/2 -translate-x-1/2">
            {conversation.title === 'New chat' ? 'Kapruka AI' : conversation.title}
          </p>

          <div className="flex items-center gap-1 sm:gap-2 ml-auto scale-[0.85] sm:scale-100 origin-right">
            <LanguageToggle />
            <button
              onClick={() => (isCartOpen ? closeCart() : openCart('cart'))}
              className="relative flex items-center gap-1.5 bg-white/90 border border-gray-100 rounded-full px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-white shadow-sm transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <ShoppingBag size={13} />
              <span className="hidden md:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto chat-bg px-3 md:px-8 py-6">
          <div className={containerClass}>
            {conversation.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} conversationId={id} />
            ))}
            {isTyping && <TypingIndicator />}
          </div>
        </div>

        {/* Input */}
        <div className="px-3 md:px-8 py-2 md:py-4 chat-footer pb-[max(1.25rem,env(safe-area-inset-bottom))] z-20">
          <div className={containerClass}>
            <PromptInput
              placeholder="Ask anything..."
              onSubmit={(text) => sendAgentMessage(id, text)}
              onVoiceBlob={(blob) => sendVoiceMessage(id, blob)}
            />
          </div>
        </div>
      </div>

      {/* Single checkout surface */}
      <CartPanel conversationId={id} />
    </div>
  );
};
