import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, ArrowLeft, Lock, Package, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/cartStore';
import { sendAgentMessage } from '../../lib/agentStream';
import { SearchableSelect } from '../ui/SearchableSelect';
import { SRI_LANKA_CITIES, LOCATION_TYPES } from '../../lib/sriLankaCities';

interface CartPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
}

type Step = 'cart' | 'checkout';

const inputCls =
  'w-full border border-pink-100 rounded-xl px-3 py-2 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-pink-300/30 focus:border-pink-400 outline-none transition-colors bg-white/90';

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({
  label, required, children,
}) => (
  <div>
    <label className="mb-1 block text-xs font-semibold text-gray-500">
      {label}{required && <span className="text-pink-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

export const CartPanel: React.FC<CartPanelProps> = ({ isOpen, onClose, conversationId }) => {
  const navigate = useNavigate();
  const cart          = useAppStore((s) => s.cart);
  const removeFromCart= useAppStore((s) => s.removeFromCart);
  const updateQuantity= useAppStore((s) => s.updateQuantity);
  const createConversation = useAppStore((s) => s.createConversation);

  const [step, setStep]           = useState<Step>('cart');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [deliveryCity, setDeliveryCity]   = useState('');
  const [locationType, setLocationType]   = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate]   = useState('');
  const [instructions, setInstructions]   = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [senderName, setSenderName]       = useState('');
  const [anonymous, setAnonymous]         = useState(false);
  const [giftMessage, setGiftMessage]     = useState('');
  const [isSubmitting, setIsSubmitting]   = useState(false);

  const todayISO    = new Date().toISOString().slice(0, 10);
  const totalAmount = cart.reduce((acc, i) => acc + (i.price || 0) * i.quantity, 0);

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
    const itemLines = cart.map((i) =>
      `- ${i.name ?? i.product_id} (id: ${i.product_id}) × ${i.quantity}` +
      (i.icing_text ? ` — icing: "${i.icing_text}"` : '')
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
                    cart.map((item) => (
                      <div key={item.product_id} className="flex gap-2.5 p-2.5 bg-white/70 rounded-2xl border border-pink-100/40 shadow-sm">
                        <div className="w-14 h-14 bg-pink-50 rounded-xl shrink-0 overflow-hidden">
                          {item.image
                            ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Package size={18} className="text-pink-300" /></div>
                          }
                        </div>
                        <div className="flex-1 flex flex-col justify-between min-w-0">
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
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="px-4 py-3 border-t border-pink-100/50 bg-white/50 shrink-0">
                    <div className="flex justify-between items-center mb-2.5 text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-bold text-gray-800">Rs. {totalAmount.toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => setStep('checkout')}
                      className="w-full text-white py-2.5 rounded-2xl font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
                      style={{ background: 'linear-gradient(135deg, #ff3fa1, #ff007c)' }}
                    >
                      Proceed to Checkout →
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
                    <span>{cart.length} item{cart.length !== 1 ? 's' : ''} — <span className="text-pink-500">Rs. {totalAmount.toLocaleString()}</span></span>
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
                          {cart.map((item) => (
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

                  {/* Delivery */}
                  <section>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Delivery</p>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="City" required>
                          <SearchableSelect options={SRI_LANKA_CITIES} value={deliveryCity} onChange={setDeliveryCity} placeholder="Type city…" />
                        </Field>
                        <Field label="Location Type">
                          <SearchableSelect options={LOCATION_TYPES} value={locationType} onChange={setLocationType} placeholder="Select" />
                        </Field>
                      </div>
                      <Field label="Street Address" required>
                        <textarea
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="House / flat no., street name, building, landmark…"
                          rows={4}
                          className={`${inputCls} resize-none leading-relaxed`}
                        />
                      </Field>
                      <Field label="Delivery Date" required>
                        <input type="date" value={deliveryDate} min={todayISO} onChange={(e) => setDeliveryDate(e.target.value)} className={inputCls} />
                      </Field>
                      <Field label="Special Instructions">
                        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Notes for delivery person (optional)" rows={2} className={`${inputCls} resize-none`} />
                      </Field>
                    </div>
                  </section>

                  {/* Recipient */}
                  <section>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Recipient</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Full Name" required>
                        <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Name" className={inputCls} />
                      </Field>
                      <Field label="Phone" required>
                        <input type="text" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="+94 7X…" className={inputCls} />
                      </Field>
                    </div>
                  </section>

                  {/* Sender & Gift */}
                  <section>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Sender &amp; Gift</p>
                    <div className="space-y-3">
                      <Field label="Your Name">
                        <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Your name" disabled={anonymous} className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-400`} />
                      </Field>
                      <label className="flex items-center gap-2 text-xs text-gray-600 select-none cursor-pointer">
                        <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="h-3.5 w-3.5 rounded accent-pink-500" />
                        Send anonymously
                      </label>
                      <Field label="Gift Card Message">
                        <textarea value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} placeholder="Personal message on gift card (optional)" rows={3} maxLength={300} className={`${inputCls} resize-none`} />
                        <p className="text-right text-[10px] text-gray-400 mt-0.5">{giftMessage.length}/300</p>
                      </Field>
                    </div>
                  </section>

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
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                    className="w-full text-white py-2.5 rounded-2xl font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #ff3fa1, #ff007c)' }}
                  >
                    {isSubmitting ? 'Processing…' : 'Place Order via Chat →'}
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
