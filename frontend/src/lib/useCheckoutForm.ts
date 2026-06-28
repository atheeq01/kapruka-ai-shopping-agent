import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, type CartItem } from '../store/cartStore';
import { sendAgentMessage, setPendingOrderItems } from './agentStream';
import { writeGiftMessage } from './api';
import type { ConfirmedLocation } from '../components/shop/LocationConfirmModal';
import type { PlaceResult } from '../components/shop/PlacesAutocomplete';

interface UseCheckoutFormOpts {
  /** Items being ordered (already filtered to the user's selection). */
  items: CartItem[];
  /** Conversation to place the order into. When omitted a new one is created. */
  conversationId?: string;
  /** Called right after the order message is dispatched (e.g. to close a panel). */
  onPlaced?: () => void;
}

/**
 * Shared checkout state + "place order" logic, used by BOTH the sidebar
 * `CartPanel` and the in-chat `InlineCheckout` card so the two stay in lockstep.
 *
 * Placing an order registers the ordered product ids with the agent stream
 * (`setPendingOrderItems`) so they are removed from the cart the moment the
 * agent's `order_confirmation` event arrives — i.e. once the order is processed
 * to payment. This is what makes the cart clear after checkout.
 */
export function useCheckoutForm({ items, conversationId, onPlaced }: UseCheckoutFormOpts) {
  const navigate = useNavigate();
  const createConversation = useAppStore((s) => s.createConversation);
  const languagePreference = useAppStore((s) => s.languagePreference);

  const [mapOpen, setMapOpen] = useState(false);
  const [confirmedLocation, setConfirmedLocation] = useState<ConfirmedLocation | null>(null);
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
  const [draftingMsg, setDraftingMsg] = useState(false);

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const totalAmount = useMemo(
    () => items.reduce((acc, i) => acc + (i.price || 0) * i.quantity, 0),
    [items],
  );

  // A picked autocomplete result fills the address + city and auto-pins the map.
  const handlePlaceSelected = (p: PlaceResult) => {
    setDeliveryAddress(p.formattedAddress);
    if (p.city) setDeliveryCity(p.city);
    setConfirmedLocation({
      lat: p.lat,
      lng: p.lng,
      formattedAddress: p.formattedAddress,
      mapsUrl: `https://www.google.com/maps?q=${p.lat},${p.lng}`,
    });
  };

  const handleDraftGiftMessage = async () => {
    setDraftingMsg(true);
    try {
      const message = await writeGiftMessage({
        recipient_name: recipientName || undefined,
        sender_name: anonymous ? undefined : (senderName || undefined),
        anonymous,
        items: items.map((i) => i.name).filter(Boolean) as string[],
        language: languagePreference,
      });
      if (message) setGiftMessage(message);
    } catch {
      alert("Sorry — couldn't draft a message just now. Please try again.");
    } finally {
      setDraftingMsg(false);
    }
  };

  const placeOrder = async () => {
    if (items.length === 0) {
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

    const itemLines = items.map((i) =>
      `- ${i.name ?? i.product_id} (id: ${i.product_id}) × ${i.quantity}` +
      (i.icing_text ? ` — icing: "${i.icing_text}"` : '')
    ).join('\n');

    const locationLine = confirmedLocation?.lat != null && confirmedLocation?.lng != null
      ? `Map-confirmed location: ${confirmedLocation.formattedAddress} (GPS ${confirmedLocation.lat.toFixed(6)}, ${confirmedLocation.lng.toFixed(6)} — ${confirmedLocation.mapsUrl})`
      : 'Map-confirmed location: Not pinned';

    const payload = `Please create an order for the following cart. Use exactly these details — do not change or omit any of them.

Items:
${itemLines}

Recipient name: ${recipientName}
Recipient phone: ${recipientPhone}
Delivery address: ${deliveryAddress}
Delivery city: ${deliveryCity}
Location type: ${locationType || 'Not specified'}
${locationLine}
Delivery date: ${deliveryDate}
Special instructions: ${instructions.trim() || 'None'}
Sender name: ${anonymous ? `${senderName || 'N/A'} (show as Anonymous on the gift card)` : senderName}
Send anonymously: ${anonymous ? 'Yes' : 'No'}
Personal gift message: ${giftMessage.trim() || 'None'}`;

    setIsSubmitting(true);
    const targetId = conversationId ?? createConversation();
    // Clear these items from the cart once the order is confirmed to payment.
    setPendingOrderItems(items.map((i) => i.product_id));
    onPlaced?.();
    if (!conversationId) navigate(`/c/${targetId}`);
    await sendAgentMessage(targetId, payload);
    setIsSubmitting(false);
  };

  return {
    // state
    mapOpen, setMapOpen,
    confirmedLocation, setConfirmedLocation,
    deliveryCity, setDeliveryCity,
    locationType, setLocationType,
    deliveryAddress, setDeliveryAddress,
    deliveryDate, setDeliveryDate,
    instructions, setInstructions,
    recipientName, setRecipientName,
    recipientPhone, setRecipientPhone,
    senderName, setSenderName,
    anonymous, setAnonymous,
    giftMessage, setGiftMessage,
    isSubmitting, draftingMsg,
    // derived
    todayISO, totalAmount,
    // actions
    handlePlaceSelected, handleDraftGiftMessage, placeOrder,
  };
}

export type CheckoutFormApi = ReturnType<typeof useCheckoutForm>;
