import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquarePlus, Sparkles, LayoutGrid, Clock, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../../store/cartStore';
import { sendAgentMessage } from '../../lib/agentStream';
import { fetchCategories, type Category } from '../../lib/api';
import { cn } from '../../lib/utils';

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

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { id: activeId } = useParams();

  const conversations = useAppStore((s) => s.conversations);
  const conversationOrder = useAppStore((s) => s.conversationOrder);
  const deleteConversation = useAppStore((s) => s.deleteConversation);
  const createConversation = useAppStore((s) => s.createConversation);
  const list = conversationOrder.map((cid) => conversations[cid]).filter(Boolean);

  const [expanded, setExpanded] = useState<'history' | 'suggestions' | 'categories' | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catsLoading, setCatsLoading] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

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

  const handleToggle = (panel: 'history' | 'suggestions' | 'categories') => {
    const next = expanded === panel ? null : panel;
    setExpanded(next);
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
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-50 md:hidden backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, { offset, velocity }) => {
              if (offset.x < -50 || velocity.x < -500) {
                onClose();
              }
            }}
            className="fixed top-0 left-0 bottom-0 w-[85%] max-w-sm bg-white z-[60] md:hidden shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl shrink-0 flex flex-col items-center justify-center gap-[2px] shadow-md"
                  style={{ background: 'linear-gradient(135deg, #2A0E55 0%, #4a148c 100%)' }}
                >
                  <span className="text-white font-extrabold text-sm leading-none select-none">K</span>
                  <svg width="13" height="5" viewBox="0 0 12 6" fill="none">
                    <path d="M1 1C1 1 3.5 5 6 5C8.5 5 11 1 11 1" stroke="#FF9800" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </div>
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
              </div>
              <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600" onPointerDownCapture={(e) => e.stopPropagation()}>
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1" onPointerDownCapture={(e) => e.stopPropagation()}>
              <MenuItem 
                icon={<MessageSquarePlus size={20} />} 
                label="New Chat" 
                onClick={() => { navigate('/'); onClose(); }} 
              />
              
              <MenuItem 
                icon={<Clock size={20} />} 
                label="Recent Chats" 
                onClick={() => handleToggle('history')} 
                isExpanded={expanded === 'history'}
              />
              <AnimatePresence initial={false}>
                {expanded === 'history' && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="pl-12 pr-2 py-2 space-y-1">
                      {list.length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">No recent chats</p>
                      ) : (
                        list.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => { navigate(`/c/${c.id}`); onClose(); }}
                            className={cn(
                              'group flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer text-sm transition-colors',
                              c.id === activeId ? 'bg-pink-50 text-pink-600 font-semibold' : 'text-gray-600 hover:bg-gray-50',
                            )}
                          >
                            <span className="truncate pr-1 leading-snug">{c.title}</span>
                            <button
                              onClick={(e) => handleDelete(e, c.id)}
                              className="text-gray-300 hover:text-red-400 shrink-0 transition-all ml-1 p-1"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <MenuItem 
                icon={<Sparkles size={20} />} 
                label="AI Suggestions" 
                onClick={() => handleToggle('suggestions')} 
                isExpanded={expanded === 'suggestions'}
              />
              <AnimatePresence initial={false}>
                {expanded === 'suggestions' && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="pl-12 pr-2 py-2 space-y-1">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => startChat(s.label)}
                          className="w-full text-left flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm text-gray-600 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                        >
                          <span className="shrink-0 leading-snug">{s.emoji}</span>
                          <span className="leading-snug">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <MenuItem 
                icon={<LayoutGrid size={20} />} 
                label="Shop by Category" 
                onClick={() => handleToggle('categories')} 
                isExpanded={expanded === 'categories'}
              />
              <AnimatePresence initial={false}>
                {expanded === 'categories' && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="pl-12 pr-2 py-2 space-y-1">
                      {catsLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 size={18} className="animate-spin text-pink-400" />
                        </div>
                      ) : (
                        categories.map((cat) => (
                          <button
                            key={cat.name}
                            onClick={() => startChat(`Show me ${cat.name} products`)}
                            className="w-full text-left flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-600 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                          >
                            {cat.emoji
                              ? <span className="shrink-0">{cat.emoji}</span>
                              : <span className="w-4 h-4 rounded-full bg-pink-100 shrink-0" />
                            }
                            <span className="leading-snug truncate">{cat.name}</span>
                            {cat.count ? <span className="ml-auto text-xs text-gray-400 shrink-0">{cat.count}</span> : null}
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const MenuItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  onClick?: () => void; 
  isExpanded?: boolean;
}> = ({ icon, label, onClick, isExpanded }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-4 px-3 py-3.5 rounded-xl transition-colors text-gray-700",
      isExpanded !== undefined && isExpanded ? "bg-pink-50/50 text-pink-600 font-semibold" : "hover:bg-gray-50"
    )}
  >
    <div className={isExpanded ? "text-pink-500" : "text-gray-400"}>{icon}</div>
    <span className="font-medium flex-1 text-left">{label}</span>
    {isExpanded !== undefined && (
      <div className={isExpanded ? "text-pink-500" : "text-gray-400"}>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
    )}
  </button>
);
