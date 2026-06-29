import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, ImageOff, Minus, Plus, ShoppingCart, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { NormalizedProduct } from '../../lib/normalizeProduct';
import { easeOutExpo } from '../../lib/motion';
import { IcingInput, QtyStepper, SizePicker, useProductSelection } from './productSelection';

interface ProductCardProps {
  product: NormalizedProduct;
  index: number;
  view: 'grid' | 'list';
}

const ProductImage: React.FC<{ src?: string; alt: string; className?: string }> = ({
  src,
  alt,
  className,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-300">
        <ImageOff size={20} />
      </div>
    );
  }

  return (
    <>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-gray-200" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={cn(
          'h-full w-full object-cover transition-all duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
          className,
        )}
      />
    </>
  );
};

interface HoverPanelProps {
  product: NormalizedProduct;
  onClose: () => void;
}

const HoverPanel: React.FC<HoverPanelProps> = ({ product, onClose }) => {
  const sel = useProductSelection(product);
  const [imgError, setImgError] = useState(false);

  const openProduct = () => {
    if (product.url) window.open(product.url, '_blank', 'noopener,noreferrer');
  };

  const mainImage = product.images && product.images.length > 0 ? product.images[0] : product.image;

  const handleCartAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sel.hasVariants || product.isCake) sel.add();
    else sel.toggleSimple();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 6 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/12 ring-1 ring-black/[0.06]"
      style={{ width: 268 }}
    >
      {/* Badge + close */}
      <div className="flex items-center justify-between px-4 pt-4 pb-0.5">
        <span className="text-[9px] font-bold tracking-widest uppercase text-pink-500">
          {product.rating && product.rating >= 4.5 ? 'Best Seller' : 'Kapruka Choice'}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="rounded-full p-1 text-gray-300 hover:text-gray-500 transition-colors"
          aria-label="Close"
        >
          <X size={13} />
        </button>
      </div>

      {/* Title */}
      <h3
        className="px-4 mt-1 text-sm font-bold leading-snug text-gray-900 line-clamp-2 cursor-pointer hover:text-pink-500 transition-colors"
        onClick={openProduct}
      >
        {product.name}
      </h3>

      {/* Price */}
      <div className="px-4 mt-2 flex items-baseline gap-1">
        <span className="text-xs font-medium text-gray-400">Rs.</span>
        <span className="text-[1.6rem] font-black tracking-tight text-gray-900 leading-none">
          {sel.price.toLocaleString()}
        </span>
      </div>

      {/* Image */}
      <div
        className="mx-4 mt-3 h-36 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center cursor-pointer"
        onClick={openProduct}
      >
        {mainImage && !imgError ? (
          <img
            src={mainImage}
            alt={product.name}
            className="h-full w-full object-contain transition-transform duration-300 hover:scale-[1.04]"
            onError={() => setImgError(true)}
          />
        ) : (
          <ImageOff size={24} className="text-gray-300" />
        )}
      </div>

      {/* Variant / icing pickers — only when needed */}
      {sel.hasVariants && (
        <div className="px-4 mt-3">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">
            Size / Weight
          </p>
          <SizePicker variants={sel.variants} size={sel.size} onSelect={sel.setSize} />
        </div>
      )}

      {product.isCake && (
        <div className="px-4 mt-3" onClick={(e) => e.stopPropagation()}>
          <IcingInput value={sel.icing} onChange={sel.setIcing} />
        </div>
      )}

      {product.needsPersonalization && (
        <div className="mx-4 mt-3 flex items-start gap-1.5 rounded-xl border border-amber-200 bg-amber-50/50 px-2.5 py-2">
          <Camera size={12} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="text-[9px] leading-relaxed text-amber-800">
            Personalized item — add photo &amp; message on Kapruka at checkout.
          </p>
        </div>
      )}

      {/* Add to Cart row with integrated stepper */}
      <div className="px-4 mt-4">
        <div
          className={cn(
            'flex items-center rounded-2xl overflow-hidden shadow-md',
            sel.isSelected ? 'bg-kapruka-orange' : 'bg-[#e91e8c]',
            !sel.inStock && 'opacity-40',
          )}
        >
          {/* Cart action */}
          <button
            type="button"
            disabled={!sel.inStock}
            onClick={handleCartAction}
            className="flex flex-1 items-center gap-2 px-4 py-3 text-white text-xs font-bold disabled:cursor-not-allowed transition-opacity"
          >
            {sel.isSelected ? <Check size={13} strokeWidth={3} /> : <ShoppingCart size={14} />}
            {sel.isSelected ? 'In Cart' : 'Add to Cart'}
          </button>

          {/* Divider */}
          <div className="w-px h-7 bg-white/25 shrink-0" />

          {/* Quantity stepper */}
          <div className="flex items-center px-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); sel.setQty(Math.max(1, sel.qty - 1)); }}
              disabled={!sel.inStock || sel.qty <= 1}
              className="flex h-9 w-8 items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <Minus size={12} />
            </button>
            <span className="min-w-[22px] text-center text-xs font-bold text-white">
              {sel.qty}
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); sel.setQty(Math.min(99, sel.qty + 1)); }}
              disabled={!sel.inStock}
              className="flex h-9 w-8 items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Buy Now link */}
      {product.url && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); openProduct(); }}
          className="w-full py-3 text-xs text-gray-400 hover:text-gray-600 transition-colors text-center"
        >
          Buy Now (View on Kapruka)
        </button>
      )}
    </motion.div>
  );
};

export const ProductCard: React.FC<ProductCardProps> = ({ product, index, view }) => {
  const sel = useProductSelection(product);
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const openProduct = () => {
    if (window.matchMedia('(hover: none)').matches) {
      showPanel();
    } else if (product.url) {
      window.open(product.url, '_blank', 'noopener,noreferrer');
    }
  };

  const positionPanel = () => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const panelW = 268;
    const panelH = 360;
    const margin = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Center it directly on top of the original card
    let left = rect.left + rect.width / 2 - panelW / 2;
    let top = rect.top + rect.height / 2 - panelH / 2;

    // Clamp to viewport
    left = Math.max(margin, Math.min(left, vw - panelW - margin));
    top = Math.max(margin, Math.min(top, vh - panelH - margin));

    setPanelStyle({ top, left, width: panelW });
  };

  const showPanel = () => {
    clearTimeout(hideTimer.current);
    if (hovered) return;
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => {
      positionPanel();
      setHovered(true);
    }, 50); // faster
  };

  const hidePanel = () => {
    clearTimeout(openTimer.current);
    hideTimer.current = setTimeout(() => setHovered(false), 200);
  };

  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(hideTimer.current);
    },
    [],
  );

  if (view === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: index * 0.04, ease: easeOutExpo }}
        className="flex flex-wrap items-center gap-4 p-3 transition-colors hover:bg-violet-50/40"
      >
        <div
          className={cn('relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100', product.url && 'cursor-pointer')}
          onClick={openProduct}
        >
          <ProductImage src={product.image} alt={product.name} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn('truncate text-sm font-medium text-kapruka-dark', product.url && 'cursor-pointer hover:text-primary-700')}
            onClick={openProduct}
          >
            {product.name}
          </p>
          <p className={cn('mt-0.5 text-xs', sel.inStock ? 'text-kapruka-green' : 'text-gray-400')}>
            {sel.inStock ? 'In Stock' : 'Out of Stock'}
          </p>
          {sel.hasVariants && (
            <div className="mt-1.5">
              <SizePicker variants={sel.variants} size={sel.size} onSelect={sel.setSize} />
            </div>
          )}
        </div>
        {sel.hasVariants && <QtyStepper qty={sel.qty} setQty={sel.setQty} />}
        <span className="shrink-0 text-sm font-bold text-gray-900">
          Rs. {sel.price.toLocaleString()}
        </span>
        <button
          type="button"
          onClick={sel.hasVariants ? sel.add : sel.toggleSimple}
          disabled={!sel.inStock}
          className={cn(
            'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
            'disabled:cursor-not-allowed disabled:opacity-40 active:scale-95',
            sel.isSelected
              ? 'border-kapruka-orange bg-kapruka-orange text-white'
              : 'border-gray-200 text-gray-600 hover:border-kapruka-orange hover:text-kapruka-orange',
          )}
        >
          {sel.isSelected ? '✓ In cart' : 'Add'}
        </button>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: index * 0.05, ease: easeOutExpo }}
        whileHover={{ y: -4 }}
        onMouseEnter={showPanel}
        onMouseLeave={hidePanel}
        onFocus={showPanel}
        onBlur={hidePanel}
        onClick={openProduct}
        tabIndex={0}
        role="group"
        aria-label={product.name}
        className={cn(
          'group relative flex flex-col bg-white transition-all duration-300 rounded-[18px] border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 p-3 w-full h-full',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
          product.url && 'cursor-pointer',
          sel.isSelected ? 'ring-2 ring-inset ring-kapruka-orange' : '',
        )}
      >
        <div className="relative aspect-square shrink-0 overflow-hidden bg-gray-50 rounded-xl">
          <ProductImage src={product.image} alt={product.name} className="group-hover:scale-110" />

          {product.needsPersonalization && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-amber-500/95 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
              <Camera size={10} /> Photo
            </span>
          )}

          {sel.isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-kapruka-orange text-white shadow-md"
            >
              <Check size={13} strokeWidth={3} />
            </motion.div>
          )}

          {!sel.hasVariants && (
            <div className="absolute inset-0 hidden [@media(hover:hover)]:flex items-end justify-center bg-gradient-to-t from-black/30 via-transparent to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); sel.toggleSimple(); }}
                disabled={!sel.inStock}
                aria-label={sel.isSelected ? `Remove ${product.name} from cart` : `Add ${product.name} to cart`}
                className={cn(
                  'flex h-11 w-full items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold shadow-lg transition-all active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                  sel.isSelected
                    ? 'bg-kapruka-orange text-white'
                    : 'bg-white text-kapruka-dark hover:bg-primary-600 hover:text-white',
                )}
              >
                {sel.isSelected ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
                {sel.isSelected ? 'Added' : 'Add to cart'}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col pt-3 min-h-0 justify-between">
          <div>
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-kapruka-dark">{product.name}</p>
            <p className="mt-1 font-bold text-gray-900">Rs. {sel.price.toLocaleString()}</p>
          </div>
          <p className={cn('mt-0.5 text-xs', sel.inStock ? 'text-kapruka-green' : 'text-gray-400')}>
            {sel.inStock ? '● In Stock' : 'Out of Stock'}
          </p>

          {sel.hasVariants && (
            <div className="mt-2.5 hidden md:block">
               {/* Hiding stepper on mobile to keep height 280px. Tapping opens sheet. */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); sel.add(); }}
                  disabled={!sel.inStock}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl h-9 px-3 text-xs font-semibold transition-all active:scale-95',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                    sel.isSelected
                      ? 'bg-kapruka-orange text-white hover:bg-kapruka-orange/90'
                      : 'btn-primary',
                  )}
                >
                  {sel.isSelected ? <Check size={13} strokeWidth={3} /> : <ShoppingCart size={13} />}
                  {sel.isSelected ? 'Update cart' : 'Add to cart'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>



      {createPortal(
        <AnimatePresence>
          {hovered && (
            <div
              style={{ position: 'fixed', zIndex: 9999, ...panelStyle }}
              onMouseEnter={() => clearTimeout(hideTimer.current)}
              onMouseLeave={hidePanel}
            >
              <HoverPanel product={product} onClose={() => setHovered(false)} />
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};
