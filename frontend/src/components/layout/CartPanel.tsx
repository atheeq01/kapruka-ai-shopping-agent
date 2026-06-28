import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, ArrowLeft, Lock, Package, ChevronDown, Check } from 'lucide-react';
import { useAppStore } from '../../store/cartStore';
import { CheckoutFields } from '../shop/CheckoutFields';
import { useCheckoutForm } from '../../lib/useCheckoutForm';

interface CartPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
}

type Step = 'cart' | 'checkout';

const CheckBox: React.FC<{ checked: boolean; onChange: () => void; label?: string }> = ({
  checked, onChange, label,
}) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all active:scale-90 ${
      checked
        ? 'border-pink-500 bg-gradient-to-br from-pink-500 to-fuchsia-500 text-white shadow-sm'
        : 'border-gray-300 bg-white text-transparent hover:border-pink-400'
    }`}
  >
    <Check size={13} strokeWidth={3} />
  </button>
);

export const CartPanel: React.FC<CartPanelProps> = ({ isOpen, onClose, conversationId }) => {
  const cart          = useAppStore((s) => s.cart);
  const removeFromCart= useAppStore((s) => s.removeFromCart);
  const updateQuantity= useAppStore((s) => s.updateQuantity);

  const [step, setStep]           = useState<Step>('cart');
  const [summaryOpen, setSummaryOpen] = useState(false);
  // Track *deselected* ids (default: everything selected). This way a newly
  // added cart item is automatically included without any reconcile guesswork.
  const [deselectedIds, setDeselectedIds] = useState<Set<string>>(() => new Set());

  // Prune ids that have left the cart so they don't linger in the deselected set.
  useEffect(() => {
    setDeselectedIds((prev) => {
      if (prev.size === 0) return prev;
      const cartIds = new Set(cart.map((i) => i.product_id));
      const next = new Set([...prev].filter((id) => cartIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [cart]);

  const isSelected = (id: string) => !deselectedIds.has(id);
  const selectedCart = useMemo(
    () => cart.filter((i) => !deselectedIds.has(i.product_id)),
    [cart, deselectedIds],
  );
  const selectedCount = selectedCart.length;
  const allSelected = cart.length > 0 && deselectedIds.size === 0;

  const toggleItem = (id: string) =>
    setDeselectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setDeselectedIds(allSelected ? new Set(cart.map((i) => i.product_id)) : new Set());

  const resetAndClose = () => { setStep('cart'); onClose(); };

  // Shared checkout state/logic — identical to the in-chat InlineCheckout card.
  const checkout = useCheckoutForm({
    items: selectedCart,
    conversationId,
    onPlaced: resetAndClose,
  });
  const { totalAmount } = checkout;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="cart-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 460, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="h-full shrink-0 overflow-hidden border-l border-pink-100/50 z-30"
          style={{
            background: 'linear-gradient(160deg, #fff5fe 0%, #fce8ff 30%, #f3e8ff 60%, #fdf4ff 100%)',
          }}
        >
          {/* Inner fixed-width wrapper prevents reflow during animation */}
          <div className="w-[460px] h-full flex flex-col">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-pink-100/50 bg-white/50 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-2">
                {step === 'checkout' && (
                  <button
                    onClick={() => setStep('cart')}
                    className="p-1 rounded-full hover:bg-pink-50 text-gray-500 transition-colors"
                  >
                    <ArrowLeft size={15} />
                  </button>
                )}
                <h2 className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                  {step === 'cart'
                    ? <><ShoppingBag size={15} className="text-pink-500" /> Your Cart</>
                    : <><Package size={15} className="text-pink-500" /> Checkout</>
                  }
                </h2>
                {step === 'checkout' && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium ml-1">
                    <Lock size={9} /> Secure
                  </span>
                )}
              </div>
              <button
                onClick={resetAndClose}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-pink-50 hover:text-gray-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* ── CART STEP ── */}
            {step === 'cart' && (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center mt-16 text-center">
                      <div className="w-14 h-14 rounded-full bg-pink-50 flex items-center justify-center mb-3">
                        <ShoppingBag size={24} className="text-pink-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">Your cart is empty</p>
                      <p className="text-xs text-gray-400 mt-1">Ask me to find something!</p>
                    </div>
                  ) : (
                    <>
                      {/* Select-all bar */}
                      <div className="flex items-center justify-between px-1 pb-1">
                        <button
                          type="button"
                          onClick={toggleAll}
                          className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-pink-500 transition-colors"
                        >
                          <CheckBox checked={allSelected} onChange={toggleAll} label="Select all items" />
                          {allSelected ? 'Deselect all' : 'Select all'}
                        </button>
                        <span className="text-[11px] font-medium text-gray-400">
                          {selectedCount} of {cart.length} selected
                        </span>
                      </div>

                      {cart.map((item) => {
                        const checked = isSelected(item.product_id);
                        return (
                          <div
                            key={item.product_id}
                            className={`flex items-center gap-2.5 p-2.5 rounded-2xl border shadow-sm transition-colors ${
                              checked ? 'bg-white/80 border-pink-200' : 'bg-white/40 border-pink-100/40'
                            }`}
                          >
                            <CheckBox
                              checked={checked}
                              onChange={() => toggleItem(item.product_id)}
                              label={`Select ${item.name ?? 'item'}`}
                            />
                            <div className={`w-14 h-14 bg-pink-50 rounded-xl shrink-0 overflow-hidden transition-opacity ${checked ? '' : 'opacity-50'}`}>
                              {item.image
                                ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center"><Package size={18} className="text-pink-300" /></div>
                              }
                            </div>
                            <div className={`flex-1 flex flex-col justify-between min-w-0 transition-opacity ${checked ? '' : 'opacity-50'}`}>
                              <div className="flex justify-between gap-1">
                                <p className="font-semibold text-xs line-clamp-2 text-gray-800">{item.name}</p>
                                <button onClick={() => removeFromCart(item.product_id)} className="text-gray-300 hover:text-pink-400 shrink-0 transition-colors">
                                  <X size={13} />
                                </button>
                              </div>
                              {item.icing_text && <p className="text-[10px] text-gray-400">Icing: "{item.icing_text}"</p>}
                              <div className="flex items-center justify-between mt-1">
                                <span className="font-bold text-pink-500 text-xs">Rs. {item.price?.toLocaleString()}</span>
                                <div className="flex items-center rounded-lg border border-pink-100 bg-white">
                                  <button onClick={() => updateQuantity(item.product_id, Math.max(1, item.quantity - 1))} className="px-1.5 py-0.5 hover:bg-pink-50 text-gray-500 rounded-l-lg transition-colors"><Minus size={11} /></button>
                                  <span className="px-2 text-xs font-semibold text-gray-700">{item.quantity}</span>
                                  <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="px-1.5 py-0.5 hover:bg-pink-50 text-gray-500 rounded-r-lg transition-colors"><Plus size={11} /></button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="px-4 py-3 border-t border-pink-100/50 bg-white/50 shrink-0">
                    <div className="flex justify-between items-center mb-2.5 text-sm">
                      <span className="text-gray-500">Subtotal ({selectedCount} item{selectedCount !== 1 ? 's' : ''})</span>
                      <span className="font-bold text-gray-800">Rs. {totalAmount.toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => setStep('checkout')}
                      disabled={selectedCount === 0}
                      className="w-full text-white py-2.5 rounded-2xl font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:scale-100"
                      style={{ background: 'linear-gradient(135deg, #ff3fa1, #ff007c)' }}
                    >
                      {selectedCount === 0 ? 'Select items to checkout' : `Checkout ${selectedCount} item${selectedCount !== 1 ? 's' : ''} →`}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── CHECKOUT STEP ── */}
            {step === 'checkout' && (
              <>
                {/* Mini order summary accordion */}
                <div className="mx-5 mt-3 mb-1 border border-pink-100 rounded-xl overflow-hidden bg-white/60 shrink-0">
                  <button
                    onClick={() => setSummaryOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-gray-600"
                  >
                    <span>{selectedCount} item{selectedCount !== 1 ? 's' : ''} — <span className="text-pink-500">Rs. {totalAmount.toLocaleString()}</span></span>
                    <ChevronDown size={13} className={`transition-transform duration-200 ${summaryOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {summaryOpen && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-2.5 space-y-2 border-t border-pink-100/50">
                          {selectedCart.map((item) => (
                            <div key={item.product_id} className="flex items-center gap-2 pt-2">
                              <div className="w-8 h-8 rounded-lg bg-pink-50 shrink-0 overflow-hidden">
                                {item.image
                                  ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                  : <Package size={12} className="text-pink-300 m-auto" />
                                }
                              </div>
                              <p className="flex-1 text-xs text-gray-700 truncate">{item.name} × {item.quantity}</p>
                              <p className="text-xs font-semibold text-gray-600 shrink-0">Rs. {((item.price ?? 0) * item.quantity).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Scrollable form */}
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-5">
                  <CheckoutFields checkout={checkout} />

                  {/* Totals */}
                  <div className="border-t border-pink-100/60 pt-3 space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Subtotal</span><span>Rs. {totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Delivery</span><span>On order</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5">
                      <span className="text-sm font-bold text-gray-800">Total</span>
                      <span className="font-extrabold text-pink-500">Rs. {totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Sticky place order button */}
                <div className="px-5 pb-5 pt-3 bg-white/50 border-t border-pink-100/50 shrink-0">
                  <button
                    onClick={checkout.placeOrder}
                    disabled={checkout.isSubmitting}
                    className="w-full text-white py-2.5 rounded-2xl font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #ff3fa1, #ff007c)' }}
                  >
                    {checkout.isSubmitting ? 'Processing…' : 'Place Order via Chat →'}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
