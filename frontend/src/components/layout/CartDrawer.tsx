import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, ArrowLeft, Lock, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/cartStore';
import { sendAgentMessage, setPendingOrderItems } from '../../lib/agentStream';
import { SearchableSelect } from '../ui/SearchableSelect';
import { SRI_LANKA_CITIES, LOCATION_TYPES } from '../../lib/sriLankaCities';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
}

type Step = 'cart' | 'checkout';

const inputCls =
  'w-full border border-pink-100 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-pink-300/30 focus:border-pink-400 outline-none transition-colors bg-white/90';

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({
  label, required, children,
}) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-gray-600">
      {label}
      {required && <span className="text-pink-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">{children}</h3>
);

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, conversationId }) => {
  const navigate = useNavigate();
  const cart = useAppStore((s) => s.cart);
  const removeFromCart = useAppStore((s) => s.removeFromCart);
  const updateQuantity = useAppStore((s) => s.updateQuantity);
  const createConversation = useAppStore((s) => s.createConversation);

  const [step, setStep] = useState<Step>('cart');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [locationType, setLocationType] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [senderName, setSenderName] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(cart.map((i) => i.product_id)),
  );

  // Keep selectedIds in sync: auto-select new additions, drop removed items
  useEffect(() => {
    setSelectedIds((prev) => {
      const cartIdSet = new Set(cart.map((i) => i.product_id));
      const next = new Set([...prev].filter((id) => cartIdSet.has(id)));
      cart.forEach((i) => next.add(i.product_id));
      return next;
    });
  }, [cart]);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allChecked = cart.length > 0 && cart.every((i) => selectedIds.has(i.product_id));
  const toggleAll = () =>
    setSelectedIds(allChecked ? new Set() : new Set(cart.map((i) => i.product_id)));

  const selectedCartItems = cart.filter((i) => selectedIds.has(i.product_id));

  const todayISO = new Date().toISOString().slice(0, 10);
  const totalAmount = selectedCartItems.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);

  const resetAndClose = () => { setStep('cart'); onClose(); };

  const handlePlaceOrder = async () => {
    if (selectedCartItems.length === 0) {
      alert('Please select at least one item to order.');
      return;
    }
    if (!deliveryCity || !deliveryAddress || !deliveryDate || !recipientName || !recipientPhone) {
      alert('Please fill in all required fields (marked *).');
      return;
    }
    if (!anonymous && !senderName) {
      alert('Please enter your name, or tick "Send anonymously".');
      return;
    }
    const itemLines = selectedCartItems
      .map((i) =>
        `- ${i.name ?? i.product_id} (id: ${i.product_id}) × ${i.quantity}` +
        (i.icing_text ? ` — icing: "${i.icing_text}"` : ''),
      ).join('\n');

    const payload = `Please create an order for the following cart. Use exactly these details — do not change or omit any of them.

Items:
${itemLines}

Recipient name: ${recipientName}
Recipient phone: ${recipientPhone}
Delivery address: ${deliveryAddress}
Delivery city: ${deliveryCity}
Location type: ${locationType || 'Not specified'}
Delivery date: ${deliveryDate}
Special instructions: ${instructions.trim() || 'None'}
Sender name: ${anonymous ? `${senderName || 'N/A'} (show as Anonymous on the gift card)` : senderName}
Send anonymously: ${anonymous ? 'Yes' : 'No'}
Personal gift message: ${giftMessage.trim() || 'None'}`;

    setIsSubmitting(true);
    setPendingOrderItems(selectedCartItems.map((i) => i.product_id));
    const targetId = conversationId ?? createConversation();
    resetAndClose();
    if (!conversationId) navigate(`/c/${targetId}`);
    await sendAgentMessage(targetId, payload);
    setIsSubmitting(false);
    setStep('cart');
  };

  const drawerWidth = step === 'checkout' ? 'w-full max-w-[820px]' : 'w-full max-w-md';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className={`fixed right-0 top-0 h-full ${drawerWidth} z-50 flex flex-col transition-[max-width] duration-300`}
            style={{ background: 'linear-gradient(160deg, #fff5fe 0%, #fce8ff 30%, #f3e8ff 60%, #fdf4ff 100%)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-pink-100/60 shrink-0 bg-white/60 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                {step === 'checkout' && (
                  <button
                    onClick={() => setStep('cart')}
                    className="p-1.5 hover:bg-pink-50 rounded-full transition-colors text-gray-500"
                  >
                    <ArrowLeft size={17} />
                  </button>
                )}
                <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  {step === 'cart'
                    ? <><ShoppingBag size={17} className="text-pink-500" /> Your Cart</>
                    : <><Package size={17} className="text-pink-500" /> Checkout</>
                  }
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {step === 'checkout' && (
                  <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                    <Lock size={10} /> Secure
                  </span>
                )}
                <button
                  onClick={resetAndClose}
                  className="w-8 h-8 rounded-full hover:bg-pink-50 flex items-center justify-center text-gray-500 transition-colors"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* ── STEP 1: CART ── */}
            {step === 'cart' && (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {cart.length > 0 && (
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-500 font-semibold pb-2 border-b border-pink-100/60">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={toggleAll}
                        className="h-[15px] w-[15px] rounded border-pink-300 accent-pink-500 cursor-pointer"
                      />
                      {allChecked ? 'Deselect all' : `Select all (${cart.length})`}
                    </label>
                  )}
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center mt-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
                        <ShoppingBag size={28} className="text-pink-300" />
                      </div>
                      <p className="text-gray-500 font-medium">Your cart is empty</p>
                      <p className="text-sm text-gray-400 mt-1">Ask me to find products for you!</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.product_id}
                        className={`flex gap-3 p-3 bg-white/70 backdrop-blur-sm rounded-2xl border shadow-sm transition-opacity ${
                          selectedIds.has(item.product_id)
                            ? 'border-pink-100/50'
                            : 'border-gray-100/50 opacity-50'
                        }`}
                      >
                        <div className="flex items-center self-center shrink-0 pr-1">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.product_id)}
                            onChange={() => toggleSelect(item.product_id)}
                            className="h-[18px] w-[18px] rounded border-pink-300 accent-pink-500 cursor-pointer"
                          />
                        </div>
                        <div className="w-16 h-16 bg-pink-50 rounded-xl shrink-0 overflow-hidden">
                          {item.image
                            ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-pink-300" /></div>
                          }
                        </div>
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div className="flex justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm line-clamp-2 text-gray-800">{item.name}</p>
                              {item.icing_text && (
                                <p className="text-xs text-gray-400 mt-0.5">Icing: "{item.icing_text}"</p>
                              )}
                            </div>
                            <button
                              onClick={() => removeFromCart(item.product_id)}
                              className="text-gray-300 hover:text-pink-400 shrink-0 transition-colors mt-0.5"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-pink-500 text-sm">
                              Rs. {item.price?.toLocaleString()}
                            </span>
                            <div className="flex items-center rounded-xl border border-pink-100 bg-white">
                              <button
                                onClick={() => updateQuantity(item.product_id, Math.max(1, item.quantity - 1))}
                                className="px-2 py-1 hover:bg-pink-50 text-gray-500 rounded-l-xl transition-colors"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="px-3 text-sm font-semibold text-gray-700">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                className="px-2 py-1 hover:bg-pink-50 text-gray-500 rounded-r-xl transition-colors"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="px-5 py-4 border-t border-pink-100/60 bg-white/60 backdrop-blur-sm shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-500 text-sm">
                        Subtotal
                        {selectedCartItems.length < cart.length && (
                          <span className="ml-1 text-xs text-pink-400">
                            ({selectedCartItems.length} of {cart.length} selected)
                          </span>
                        )}
                      </span>
                      <span className="text-lg font-bold text-gray-800">Rs. {totalAmount.toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => setStep('checkout')}
                      disabled={selectedCartItems.length === 0}
                      className="w-full text-white py-3 rounded-2xl font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                      style={{ background: 'linear-gradient(135deg, #ff3fa1, #ff007c)' }}
                    >
                      {selectedCartItems.length === 0
                        ? 'Select items to checkout'
                        : `Checkout ${selectedCartItems.length === cart.length ? '' : `${selectedCartItems.length} `}item${selectedCartItems.length !== 1 ? 's' : ''} →`}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── STEP 2: CHECKOUT ── */}
            {step === 'checkout' && (
              <div className="flex-1 overflow-hidden grid grid-cols-[1fr_280px]">

                {/* Left — form */}
                <div className="overflow-y-auto px-6 py-5 border-r border-pink-100/60 space-y-7">

                  {/* Delivery Details */}
                  <div>
                    <SectionTitle>Delivery Details</SectionTitle>
                    <div className="space-y-4">
                      <div className="grid grid-cols-[3fr_2fr] gap-3">
                        <Field label="Delivery City" required>
                          <SearchableSelect
                            options={SRI_LANKA_CITIES}
                            value={deliveryCity}
                            onChange={setDeliveryCity}
                            placeholder="Type city..."
                          />
                        </Field>
                        <Field label="Location Type">
                          <SearchableSelect
                            options={LOCATION_TYPES}
                            value={locationType}
                            onChange={setLocationType}
                            placeholder="Select one"
                          />
                        </Field>
                      </div>
                      <Field label="Street Address" required>
                        <input
                          type="text"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="House no., street, landmark…"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Delivery Date" required>
                        <input
                          type="date"
                          value={deliveryDate}
                          min={todayISO}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Special Instructions">
                        <textarea
                          value={instructions}
                          onChange={(e) => setInstructions(e.target.value)}
                          placeholder="Any note for the delivery person (optional)"
                          rows={2}
                          className={`${inputCls} resize-none`}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Recipient */}
                  <div>
                    <SectionTitle>Recipient Information</SectionTitle>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Full Name" required>
                        <input
                          type="text"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder="Recipient's name"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Phone Number" required>
                        <input
                          type="text"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          placeholder="+94 7X XXX XXXX"
                          className={inputCls}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Sender / Gift */}
                  <div>
                    <SectionTitle>Sender &amp; Gift</SectionTitle>
                    <div className="space-y-3">
                      <Field label="Your Name">
                        <input
                          type="text"
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          placeholder="Your name"
                          disabled={anonymous}
                          className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-400`}
                        />
                      </Field>
                      <label className="flex items-center gap-2.5 text-sm text-gray-600 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={anonymous}
                          onChange={(e) => setAnonymous(e.target.checked)}
                          className="h-4 w-4 rounded border-pink-200 text-pink-500 focus:ring-pink-300/30 accent-pink-500"
                        />
                        Send anonymously
                      </label>
                      <Field label="Gift Card Message">
                        <textarea
                          value={giftMessage}
                          onChange={(e) => setGiftMessage(e.target.value)}
                          placeholder="Personal message on the gift card (optional)"
                          rows={3}
                          maxLength={300}
                          className={`${inputCls} resize-none`}
                        />
                        <p className="mt-1 text-xs text-gray-400 text-right">{giftMessage.length}/300</p>
                      </Field>
                    </div>
                  </div>
                </div>

                {/* Right — order summary */}
                <div className="flex flex-col overflow-hidden bg-white/50 backdrop-blur-sm">
                  <div className="flex-1 overflow-y-auto px-4 py-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
                      Order Summary
                    </p>
                    <div className="space-y-3">
                      {selectedCartItems.map((item) => (
                        <div key={item.product_id} className="flex gap-2.5">
                          <div className="w-12 h-12 rounded-xl bg-pink-50 shrink-0 overflow-hidden">
                            {item.image
                              ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><Package size={14} className="text-pink-300" /></div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug">{item.name}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">× {item.quantity}</p>
                          </div>
                          <p className="text-xs font-semibold text-gray-700 shrink-0 pt-0.5">
                            Rs.&nbsp;{((item.price ?? 0) * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals + place order */}
                  <div className="shrink-0 px-4 py-4 border-t border-pink-100/60 space-y-3">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Subtotal</span>
                      <span>Rs. {totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Delivery</span>
                      <span className="italic">Calculated in chat</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-pink-100/60">
                      <span className="text-sm font-bold text-gray-800">Total</span>
                      <span className="text-base font-extrabold text-pink-500">
                        Rs. {totalAmount.toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={isSubmitting}
                      className="w-full text-white py-3 rounded-2xl font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(135deg, #ff3fa1, #ff007c)' }}
                    >
                      {isSubmitting ? 'Processing…' : 'Place Order via Chat →'}
                    </button>
                  </div>
                </div>

              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
