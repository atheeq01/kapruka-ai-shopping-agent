import React from 'react';
import { Loader2, MapPin, Pencil, Sparkles } from 'lucide-react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { SRI_LANKA_CITIES, LOCATION_TYPES } from '../../lib/sriLankaCities';
import { LocationConfirmModal } from './LocationConfirmModal';
import { PlacesAutocomplete } from './PlacesAutocomplete';
import { hasGoogleMapsKey } from '../../lib/googleMaps';
import type { CheckoutFormApi } from '../../lib/useCheckoutForm';

export const checkoutInputCls =
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

interface Props {
  checkout: CheckoutFormApi;
}

/**
 * The full checkout form body — delivery (with Google-Maps address search +
 * map pin), recipient, and sender/gift sections. Shared verbatim between the
 * sidebar `CartPanel` and the in-chat `InlineCheckout` card so both offer the
 * same dropdowns, address search, and map experience.
 */
export const CheckoutFields: React.FC<Props> = ({ checkout: c }) => (
  <>
    {/* Delivery */}
    <section>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Delivery</p>
      <div className="space-y-3">
        {hasGoogleMapsKey && (
          <Field label="Search your address">
            <PlacesAutocomplete
              onSelect={c.handlePlaceSelected}
              className="[&_gmp-place-autocomplete]:w-full"
            />
            <p className="mt-1 text-[10px] text-gray-400">
              Start typing to pick your exact address — we'll fill the fields and pin it on the map.
            </p>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" required>
            <SearchableSelect options={SRI_LANKA_CITIES} value={c.deliveryCity} onChange={c.setDeliveryCity} placeholder="Type city…" />
          </Field>
          <Field label="Location Type">
            <SearchableSelect options={LOCATION_TYPES} value={c.locationType} onChange={c.setLocationType} placeholder="Select" />
          </Field>
        </div>
        <Field label="Street Address" required>
          <textarea
            value={c.deliveryAddress}
            onChange={(e) => c.setDeliveryAddress(e.target.value)}
            placeholder="House / flat no., street name, building, landmark…"
            rows={4}
            className={`${checkoutInputCls} resize-none leading-relaxed`}
          />
        </Field>

        {/* Map location confirmation */}
        {c.confirmedLocation ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50/70 px-3 py-2.5">
            <MapPin size={15} className="mt-0.5 shrink-0 text-green-600" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-green-700">Location pinned</p>
              <p className="truncate text-xs text-gray-600">{c.confirmedLocation.formattedAddress}</p>
            </div>
            <button
              type="button"
              onClick={() => c.setMapOpen(true)}
              className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-green-700 ring-1 ring-green-200 transition-colors hover:bg-green-100"
            >
              <Pencil size={11} /> Edit
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => c.setMapOpen(true)}
            disabled={!c.deliveryAddress && !c.deliveryCity}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-pink-300 bg-pink-50/50 px-3 py-2.5 text-xs font-semibold text-pink-600 transition-colors hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MapPin size={14} /> Pin exact location on map
          </button>
        )}
        <Field label="Delivery Date" required>
          <input type="date" value={c.deliveryDate} min={c.todayISO} onChange={(e) => c.setDeliveryDate(e.target.value)} className={checkoutInputCls} />
        </Field>
        <Field label="Special Instructions">
          <textarea value={c.instructions} onChange={(e) => c.setInstructions(e.target.value)} placeholder="Notes for delivery person (optional)" rows={2} className={`${checkoutInputCls} resize-none`} />
        </Field>
      </div>
    </section>

    {/* Recipient */}
    <section>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Recipient</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full Name" required>
          <input type="text" value={c.recipientName} onChange={(e) => c.setRecipientName(e.target.value)} placeholder="Name" className={checkoutInputCls} />
        </Field>
        <Field label="Phone" required>
          <input type="text" value={c.recipientPhone} onChange={(e) => c.setRecipientPhone(e.target.value)} placeholder="+94 7X…" className={checkoutInputCls} />
        </Field>
      </div>
    </section>

    {/* Sender & Gift */}
    <section>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Sender &amp; Gift</p>
      <div className="space-y-3">
        <Field label="Your Name">
          <input type="text" value={c.senderName} onChange={(e) => c.setSenderName(e.target.value)} placeholder="Your name" disabled={c.anonymous} className={`${checkoutInputCls} disabled:bg-gray-50 disabled:text-gray-400`} />
        </Field>
        <label className="flex items-center gap-2 text-xs text-gray-600 select-none cursor-pointer">
          <input type="checkbox" checked={c.anonymous} onChange={(e) => c.setAnonymous(e.target.checked)} className="h-3.5 w-3.5 rounded accent-pink-500" />
          Send anonymously
        </label>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-xs font-semibold text-gray-500">Gift Card Message</label>
            <button
              type="button"
              onClick={c.handleDraftGiftMessage}
              disabled={c.draftingMsg}
              title="Let Kapruka write a heartfelt message for you"
              className="flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600 transition-colors hover:bg-violet-100 disabled:opacity-60"
            >
              {c.draftingMsg
                ? <><Loader2 size={10} className="animate-spin" /> Writing…</>
                : <><Sparkles size={10} /> Write one for me</>}
            </button>
          </div>
          <textarea value={c.giftMessage} onChange={(e) => c.setGiftMessage(e.target.value)} placeholder="Personal message on gift card — or tap ✨ to have Kapruka write it" rows={3} maxLength={300} className={`${checkoutInputCls} resize-none`} />
          <p className="text-right text-[10px] text-gray-400 mt-0.5">{c.giftMessage.length}/300</p>
        </div>
      </div>
    </section>

    {/* Google-Maps location confirmation modal (portaled to body) */}
    <LocationConfirmModal
      open={c.mapOpen}
      onClose={() => c.setMapOpen(false)}
      address={c.deliveryAddress}
      city={c.deliveryCity}
      initial={c.confirmedLocation}
      onConfirm={c.setConfirmedLocation}
    />
  </>
);
