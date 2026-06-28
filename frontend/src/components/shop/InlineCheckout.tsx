import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Lock, CheckCircle2 } from 'lucide-react';
import type { CartItem } from '../../store/cartStore';
import { CheckoutFields } from './CheckoutFields';
import { useCheckoutForm } from '../../lib/useCheckoutForm';

interface Props {
  /** Items to check out — captured from the cart when the form was shown. */
  items: CartItem[];
  conversationId: string;
}

/**
 * The in-chat checkout form. Mirrors the sidebar `CartPanel` checkout step —
 * same dropdowns, Google-Maps address search and map pin — but rendered inline
 * inside a chat bubble so the customer never has to spell the address out in
 * plain text. The agent surfaces it by calling the `show_checkout_form` tool.
 */
export const InlineCheckout: React.FC<Props> = ({ items, conversationId }) => {
  const [placed, setPlaced] = useState(false);
  const checkout = useCheckoutForm({
    items,
    conversationId,
    onPlaced: () => setPlaced(true),
  });
  const { totalAmount } = checkout;

  if (placed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-3 flex items-center gap-2.5 rounded-2xl border border-green-200 bg-green-50/70 px-4 py-3"
      >
        <CheckCircle2 size={18} className="shrink-0 text-green-600" />
        <p className="text-sm font-medium text-gray-700">
          Sending your order details to Kapruka… your confirmation will appear below.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="my-3 w-full max-w-[440px] overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-pink-100/60 bg-gradient-to-r from-pink-50 to-fuchsia-50/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Package size={15} className="text-pink-500" />
          <span className="text-sm font-semibold text-kapruka-dark">Complete your delivery details</span>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400">
          <Lock size={9} /> Secure
        </span>
      </div>

      {/* Items being ordered */}
      {items.length > 0 && (
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
          <ul className="space-y-1.5">
            {items.map((it) => (
              <li key={it.product_id} className="flex items-center gap-2">
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-pink-50">
                  {it.image
                    ? <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                    : <Package size={12} className="m-auto mt-2 text-pink-300" />}
                </div>
                <p className="flex-1 truncate text-xs text-gray-700">{it.name} × {it.quantity}</p>
                <p className="shrink-0 text-xs font-semibold text-gray-600">
                  Rs. {((it.price ?? 0) * it.quantity).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Form */}
      <div className="space-y-5 px-4 py-4">
        <CheckoutFields checkout={checkout} />

        {/* Total */}
        <div className="flex items-center justify-between border-t border-pink-100/60 pt-3">
          <span className="text-sm font-bold text-gray-800">Total</span>
          <span className="font-extrabold text-pink-500">Rs. {totalAmount.toLocaleString()}</span>
        </div>

        <button
          onClick={checkout.placeOrder}
          disabled={checkout.isSubmitting}
          className="w-full rounded-2xl py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #ff3fa1, #ff007c)' }}
        >
          {checkout.isSubmitting ? 'Processing…' : 'Place Order →'}
        </button>
      </div>
    </motion.div>
  );
};
