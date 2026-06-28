import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, ChevronLeft, ChevronRight, ImageOff, Plus, ShoppingCart, Star, Users, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { NormalizedProduct } from '../../lib/normalizeProduct';
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

const StarRating: React.FC<{ rating: number; size?: number }> = ({ rating, size = 14 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={size}
        className={
          rating >= star - 0.25
            ? 'text-amber-400 fill-amber-400'
            : rating >= star - 0.75
              ? 'text-amber-400 fill-amber-200'
              : 'text-gray-200 fill-gray-100'
        }
      />
    ))}
    <span className="ml-1 text-xs text-gray-500 font-medium">{rating.toFixed(1)}</span>
  </div>
);

interface HoverPanelProps {
  product: NormalizedProduct;
  onClose: () => void;
}

const HoverPanel: React.FC<HoverPanelProps> = ({ product, onClose }) => {
  const sel = useProductSelection(product);
  const [imgError, setImgError] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  const openProduct = () => {
    if (product.url) window.open(product.url, '_blank', 'noopener,noreferrer');
  };

  const images = React.useMemo(() => {
    if (product.images && product.images.length > 0) return product.images;
    if (product.image) return [product.image];
    return [];
  }, [product.images, product.image]);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };





  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 6 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="flex overflow-hidden rounded-2xl bg-violet-50 shadow-2xl shadow-violet-950/15 border border-violet-100"
      style={{ width: 520 }}
    >
      {/* Left side: Product Image Showcase */}
      <div
        className="relative flex w-48 shrink-0 flex-col items-center bg-gray-50/50 p-4 border-r border-gray-100 cursor-pointer"
        onClick={openProduct}
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white border border-gray-100 flex items-center justify-center p-2 shadow-sm transition-transform duration-300 hover:scale-[1.02] group/img">
          {images.length > 0 && !imgError ? (
            <>
              <img
                src={images[activeImgIndex]}
                alt={product.name}
                className="h-full w-full object-contain"
                onError={() => setImgError(true)}
              />
              
              {/* Carousel arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 border border-gray-100 text-gray-500 hover:text-gray-800 hover:bg-white shadow-sm hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/img:opacity-100"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 border border-gray-100 text-gray-500 hover:text-gray-800 hover:bg-white shadow-sm hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/img:opacity-100"
                  >
                    <ChevronRight size={14} />
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="text-gray-300">
              <ImageOff size={28} />
            </div>
          )}
        </div>

        {/* Carousel Pagination Dots */}
        {images.length > 1 && (
          <div className="flex items-center gap-1 mt-3">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  idx === activeImgIndex ? 'w-3.5 bg-gray-500' : 'w-1.5 bg-gray-200'
                )}
              />
            ))}
          </div>
        )}



        {/* Category tag overlay */}
        {product.category && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-violet-100/80 backdrop-blur-sm px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-700">
            {product.category}
          </span>
        )}
      </div>

      {/* Right side: Product Actions and Details */}
      <div className="flex flex-1 flex-col p-4">
        {/* Top bestseller row */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold tracking-widest text-pink-500 uppercase">
            {product.rating && product.rating >= 4 ? 'Best Seller' : 'Kapruka Choice'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-1 text-violet-400 hover:bg-violet-100 hover:text-violet-600 transition-all active:scale-90"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="min-w-0 mt-1">
          <h3 className="text-base font-bold text-kapruka-dark leading-snug tracking-tight hover:text-violet-600 cursor-pointer" onClick={openProduct}>
            {product.name}
          </h3>
        </div>

        {/* Rating and buyers info */}
        <div className="flex items-center gap-2 mt-1.5">
          {product.rating != null && <StarRating rating={product.rating} size={11} />}
          {product.purchaseCount != null && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-gray-400">
              <Users size={10} /> {product.purchaseCount.toLocaleString()} buyers
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mt-2.5 flex items-baseline gap-1">
          <span className="text-xs text-gray-400 font-medium">Rs.</span>
          <span className="text-xl font-black text-gray-900 tracking-tight">
            {sel.price.toLocaleString()}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 my-3" />

        {/* Summary Description Box */}
        {product.description && (
          <div className="mb-3.5 text-[11px] leading-relaxed text-gray-500 text-justify bg-gray-50/60 border border-gray-100 rounded-xl p-3">
            {product.description}
          </div>
        )}

        {/* Options pickers if any */}
        {sel.hasVariants && (
          <div className="mb-3.5">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">
              Select {product.weight ? 'Size / Weight' : 'Size'}
            </p>
            <SizePicker variants={sel.variants} size={sel.size} onSelect={sel.setSize} />
          </div>
        )}

        {product.isCake && (
          <div className="mb-3.5" onClick={(e) => e.stopPropagation()}>
            <IcingInput value={sel.icing} onChange={sel.setIcing} />
          </div>
        )}

        {product.needsPersonalization && (
          <div className="mb-3.5 flex items-start gap-1.5 rounded-xl border border-amber-200 bg-amber-50/50 px-2.5 py-2">
            <Camera size={13} className="mt-0.5 shrink-0 text-amber-500" />
            <p className="text-[9px] leading-relaxed text-amber-800">
              Personalized item: Add your photo &amp; message on Kapruka during checkout.
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-gray-100 my-3" />

        {/* Quantity and Actions */}
        <div className="mt-auto">
          {/* Item Quantity */}
          <div className="mb-3">
            <p className="mb-1.5 text-[10px] font-semibold text-gray-500">Item Quantity</p>
            <QtyStepper qty={sel.qty} setQty={sel.setQty} />
          </div>

          <div className="space-y-2">
            {/* Primary Action: Add / Update Cart */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); (sel.hasVariants || product.isCake) ? sel.add() : sel.toggleSimple(); }}
              disabled={!sel.inStock}
              className={cn(
                'flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-bold transition-all active:scale-95 shadow-md shadow-violet-100',
                'disabled:cursor-not-allowed disabled:opacity-40',
                sel.isSelected
                  ? 'bg-kapruka-orange text-white hover:bg-kapruka-orange/90'
                  : 'bg-violet-600 text-white hover:bg-violet-700',
              )}
            >
              {sel.isSelected ? <Check size={13} strokeWidth={3} /> : <ShoppingCart size={13} />}
              {sel.isSelected ? 'In Cart (Update)' : 'Add to Cart'}
            </button>

            {/* Secondary Action: Buy Now */}
            {product.url && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openProduct(); }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-3 text-xs font-bold text-gray-700 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
              >
                Buy Now (View on Kapruka)
              </button>
            )}
          </div>
        </div>

        {/* Shipping details */}
        <div className="mt-4 pt-3 border-t border-gray-50">
          <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Shipping &amp; Delivery</p>
          <ul className="text-[9.5px] text-gray-400 space-y-1">
            <li className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              Expected delivery: Same-day / Next-day in Colombo &amp; suburbs.
            </li>
            <li className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              Secure payments with international credit/debit cards.
            </li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
};

export const ProductCard: React.FC<ProductCardProps> = ({ product, index, view }) => {
  const sel = useProductSelection(product);
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const openProduct = () => {
    if (product.url) window.open(product.url, '_blank', 'noopener,noreferrer');
  };

  const showPanel = () => {
    clearTimeout(hideTimer.current);
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const panelW = 520;
    const panelH = 430;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.right + 4;
    if (left + panelW > vw - 12) left = rect.left - panelW - 4;
    if (left < 12) left = 12;

    let top = rect.top;
    if (top + panelH > vh - 12) top = Math.max(12, vh - panelH - 12);

    setPanelStyle({ top, left, width: panelW });
    setHovered(true);
  };

  const hidePanel = () => {
    hideTimer.current = setTimeout(() => setHovered(false), 300);
  };

  if (view === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, delay: index * 0.04 }}
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
            className={cn('truncate text-sm font-medium text-kapruka-dark', product.url && 'cursor-pointer hover:text-violet-700')}
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
        <span className="shrink-0 text-sm font-bold text-violet-700">
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
        transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
        whileHover={{ y: -4 }}
        onMouseEnter={showPanel}
        onMouseLeave={hidePanel}
        onClick={openProduct}
        className={cn(
          'group relative flex flex-col bg-white transition-all duration-300 rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:shadow-violet-100/80 hover:-translate-y-1',
          product.url && 'cursor-pointer',
          sel.isSelected ? 'ring-2 ring-inset ring-kapruka-orange' : '',
        )}
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
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
            <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/30 via-transparent to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); sel.toggleSimple(); }}
                disabled={!sel.inStock}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-lg transition-all active:scale-95',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                  sel.isSelected
                    ? 'bg-kapruka-orange text-white'
                    : 'bg-white text-kapruka-dark hover:bg-violet-600 hover:text-white',
                )}
              >
                {sel.isSelected ? <Check size={12} strokeWidth={3} /> : <Plus size={12} strokeWidth={3} />}
                {sel.isSelected ? 'Added' : 'Add to cart'}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-kapruka-dark">{product.name}</p>
          <p className="mt-1 font-bold text-violet-700">Rs. {sel.price.toLocaleString()}</p>
          <p className={cn('mt-0.5 text-xs', sel.inStock ? 'text-kapruka-green' : 'text-gray-400')}>
            {sel.inStock ? '● In Stock' : 'Out of Stock'}
          </p>
          {(product.rating != null || product.purchaseCount != null) && (
            <div className="mt-1 flex items-center gap-2">
              {product.rating != null && (
                <StarRating rating={product.rating} size={10} />
              )}
              {product.purchaseCount != null && (
                <span className="flex items-center gap-0.5 text-xs text-gray-400">
                  <Users size={10} />
                  {product.purchaseCount.toLocaleString()}
                </span>
              )}
            </div>
          )}

          {sel.hasVariants && (
            <div className="mt-2.5 space-y-2">
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">Size</p>
                <SizePicker variants={sel.variants} size={sel.size} onSelect={sel.setSize} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <QtyStepper qty={sel.qty} setQty={sel.setQty} />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); sel.add(); }}
                  disabled={!sel.inStock}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all active:scale-95',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                    sel.isSelected
                      ? 'bg-kapruka-orange text-white hover:bg-kapruka-orange/90'
                      : 'bg-violet-600 text-white hover:bg-violet-700',
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

      {/* Hover detail panel rendered at document.body to escape overflow:hidden */}
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
