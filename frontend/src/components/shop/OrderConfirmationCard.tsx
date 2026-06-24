import React from 'react';
import { motion } from 'framer-motion';
import {
  CakeSlice,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gift,
  MapPin,
  MessageSquareText,
  Phone,
  User,
} from 'lucide-react';

interface OrderItem {
  product_id?: string;
  name?: string;
  quantity?: number;
  icing_text?: string | null;
}

interface OrderConfirmation {
  items?: OrderItem[];
  recipient?: { name?: string; phone?: string };
  delivery?: {
    address?: string;
    city?: string;
    location_type?: string;
    date?: string;
    instructions?: string | null;
  };
  sender?: { name?: string; anonymous?: boolean };
  gift_message?: string | null;
  checkout_url?: string;
  order_ref?: string;
  expires_at?: string;
  currency?: string;
  totals?: {
    items_total?: number;
    delivery_fee?: number;
    addons_total?: number;
    grand_total?: number;
  };
}

interface Props {
  order: OrderConfirmation;
}

const money = (n: number | undefined, ccy = 'LKR') =>
  n == null ? '—' : `${ccy === 'LKR' ? 'Rs.' : ccy} ${n.toLocaleString()}`;

const Field: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  muted?: boolean;
  full?: boolean;
}> = ({ icon, label, value, muted, full }) => (
  <div className={`flex items-start gap-2 ${full ? 'col-span-2' : ''}`}>
    <span className="mt-0.5 shrink-0 text-gray-400">{icon}</span>
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-sm ${muted ? 'italic text-gray-400' : 'text-kapruka-dark'} break-words`}>
        {value || <span className="italic text-gray-400">Not specified</span>}
      </p>
    </div>
  </div>
);

const LOCATION_LABELS: Record<string, string> = {
  house: 'House',
  apartment: 'Apartment',
  office: 'Office',
  other: 'Other',
};

/**
 * Renders the full order the agent submitted to `kapruka_create_order` — every
 * field, including the ones that used to silently vanish: special instructions,
 * the personal gift message, whether the sender chose to stay anonymous, and any
 * per-cake icing greeting. Plus the price breakdown and the click-to-pay link.
 */
export const OrderConfirmationCard: React.FC<Props> = ({ order }) => {
  const ccy = order.currency ?? 'LKR';
  const d = order.delivery ?? {};
  const totals = order.totals ?? {};
  const addressLine = [d.address, d.city].filter(Boolean).join(', ');
  const locationType = d.location_type ? LOCATION_LABELS[d.location_type] ?? d.location_type : undefined;

  const expiresText = (() => {
    if (!order.expires_at) return null;
    const t = new Date(order.expires_at);
    if (Number.isNaN(t.getTime())) return null;
    return t.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="my-3 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-fuchsia-50/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={17} className="shrink-0 text-violet-600" />
          <span className="text-sm font-semibold text-kapruka-dark">Order summary</span>
        </div>
        {order.order_ref && (
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200">
            {order.order_ref}
          </span>
        )}
      </div>

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">Items</p>
          <ul className="space-y-1.5">
            {order.items.map((it, i) => (
              <li key={i} className="text-sm text-kapruka-dark">
                <div className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                  <span className="min-w-0">
                    <span className="font-medium">{it.name || it.product_id}</span>
                    {it.quantity && it.quantity > 1 && (
                      <span className="text-gray-400"> × {it.quantity}</span>
                    )}
                    {it.icing_text && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                        <CakeSlice size={11} className="text-amber-500" /> Icing: “{it.icing_text}”
                      </span>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recipient + delivery + sender + message */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3">
        <Field icon={<User size={13} />} label="Recipient" value={order.recipient?.name} />
        <Field icon={<Phone size={13} />} label="Phone" value={order.recipient?.phone} />
        <Field
          icon={<MapPin size={13} />}
          label="Delivery address"
          value={
            addressLine
              ? `${addressLine}${locationType ? ` (${locationType})` : ''}`
              : undefined
          }
          full
        />
        <Field icon={<Calendar size={13} />} label="Delivery date" value={d.date} />
        <Field
          icon={<User size={13} />}
          label="Sender"
          value={order.sender?.anonymous ? 'Anonymous' : order.sender?.name}
          muted={order.sender?.anonymous}
        />
        <Field
          icon={<MessageSquareText size={13} />}
          label="Special instructions"
          value={d.instructions || undefined}
          full
        />
        <Field
          icon={<Gift size={13} />}
          label="Personal message"
          value={order.gift_message || undefined}
          full
        />
      </div>

      {/* Totals */}
      {(totals.grand_total != null || totals.items_total != null) && (
        <div className="border-t border-gray-100 px-4 py-3 text-sm">
          <div className="space-y-1">
            {totals.items_total != null && (
              <Row label="Items total" value={money(totals.items_total, ccy)} />
            )}
            {totals.addons_total != null && totals.addons_total > 0 && (
              <Row label="Add-ons" value={money(totals.addons_total, ccy)} />
            )}
            {totals.delivery_fee != null && (
              <Row label="Delivery fee" value={money(totals.delivery_fee, ccy)} />
            )}
          </div>
          {totals.grand_total != null && (
            <div className="mt-2 flex items-center justify-between border-t border-dashed border-gray-200 pt-2">
              <span className="font-semibold text-kapruka-dark">Total</span>
              <span className="text-lg font-bold text-violet-700">
                {money(totals.grand_total, ccy)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Checkout CTA */}
      {order.checkout_url && (
        <div className="border-t border-gray-100 px-4 py-3">
          <a
            href={order.checkout_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-kapruka-orange px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#d9561b] active:scale-95"
          >
            Continue to secure payment <ExternalLink size={15} />
          </a>
          {expiresText && (
            <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-gray-400">
              <Clock size={11} /> Price locked until {expiresText}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between text-gray-500">
    <span>{label}</span>
    <span className="text-kapruka-dark">{value}</span>
  </div>
);
