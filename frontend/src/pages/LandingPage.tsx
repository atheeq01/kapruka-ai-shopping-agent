import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { CartDrawer } from '../components/layout/CartDrawer';
import { PromptInput } from '../components/chat/PromptInput';
import { useAppStore } from '../store/cartStore';
import { sendAgentMessage, sendVoiceMessage } from '../lib/agentStream';
import { motion } from 'framer-motion';

const EXAMPLE_PROMPTS = [
  '💐 Flowers for my girlfriend',
  '🎂 Birthday cakes under Rs. 3,000',
  '🎁 Anniversary gift ideas',
  '🚚 Deliver to Colombo today',
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const createConversation = useAppStore((s) => s.createConversation);
  const cartCount = useAppStore((s) => s.cart.reduce((acc, i) => acc + i.quantity, 0));
  const [isCartOpen, setIsCartOpen] = useState(false);

  const handleStart = (text: string) => {
    const id = createConversation();
    navigate(`/c/${id}`);
    sendAgentMessage(id, text);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-kapruka-surface relative">
      {/* Animated gradient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-24 -left-16 h-96 w-96 rounded-full bg-violet-300/30 blur-3xl"
          style={{ animation: 'blob 14s ease-in-out infinite' }}
        />
        <div
          className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-fuchsia-300/25 blur-3xl"
          style={{ animation: 'blob 18s ease-in-out infinite', animationDelay: '-4s' }}
        />
        <div
          className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-orange-200/30 blur-3xl"
          style={{ animation: 'blob 16s ease-in-out infinite', animationDelay: '-8s' }}
        />
      </div>
      <div className="absolute inset-0 pointer-events-none glow-bg" />
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <header className="flex items-center justify-between px-6 md:px-10 py-5">
          <div className="bg-[#2A0E55] rounded-xl px-4 py-2.5 shadow-md flex items-center justify-center">
            <span className="text-white font-extrabold text-xl tracking-tight relative flex items-baseline">
              kapr
              <span className="relative inline-flex flex-col items-center justify-center mx-[1px]">
                u
                <svg width="12" height="6" viewBox="0 0 12 6" fill="none" className="absolute -bottom-1.5 text-[#FF9800]">
                  <path d="M1 1C1 1 3.5 5 6 5C8.5 5 11 1 11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </span>
              ka
            </span>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 border border-gray-200 bg-white rounded-full px-5 py-2.5 text-sm font-semibold text-kapruka-dark hover:bg-gray-50 shadow-sm transition-transform hover:scale-105 active:scale-95"
          >
            <ShoppingBag size={18} /> Global Cart
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 bg-[#FF9800] text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm">
                {cartCount}
              </span>
            )}
          </button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-4xl md:text-[3.25rem] font-extrabold text-center leading-tight text-gradient max-w-3xl mb-10 drop-shadow-sm"
          >
            Sri Lanka's AI Shopping,
            <br />
            Delivery &amp; Services
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="w-full max-w-3xl glass-panel rounded-2xl shadow-glow-lg"
          >
            <PromptInput
              size="lg"
              autoFocus
              placeholder='Type in English, தமிழ், සිංහල, or romanized…'
              onSubmit={handleStart}
              onVoiceBlob={(blob) => {
                const id = createConversation();
                navigate(`/c/${id}`);
                sendVoiceMessage(id, blob);
              }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
            className="mt-6 flex flex-wrap items-center justify-center gap-2.5"
          >
            {EXAMPLE_PROMPTS.map((p, i) => (
              <motion.button
                key={p}
                onClick={() => handleStart(p)}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: i * 0.04 }}
                className="rounded-full border border-violet-100 bg-white/70 px-4 py-2 text-sm font-medium text-gray-600 shadow-sm backdrop-blur transition-colors hover:border-violet-300 hover:text-violet-700"
              >
                {p}
              </motion.button>
            ))}
          </motion.div>
        </main>
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};
