import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, ArrowLeft, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/cartStore';
import { sendAgentMessage } from '../../lib/agentStream';
import { SearchableSelect } from '../ui/SearchableSelect';
import { SRI_LANKA_CITIES, LOCATION_TYPES } from '../../lib/sriLankaCities';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
}

type Step = 'cart' | 'checkout';

const inputCls =
  'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-kapruka-orange/25 focus:border-kapruka-orange outline-none transition-colors bg-white';

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({
  label, required, children,
}) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-gray-700">
      {label}{required && <span className="text-kapruka-orange ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-4">{children}</h3>
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

  const todayISO = new Date().toISOString().slice(0, 10);
  const totalAmount = cart.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);

  const resetAndClose = () => { setStep('cart'); onClose(); };

  const handlePlaceOrder = async () => {
    if (!deliveryCity || !deliveryAddress || !deliveryDate || !recipientName || !recipientPhone) {
      alert('Please fill in all required fields (marked *).');
      return;
    }
    if (!anonymous && !senderName) {
      alert('Please enter your name, or tick "Send anonymously".');
      return;
    }
    const itemLines = cart
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
    const targetId = conversationId ?? createConversation();
    resetAndClose();
    if (!conversationId) navigate(`/c/${targetId}`);
    await sendAgentMessage(targetId, payload);
    setIsSubmitting(false);
    setStep('cart');
  };

  // Shared drawer width per step
  const drawerWidth = step === 'checkout' ? 'w-full max-w-[780px]' : 'w-full max-w-md';

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
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          />

          {/* Drawer — width animates with the step */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed right-0 top-0 h-full ${drawerWidth} bg-white shadow-2xl z-50 flex flex-col transition-[max-width] duration-300`}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                {step === 'checkout' && (
                  <button
                    onClick={() => setStep('cart')}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ArrowLeft size={17} />
                  </button>
                )}
                <h2 className="text-lg font-bold text-kapruka-dark flex items-center gap-2">
                  {step === 'cart'
                    ? <><ShoppingBag size={19} className="text-kapruka-orange" /> Your Cart</>
                    : 'Checkout'}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {step === 'checkout' && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Lock size={11} /> Secure Checkout
                  </span>
                )}
                <button onClick={resetAndClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ── STEP 1: CART ── */}
            {step === 'cart' && (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {cart.length === 0 ? (
                    <div className="text-center text-gray-400 mt-12">Your cart is empty.</div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.product_id} className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg shrink-0 overflow-hidden">
                          {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div className="flex justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm line-clamp-2 text-gray-800">{item.name}</p>
                              {item.icing_text && <p className="text-xs text-gray-500 mt-0.5">Icing: "{item.icing_text}"</p>}
                            </div>
                            <button onClick={() => removeFromCart(item.product_id)} className="text-gray-300 hover:text-red-400 shrink-0 transition-colors">
                              <X size={15} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-kapruka-orange text-sm">Rs. {item.price?.toLocaleString()}</span>
                            <div className="flex items-center rounded-lg border border-gray-200 bg-white">
                              <button onClick={() => updateQuantity(item.product_id, Math.max(1, item.quantity - 1))} className="px-2 py-1 hover:bg-gray-50 text-gray-500 rounded-l-lg"><Minus size={13} /></button>
                              <span className="px-2.5 text-sm font-medium">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="px-2 py-1 hover:bg-gray-50 text-gray-500 rounded-r-lg"><Plus size={13} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="px-5 py-4 border-t border-gray-100 bg-white shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-500 text-sm">Subtotal</span>
                      <span className="text-lg font-bold text-kapruka-dark">Rs. {totalAmount.toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => setStep('checkout')}
                      className="w-full bg-kapruka-orange hover:bg-[#d9561b] text-white py-3 rounded-xl font-bold text-base transition-colors"
                    >
                      Proceed to Checkout →
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── STEP 2: CHECKOUT (two-column) ── */}
            {step === 'checkout' && (
              <div className="flex-1 overflow-hidden grid grid-cols-[1fr_260px]">

                {/* Left — scrollable form */}
                <div className="overflow-y-auto px-6 py-5 border-r border-gray-100 space-y-7">

                  {/* Delivery Details */}
                  <div>
                    <SectionTitle>Delivery Details</SectionTitle>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Delivery City" required>
                          <SearchableSelect options={SRI_LANKA_CITIES} value={deliveryCity} onChange={setDeliveryCity} placeholder="Type Here" />
                        </Field>
                        <Field label="Location Type">
                          <SearchableSelect options={LOCATION_TYPES} value={locationType} onChange={setLocationType} placeholder="Select One" />
                        </Field>
                      </div>
                      <Field label="Street Address" required>
                        <input type="text" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="House no., street, landmark…" className={inputCls} />
                      </Field>
                      <Field label="Delivery Date" required>
                        <input type="date" value={deliveryDate} min={todayISO} onChange={(e) => setDeliveryDate(e.target.value)} className={inputCls} />
                      </Field>
                      <Field label="Special Instructions">
                        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Anything for the delivery person (optional)" rows={2} className={`${inputCls} resize-none`} />
                      </Field>
                    </div>
                  </div>

                  {/* Recipient */}
                  <div>
                    <SectionTitle>Recipient Information</SectionTitle>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Full Name" required>
                        <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Recipient's name" className={inputCls} />
                      </Field>
                      <Field label="Phone Number" required>
                        <input type="text" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="+94 7X XXX XXXX" className={inputCls} />
                      </Field>
                    </div>
                  </div>

                  {/* Sender / Gift */}
                  <div>
                    <SectionTitle>Sender &amp; Gift</SectionTitle>
                    <div className="space-y-3">
                      <Field label="Your Name">
                        <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Your name" disabled={anonymous} className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-400`} />
                      </Field>
                      <label className="flex items-center gap-2.5 text-sm text-gray-600 select-none cursor-pointer">
                        <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-kapruka-orange focus:ring-kapruka-orange/30" />
                        Send anonymously
                      </label>
                      <Field label="Gift Card Message">
                        <textarea value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} placeholder="Personal message on the gift card (optional)" rows={3} maxLength={300} className={`${inputCls} resize-none`} />
                        <p className="mt-1 text-xs text-gray-400 text-right">{giftMessage.length}/300</p>
                      </Field>
                    </div>
                  </div>

                </div>

                {/* Right — order summary */}
                <div className="flex flex-col bg-gray-50 overflow-hidden">
                  <div className="flex-1 overflow-y-auto px-4 py-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">Order Summary</p>
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.product_id} className="flex gap-2.5">
                          <div className="w-12 h-12 rounded-lg bg-gray-200 shrink-0 overflow-hidden">
                            {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
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

                  {/* Totals + button */}
                  <div className="shrink-0 px-4 py-4 border-t border-gray-200 bg-gray-50 space-y-3">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Subtotal</span>
                      <span>Rs. {totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Delivery</span>
                      <span>On order</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-sm font-bold text-kapruka-dark">Total</span>
                      <span className="text-base font-extrabold text-kapruka-orange">Rs. {totalAmount.toLocaleString()}</span>
                    </div>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={isSubmitting}
                      className="w-full bg-kapruka-orange hover:bg-[#d9561b] text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
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
