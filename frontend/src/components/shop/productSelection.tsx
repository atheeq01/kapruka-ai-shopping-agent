import React, { useMemo } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useAppStore } from '../../store/cartStore';
import { cn } from '../../lib/utils';
import type { NormalizedProduct, ProductVariant } from '../../lib/normalizeProduct';

/**
 * Shared selection logic. Products that ship in multiple sizes/weights (cakes:
 * 1KG / 2KG / 4KG) expose `variants`; we let the customer pick a size and a
 * quantity before adding, and reflect the chosen variant's price. Simple
 * products keep the original one-tap select/deselect behaviour.
 */
// eslint-disable-next-line react-refresh/only-export-components -- selection hook intentionally colocated with its small UI helpers below
export function useProductSelection(product: NormalizedProduct) {
  const cart = useAppStore((s) => s.cart);
  const addToCart = useAppStore((s) => s.addToCart);
  const removeFromCart = useAppStore((s) => s.removeFromCart);
  const updateQuantity = useAppStore((s) => s.updateQuantity);
  // Single source of truth for this product's draft selection. Every surface
  // (card, hover quick-view, detail card) reads the same store-backed value,
  // so a quantity/size/icing change in one place is reflected in all of them.
  const selection = useAppStore((s) => s.selections[product.id]);
  const setSelection = useAppStore((s) => s.setSelection);

  // Memoize so the array reference is stable across renders (keeps the
  // useMemo below from recomputing — and re-running effects — every render).
  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const hasVariants = variants.length > 0;

  const firstAvailable = useMemo(
    () => variants.find((v) => v.inStock) ?? variants[0],
    [variants],
  );

  const inCart = cart.find((c) => c.product_id === product.id);
  const isSelected = Boolean(inCart);

  // Resolve current values from the shared store, falling back to sane defaults.
  const size = selection?.size ?? inCart?.size ?? firstAvailable?.label;
  const icing = selection?.icing ?? inCart?.icing_text ?? '';
  // Once an item is in the cart its quantity IS the cart quantity, so editing it
  // here updates the cart badge + subtotal everywhere instantly.
  const qty = inCart ? inCart.quantity : selection?.qty ?? 1;

  const setSize = (label: string) => setSelection(product.id, { size: label });
  const setIcing = (v: string) => setSelection(product.id, { icing: v });
  const setQty = (n: number) => {
    const next = Math.max(1, Math.min(99, n));
    setSelection(product.id, { qty: next });
    if (inCart) updateQuantity(product.id, next);
  };

  const activeVariant: ProductVariant | undefined = hasVariants
    ? variants.find((v) => v.label === size) ?? firstAvailable
    : undefined;

  const price = activeVariant?.price ?? product.price;
  const inStock = activeVariant ? activeVariant.inStock : product.inStock;

  const trimmedIcing = icing.trim();

  const add = () => {
    // Always replace so the cart reflects the latest size/quantity/icing choice.
    // Honour the chosen quantity for every product — the quick-view and detail
    // card expose a stepper for simple products too, so forcing 1 here silently
    // dropped the user's choice.
    removeFromCart(product.id);
    addToCart({
      product_id: product.id,
      quantity: qty,
      name: activeVariant ? `${product.name} (${activeVariant.label})` : product.name,
      price,
      image: product.image,
      ...(activeVariant && { size: activeVariant.label }),
      ...(product.isCake && trimmedIcing && { icing_text: trimmedIcing }),
    });
  };

  const toggleSimple = () => {
    if (isSelected) removeFromCart(product.id);
    else add();
  };

  return {
    hasVariants,
    variants,
    size,
    setSize,
    qty,
    setQty,
    icing,
    setIcing,
    price,
    inStock,
    isSelected,
    inCart,
    add,
    toggleSimple,
  };
}

/** Compact, optional icing-greeting input shown on cake cards. */
export const IcingInput: React.FC<{ value: string; onChange: (v: string) => void }> = ({
  value,
  onChange,
}) => (
  <div>
    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
      Icing greeting <span className="lowercase tracking-normal text-gray-300">· optional</span>
    </p>
    <input
      type="text"
      value={value}
      maxLength={120}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      placeholder='e.g. "Happy Birthday Amma"'
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
    />
  </div>
);

export const SizePicker: React.FC<{
  variants: ProductVariant[];
  size?: string;
  onSelect: (label: string) => void;
}> = ({ variants, size, onSelect }) => (
  <div className="flex flex-wrap gap-1.5">
    {variants.map((v) => (
      <button
        key={v.label}
        type="button"
        disabled={!v.inStock}
        onClick={() => onSelect(v.label)}
        className={cn(
          'rounded-md border px-2.5 py-1 text-xs font-semibold transition-all active:scale-95',
          'disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
          size === v.label
            ? 'border-primary-600 bg-primary-600 text-white'
            : 'border-gray-200 text-gray-600 hover:border-primary-400 hover:text-primary-600',
        )}
      >
        {v.label}
      </button>
    ))}
  </div>
);

export const QtyStepper: React.FC<{ qty: number; setQty: (n: number) => void }> = ({
  qty,
  setQty,
}) => (
  <div className="flex items-center rounded-lg border border-gray-200">
    <button
      type="button"
      onClick={() => setQty(Math.max(1, qty - 1))}
      disabled={qty <= 1}
      className="px-2 py-1.5 text-gray-500 transition-colors hover:text-primary-600 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 rounded-l-lg"
      aria-label="Decrease quantity"
    >
      <Minus size={13} />
    </button>
    <span className="min-w-[28px] text-center text-sm font-semibold text-kapruka-dark">{qty}</span>
    <button
      type="button"
      onClick={() => setQty(Math.min(99, qty + 1))}
      className="px-2 py-1.5 text-gray-500 transition-colors hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 rounded-r-lg"
      aria-label="Increase quantity"
    >
      <Plus size={13} />
    </button>
  </div>
);
