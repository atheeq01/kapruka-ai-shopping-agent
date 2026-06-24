import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { History, PanelLeft, SquarePen, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/cartStore';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const { id: activeId } = useParams();

  const conversations = useAppStore((s) => s.conversations);
  const conversationOrder = useAppStore((s) => s.conversationOrder);
  const deleteConversation = useAppStore((s) => s.deleteConversation);

  const list = conversationOrder.map((cid) => conversations[cid]).filter(Boolean);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversation(id);
    if (id === activeId) navigate('/');
  };

  return (
    <>
      {/* Mobile overlay */}
      {expanded && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setExpanded(false)}
        />
      )}
      <aside
        className={cn(
          'flex flex-col h-full bg-white border-r border-gray-100 shrink-0 transition-all duration-200 z-50',
          expanded ? 'w-64 absolute md:relative shadow-xl md:shadow-none' : 'w-16',
        )}
      >
      <div className="flex items-center px-3 py-4">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-2 rounded-lg hover:bg-gray-50 text-gray-500"
          title="Toggle sidebar"
        >
          <PanelLeft size={18} />
        </button>
      </div>

      <button
        onClick={() => navigate('/')}
        className={cn(
          'flex items-center gap-2 mx-2 mb-1 rounded-lg hover:bg-gray-50 transition-colors',
          expanded ? 'px-3 py-2 justify-start' : 'p-2.5 justify-center',
          !activeId ? 'text-kapruka-orange' : 'text-gray-700',
        )}
        title="New chat"
      >
        <SquarePen size={18} />
        {expanded && <span className="text-sm font-medium">New chat</span>}
      </button>

      <button
        onClick={() => setExpanded(true)}
        className={cn(
          'flex items-center gap-2 mx-2 mb-2 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors',
          expanded ? 'px-3 py-2 justify-start' : 'p-2.5 justify-center',
        )}
        title="History"
      >
        <History size={18} />
        {expanded && <span className="text-sm font-medium">History</span>}
      </button>

      {expanded ? (
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {list.length === 0 && (
            <p className="text-xs text-gray-400 px-2 py-4 text-center">No conversations yet</p>
          )}
          {list.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/c/${c.id}`)}
              className={cn(
                'group flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer text-sm',
                c.id === activeId
                  ? 'bg-orange-50 text-kapruka-orange font-medium'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <span className="truncate">{c.title}</span>
              <button
                onClick={(e) => handleDelete(e, c.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 shrink-0 ml-2"
                title="Delete conversation"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1" />
      )}

    </aside>
    </>
  );
};
