import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SquarePen, Clock, Sparkles, Tag, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/cartStore';
import { sendAgentMessage } from '../../lib/agentStream';
import { fetchCategories, type Category } from '../../lib/api';

const SUGGESTIONS = [
  { emoji: '🌸', label: 'Flowers for my girlfriend' },
  { emoji: '🎂', label: 'Birthday cakes under Rs. 3,000' },
  { emoji: '💝', label: 'Best anniversary gifts' },
  { emoji: '🎁', label: 'Personalised gift ideas' },
  { emoji: '🚀', label: 'What can be delivered today?' },
  { emoji: '💐', label: 'Sympathy flower arrangements' },
  { emoji: '🍫', label: 'Chocolate gift boxes' },
  { emoji: '🧸', label: 'Gifts for kids under 5' },
];

type Panel = 'history' | 'suggestions' | 'categories' | null;

export const Sidebar: React.FC<{ onPanelChange?: (isOpen: boolean) => void }> = ({ onPanelChange }) => {
  const navigate = useNavigate();
  const { id: activeId } = useParams();
  const sidebarRef = useRef<HTMLElement>(null);

  const [panel, setPanel] = useState<Panel>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catsLoading, setCatsLoading] = useState(false);

  useEffect(() => {
    onPanelChange?.(panel !== null);
  }, [panel, onPanelChange]);

  const conversations     = useAppStore((s) => s.conversations);
  const conversationOrder = useAppStore((s) => s.conversationOrder);
  const deleteConversation  = useAppStore((s) => s.deleteConversation);
  const createConversation  = useAppStore((s) => s.createConversation);
  const list = conversationOrder.map((cid) => conversations[cid]).filter(Boolean);

  // Close on outside click
  useEffect(() => {
    if (!panel) return;
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setPanel(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panel]);

  const togglePanel = (p: Panel) => setPanel((v) => (v === p ? null : p));

  const loadCategories = useCallback(async () => {
    if (categories.length > 0) return;
    setCatsLoading(true);
    try {
      const cats = await fetchCategories();
      setCategories(cats);
    } finally {
      setCatsLoading(false);
    }
  }, [categories.length]);

  const handleCategoriesClick = () => {
    const next: Panel = panel === 'categories' ? null : 'categories';
    setPanel(next);
    if (next === 'categories') loadCategories();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversation(id);
    if (id === activeId) navigate('/');
  };

  const startChat = (text: string) => {
    const id = createConversation();
    navigate(`/c/${id}`);
    sendAgentMessage(id, text);
    setPanel(null);
  };

  return (
    <aside
      ref={sidebarRef}
      className="relative flex flex-col h-full glass-sidebar shrink-0 z-50 overflow-hidden"
    >
      {/* ── Logo header (spans full sidebar width) ── */}
      <button
        onClick={() => { navigate('/'); setPanel(null); }}
        title="Home"
        className="flex items-center gap-2.5 px-3 h-[58px] shrink-0 border-b border-white/30 hover:bg-white/30 transition-colors overflow-hidden"
      >
        {/* K mark icon */}
        <div
          className="w-9 h-9 rounded-xl shrink-0 flex flex-col items-center justify-center gap-[2px] shadow-md"
          style={{ background: 'linear-gradient(135deg, #2A0E55 0%, #4a148c 100%)' }}
        >
          <span className="text-white font-extrabold text-sm leading-none select-none">K</span>
          <svg width="13" height="5" viewBox="0 0 12 6" fill="none">
            <path d="M1 1C1 1 3.5 5 6 5C8.5 5 11 1 11 1" stroke="#FF9800" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Full "kapruka" wordmark slides in when panel is open */}
        <AnimatePresence>
          {panel && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut', delay: 0.06 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <span
                className="relative flex items-baseline gap-0 font-extrabold tracking-tight select-none"
                style={{ fontSize: '1.05rem', color: '#2A0E55', lineHeight: 1 }}
              >
                kapr
                <span className="relative inline-flex flex-col items-center mx-[0.5px]">
                  <span>u</span>
                  <svg
                    width="9" height="4" viewBox="0 0 12 6" fill="none"
                    className="absolute"
                    style={{ bottom: '-5px' }}
                  >
                    <path d="M1 1C1 1 3.5 5 6 5C8.5 5 11 1 11 1" stroke="#FF9800" strokeWidth="2.4" strokeLinecap="round" />
                  </svg>
                </span>
                ka
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* ── Body: icon strip + expandable panel ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Icon strip (always 62px) */}
        <div className="flex flex-col items-center w-[62px] shrink-0 h-full py-3 gap-1 border-r border-white/30">

          {/* New chat */}
          <SidebarIcon
            icon={<SquarePen size={17} />}
            active={!activeId && panel === null}
            onClick={() => { navigate('/'); setPanel(null); }}
            title="New chat"
          />

          {/* History */}
          <SidebarIcon
            icon={<Clock size={17} />}
            active={panel === 'history'}
            onClick={() => togglePanel('history')}
            title="Chat history"
          />

          {/* AI Suggestions */}
          <SidebarIcon
            icon={<Sparkles size={17} />}
            active={panel === 'suggestions'}
            onClick={() => togglePanel('suggestions')}
            title="AI suggestions"
          />

          {/* Categories */}
          <SidebarIcon
            icon={<Tag size={17} />}
            active={panel === 'categories'}
            onClick={handleCategoriesClick}
            title="Shop by category"
          />

          <div className="flex-1" />
        </div>

        {/* Expandable panel */}
        <AnimatePresence>
          {panel && (
            <motion.div
              key={panel}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 204, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="h-full overflow-hidden"
            >
              <div className="w-[204px] h-full flex flex-col py-3 overflow-hidden">

                {/* Panel title */}
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 pb-2 shrink-0">
                  {panel === 'history'     && 'Recent Chats'}
                  {panel === 'suggestions' && 'Quick Suggestions'}
                  {panel === 'categories'  && 'Shop by Category'}
                </p>

                {/* ── History ── */}
                {panel === 'history' && (
                  <div className="flex-1 overflow-y-auto px-2">
                    {list.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-8">No conversations yet</p>
                    ) : (
                      <div className="space-y-0.5">
                        {list.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => { navigate(`/c/${c.id}`); setPanel(null); }}
                            className={cn(
                              'group flex items-center justify-between rounded-xl px-2 py-2 cursor-pointer text-xs transition-colors',
                              c.id === activeId
                                ? 'bg-pink-50 text-pink-600 font-semibold'
                                : 'text-gray-600 hover:bg-white/60',
                            )}
                          >
                            <span className="truncate pr-1 leading-snug">{c.title}</span>
                            <button
                              onClick={(e) => handleDelete(e, c.id)}
                              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 shrink-0 transition-all ml-1"
                              title="Delete"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── AI Suggestions ── */}
                {panel === 'suggestions' && (
                  <div className="flex-1 overflow-y-auto px-2">
                    <div className="space-y-0.5">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => startChat(s.label)}
                          className="w-full text-left flex items-start gap-2 rounded-xl px-2 py-2 text-xs text-gray-600 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                        >
                          <span className="text-sm shrink-0 leading-snug">{s.emoji}</span>
                          <span className="leading-snug">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Categories ── */}
                {panel === 'categories' && (
                  <div className="flex-1 overflow-y-auto px-2">
                    {catsLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 size={18} className="animate-spin text-pink-400" />
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {categories.map((cat) => (
                          <button
                            key={cat.name}
                            onClick={() => startChat(`Show me ${cat.name} products`)}
                            className="w-full text-left flex items-center gap-2 rounded-xl px-2 py-2 text-xs text-gray-600 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                          >
                            {cat.emoji
                              ? <span className="text-sm shrink-0">{cat.emoji}</span>
                              : <span className="w-3.5 h-3.5 rounded-full bg-pink-100 shrink-0" />
                            }
                            <span className="leading-snug truncate">{cat.name}</span>
                            {cat.count ? <span className="ml-auto text-[10px] text-gray-300 shrink-0">{cat.count}</span> : null}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
};

const SidebarIcon: React.FC<{
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}> = ({ icon, active, onClick, title }) => (
  <button
    onClick={onClick}
    title={title}
    className={cn(
      'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
      active
        ? 'bg-white shadow-md text-pink-500 scale-105'
        : 'text-gray-400 hover:bg-white/80 hover:text-gray-600 hover:shadow-sm active:scale-95',
    )}
  >
    {icon}
  </button>
);
