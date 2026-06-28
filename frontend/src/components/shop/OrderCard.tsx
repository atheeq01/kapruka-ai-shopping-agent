import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, ChevronDown, ChevronUp, MapPin, Calendar, User } from 'lucide-react';

export interface OrderData {
  order_number?: string;
  status?: string;
  delivery_date?: string;
  recipient?: string;
  items?: string[];
  tracking?: string;
  raw?: string;
}

interface OrderCardProps {
  order: OrderData;
}

const STATUS_COLORS: Record<string, string> = {
  delivered:   'bg-green-100 text-green-700',
  processing:  'bg-yellow-100 text-yellow-700',
  shipped:     'bg-blue-100 text-blue-700',
  confirmed:   'bg-violet-100 text-violet-700',
  cancelled:   'bg-red-100 text-red-700',
  pending:     'bg-gray-100 text-gray-600',
};

function statusColor(status?: string): string {
  if (!status) return STATUS_COLORS.pending;
  const s = status.toLowerCase();
  for (const [key, cls] of Object.entries(STATUS_COLORS)) {
    if (s.includes(key)) return cls;
  }
  return STATUS_COLORS.pending;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="my-3 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-50/60 to-transparent border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Package size={15} className="text-violet-600 shrink-0" />
          <span className="text-sm font-semibold text-kapruka-dark">
            {order.order_number ? `Order #${order.order_number}` : 'Order Tracking'}
          </span>
        </div>
        {order.status && (
          <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${statusColor(order.status)}`}>
            {order.status}
          </span>
        )}
      </div>

      {/* Key details */}
      <div className="px-4 py-3 grid grid-cols-2 gap-3">
        {order.recipient && (
          <div className="flex items-start gap-2">
            <User size={13} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Recipient</p>
              <p className="text-sm text-kapruka-dark">{order.recipient}</p>
            </div>
          </div>
        )}
        {order.delivery_date && (
          <div className="flex items-start gap-2">
            <Calendar size={13} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Delivery Date</p>
              <p className="text-sm text-kapruka-dark">{order.delivery_date}</p>
            </div>
          </div>
        )}
        {order.tracking && (
          <div className="flex items-start gap-2 col-span-2">
            <MapPin size={13} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Tracking</p>
              <p className="text-sm text-kapruka-dark">{order.tracking}</p>
            </div>
          </div>
        )}
      </div>

      {/* Ordered items */}
      {order.items && order.items.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1.5">Items</p>
          <ul className="space-y-1">
            {order.items.map((item, i) => (
              <li key={i} className="text-sm text-kapruka-dark flex items-start gap-1.5">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Raw details toggle */}
      {order.raw && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 py-2 border-t border-gray-100 transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Hide details' : 'Show full details'}
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <pre className="text-[11px] text-gray-500 px-4 pb-4 whitespace-pre-wrap leading-relaxed font-mono">
                  {order.raw}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
};
