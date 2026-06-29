import React from 'react';
import { motion } from 'framer-motion';
import { Package, ArrowRight, ShoppingBag } from 'lucide-react';
import { useAppStore, type CartItem } from '../../store/cartStore';

interface Props {
  /** Items to check out — snapshot captured when the form was requested. */
  items: CartItem[];
  conversationId: string;
}

/**
 * Compact in-chat checkout card (Bug 2). Instead of mounting the whole delivery
 * form inline (which pushed the conversation far down and duplicated the drawer
 * form), this shows a small order summary and a single primary button that opens
 * the ONE checkout surface — the cart drawer on desktop, a bottom sheet on
 * mobile — straight at its checkout step.
 */
export const InlineCheckout: React.FC<Props> = ({ items }) => {
  const openCart = useAppStore((s) => s.openCart);
  const itemCount = items.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const total = items.reduce((acc, i) => acc + (i.price ?? 0) * i.quantity, 0);
  const preview = items.slice(0, 3);
  const extra = items.length - preview.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="my-3 w-full max-w-[420px] overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm"
    >
      <div className="flex items-center gap-2 border-b border-pink-100/60 bg-gradient-to-r from-primary-50 to-fuchsia-50/40 px-4 py-2.5">
        <Package size={15} className="text-primary-500" />
        <span className="text-sm font-semibold text-kapruka-dark">Ready to check out</span>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          {/* Stacked thumbnails */}
          <div className="flex -space-x-2 shrink-0">
            {preview.map((it) => (
              <div
                key={it.product_id}
                className="h-9 w-9 overflow-hidden rounded-lg border-2 border-white bg-pink-50 shadow-sm"
              >
                {it.image
                  ? <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                  : <Package size={14} className="m-auto mt-2 text-pink-300" />}
              </div>
            ))}
            {extra > 0 && (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-white bg-pink-100 text-[11px] font-bold text-primary-600 shadow-sm">
                +{extra}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500">
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </p>
            <p className="text-sm font-bold text-gray-800">Rs. {total.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={() => openCart('checkout')}
          className="btn-primary flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-1"
        >
          <ShoppingBag size={15} />
          Complete delivery details
          <ArrowRight size={15} />
        </button>
      </div>
    </motion.div>
  );
};
