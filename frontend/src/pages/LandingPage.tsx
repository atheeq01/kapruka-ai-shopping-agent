import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sidebar } from '../components/layout/Sidebar';
import { CartPanel } from '../components/layout/CartPanel';
import { PromptInput } from '../components/chat/PromptInput';
import { useAppStore } from '../store/cartStore';
import { sendAgentMessage, sendVoiceMessage } from '../lib/agentStream';
import { LanguageToggle } from '../components/ui/LanguageToggle';
import { MobileDrawer } from '../components/layout/MobileDrawer';
import { Menu } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Flowers for her', icon: '💐' },
  { label: 'Birthday Cakes',  icon: '🎂' },
  { label: 'Gift Ideas',      icon: '🎁' },
  { label: 'Fast Delivery',   icon: '🚚' },
];

// Sinhala example prompts — shown alongside the English chips so the app's
// Sinhala fluency is obvious within seconds of opening it. Each sends a real
// query through the same agent pipeline.
const SINHALA_ACTIONS = [
  { label: 'අම්මාට මල් කලඹක්', icon: '🌸', send: 'අම්මාට ලස්සන මල් කලඹක් ඕනේ' },
  { label: 'උපන්දිනෙට කේක් 3000ට අඩුවෙන්', icon: '🎂', send: 'උපන්දිනයකට කේක් එකක් ඕනේ, රුපියල් 3000ට අඩුවෙන්' },
  { label: 'පෙම්වතියට තෑග්ගක්', icon: '💝', send: 'මගේ පෙම්වතියට ලස්සන තෑග්ගක් ඕනේ 5000ට අඩුවෙන්' },
];

/** Large animated K hero mark */
const KaprukaBrandMark: React.FC = () => (
  <div className="relative flex flex-col items-center">
    {/* Ambient glow behind the mark */}
    <div
      className="absolute inset-0 rounded-[60px] blur-3xl opacity-30 pointer-events-none"
      style={{ background: 'radial-gradient(circle, #c026d3 0%, #7c3aed 50%, transparent 100%)' }}
    />

    {/* Floating K tile */}
    <motion.div
      animate={{ y: [0, -14, 0] }}
      transition={{ duration: 4.5, ease: 'easeInOut', repeat: Infinity }}
      className="relative w-44 h-44 md:w-52 md:h-52 rounded-[44px] flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(145deg, #2A0E55 0%, #4a148c 40%, #6a1b9a 70%, #3d0d6b 100%)',
        boxShadow:
          '0 32px 80px rgba(106,27,154,0.55), 0 12px 32px rgba(42,14,85,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
      }}
    >
      {/* Shine streak */}
      <div
        className="absolute top-4 left-6 w-8 h-20 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, white, transparent)', transform: 'rotate(-20deg)' }}
      />

      <span
        className="text-white font-extrabold leading-none select-none"
        style={{ fontSize: '5.5rem', letterSpacing: '-6px', fontFamily: 'Inter, sans-serif' }}
      >
        K
      </span>
      <svg width="56" height="14" viewBox="0 0 56 14" fill="none" className="mt-1">
        <path d="M3 3C3 3 15 11 28 11C41 11 53 3 53 3" stroke="#FF9800" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </motion.div>

    {/* Soft reflection */}
    <div
      className="w-32 h-6 mt-3 rounded-full blur-xl opacity-25 pointer-events-none"
      style={{ background: 'radial-gradient(ellipse, #a855f7 0%, #ec4899 50%, transparent 80%)' }}
    />
  </div>
);

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const createConversation = useAppStore((s) => s.createConversation);
  const cartCount = useAppStore((s) => s.cart.reduce((acc, i) => acc + i.quantity, 0));
  const isCartOpen = useAppStore((s) => s.cartOpen);
  const openCart = useAppStore((s) => s.openCart);
  const closeCart = useAppStore((s) => s.closeCart);

  const handleStart = (text: string) => {
    const id = createConversation();
    navigate(`/c/${id}`);
    sendAgentMessage(id, text);
  };

  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-app relative">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-24 h-[520px] w-[520px] rounded-full bg-pink-300/15 blur-3xl animate-blob" />
        <div
          className="absolute top-1/2 -right-32 h-[460px] w-[460px] rounded-full bg-violet-300/15 blur-3xl animate-blob"
          style={{ animationDelay: '-6s' }}
        />
        <div
          className="absolute -bottom-40 left-1/3 h-[420px] w-[420px] rounded-full bg-fuchsia-200/15 blur-3xl animate-blob"
          style={{ animationDelay: '-12s' }}
        />
      </div>
      <div className="absolute inset-0 pointer-events-none glow-bg" />

      {/* Sidebar - Desktop/Tablet Only */}
      <div className="hidden md:flex h-full">
        <Sidebar />
      </div>

      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-10 py-4">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="md:hidden w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors shrink-0"
          >
            <Menu size={22} />
          </button>
          
          <div className="flex items-center gap-3 ml-auto">
            {/* Language toggle (Sinhala visible up front) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <LanguageToggle />
            </motion.div>
            {/* Cart button */}
            <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => (isCartOpen ? closeCart() : openCart('cart'))}
            className="relative flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-white/90 rounded-full px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-white hover:shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <ShoppingBag size={15} />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                {cartCount}
              </span>
            )}
          </motion.button>
          </div>
        </header>

        {/* Hero */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 -mt-4 overflow-y-auto pb-[env(safe-area-inset-bottom)] sm:pb-0">

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-[2.6rem] font-medium leading-snug text-gray-400 max-w-xl">
              Your Intelligent
              <br />
              <strong className="font-extrabold text-gray-800">Shopping Assistant</strong>
            </h1>
            <p className="mt-3 text-base md:text-lg text-gray-400">
              <span className="md:text-2xl">Speak or type to discover</span>
              <br />
              with island-wide delivery.
            </p>
          </motion.div>

          {/* K brand mark (replaces orb) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.85, delay: 0.1, ease: [0.23, 1.02, 0.32, 1] }}
            className="mb-8"
          >
            <KaprukaBrandMark />
          </motion.div>

          {/* Quick-action chips */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="hidden md:flex min-h-[700px]:flex flex-wrap items-center justify-center gap-2 mb-5"
          >
            {QUICK_ACTIONS.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.36 + i * 0.07 }}
                onClick={() => handleStart(action.label)}
                className="chip"
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </motion.button>
            ))}
          </motion.div>

          {/* Sinhala example chips — show off සිංහල fluency immediately */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="hidden md:flex min-h-[700px]:flex flex-wrap items-center justify-center gap-2 mb-6"
          >
            <span className="text-[11px] font-semibold text-violet-400 self-center mr-0.5">සිංහලෙන්:</span>
            {SINHALA_ACTIONS.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.56 + i * 0.07 }}
                onClick={() => handleStart(action.send)}
                className="chip border-violet-200/70 bg-violet-50/60 text-violet-700 hover:bg-violet-100/70"
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </motion.button>
            ))}
          </motion.div>

          {/* Input */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="w-full max-w-2xl"
          >
            <PromptInput
              size="lg"
              autoFocus
              placeholder="Ask Kapruka ..."
              onSubmit={handleStart}
              onVoiceBlob={(blob) => {
                const id = createConversation();
                navigate(`/c/${id}`);
                sendVoiceMessage(id, blob);
              }}
            />
          </motion.div>
        </main>
      </div>

      {/* Inline cart panel (no overlay) */}
      <CartPanel />
    </div>
  );
};
