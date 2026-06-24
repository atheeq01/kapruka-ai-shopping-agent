import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, ExternalLink, ImageOff, Plus, ShoppingCart, Star, Users, X } from 'lucide-react';
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

  const openProduct = () => {
    if (product.url) window.open(product.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 6 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="flex overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/20 border border-gray-100"
      style={{ width: 500 }}
    >
      {/* Left — image + name + price on gradient */}
      <div
        className="relative flex w-44 shrink-0 flex-col justify-end overflow-hidden cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 40%, #a855f7 100%)' }}
        onClick={openProduct}
      >
        {product.image && !imgError ? (
          <img
            src={product.image}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-60"
            onError={() => setImgError(true)}
          />
        ) : null}
        {/* Foreground product image (clean, no blend) */}
        {product.image && !imgError ? (
          <img
            src={product.image}
            alt={product.name}
            className="relative z-10 w-full object-contain drop-shadow-2xl px-3 pt-6 pb-2"
            style={{ maxHeight: 180 }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-white/40 z-10">
            <ImageOff size={32} />
          </div>
        )}
        <div className="relative z-10 px-3 pb-4">
          <p className="text-sm font-bold text-white leading-snug line-clamp-2">{product.name}</p>
          <p className="mt-1 text-lg font-extrabold text-white drop-shadow">
            Rs. {sel.price.toLocaleString()}
          </p>
          {product.category && (
            <p className="text-[10px] text-white/70 uppercase tracking-wider mt-0.5">{product.category}</p>
          )}
        </div>
      </div>

      {/* Right — details */}
      <div className="flex flex-1 flex-col p-4 overflow-y-auto" style={{ maxHeight: 380 }}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-kapruka-dark leading-snug line-clamp-2">{product.name}</h3>
            {product.category && (
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{product.category}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Rating */}
        {product.rating != null && (
          <div className="flex items-center gap-2 mb-3">
            <StarRating rating={product.rating} />
            {product.purchaseCount != null && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <Users size={10} /> {product.purchaseCount.toLocaleString()} buyers
              </span>
            )}
          </div>
        )}

        {/* Description */}
        {(product.description || product.summary) && (
          <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-3">
            {product.description || product.summary}
          </p>
        )}

        {/* Weight info */}
        {product.weight && !sel.hasVariants && (
          <p className="text-xs text-gray-400 mb-2">Net weight: {product.weight}</p>
        )}

        {/* Size / variants */}
        {sel.hasVariants && (
          <div className="mb-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {product.weight ? 'Size / Weight' : 'Size'}
            </p>
            <SizePicker variants={sel.variants} size={sel.size} onSelect={sel.setSize} />
          </div>
        )}

        {/* Cake icing greeting */}
        {product.isCake && (
          <div className="mb-3" onClick={(e) => e.stopPropagation()}>
            <IcingInput value={sel.icing} onChange={sel.setIcing} />
          </div>
        )}

        {/* Personalised / photo gift note */}
        {product.needsPersonalization && (
          <div className="mb-3 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-2">
            <Camera size={13} className="mt-0.5 shrink-0 text-amber-500" />
            <p className="text-[10px] leading-relaxed text-amber-800">
              Photo &amp; custom text are added on the Kapruka product page.
            </p>
          </div>
        )}

        {/* Stock */}
        <p className={cn('text-xs mb-3', sel.inStock ? 'text-kapruka-green' : 'text-gray-400')}>
          {sel.inStock ? '● In Stock' : 'Out of Stock'}
        </p>

        {/* Price + qty */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xl font-extrabold text-violet-700">
            Rs. {sel.price.toLocaleString()}
          </span>
          {sel.hasVariants && <QtyStepper qty={sel.qty} setQty={sel.setQty} />}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); (sel.hasVariants || product.isCake) ? sel.add() : sel.toggleSimple(); }}
            disabled={!sel.inStock}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95',
              'disabled:cursor-not-allowed disabled:opacity-40',
              sel.isSelected
                ? 'bg-kapruka-orange text-white hover:bg-kapruka-orange/90'
                : 'bg-violet-600 text-white hover:bg-violet-700',
            )}
          >
            {sel.isSelected ? <Check size={13} strokeWidth={3} /> : <ShoppingCart size={13} />}
            {sel.isSelected ? 'In Cart' : 'Add to Cart'}
          </button>

          {product.url && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openProduct(); }}
              className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-500 hover:border-violet-300 hover:text-violet-600 transition-colors shrink-0"
              title="View on Kapruka"
            >
              <ExternalLink size={12} /> View
            </button>
          )}
        </div>

        {sel.hasVariants && sel.qty > 1 && (
          <p className="mt-2 text-[10px] text-gray-400">
            Total for {sel.qty}: <span className="font-semibold text-kapruka-dark">Rs. {(sel.price * sel.qty).toLocaleString()}</span>
          </p>
        )}
      </div>
    </motion.div>
  );
};

export const ProductCard: React.FC<ProductCardProps> = ({ product, index, view }) => {
  const sel = useProductSelection(product);
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const openProduct = () => {
    if (product.url) window.open(product.url, '_blank', 'noopener,noreferrer');
  };

  const showPanel = () => {
    clearTimeout(hideTimer.current);
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const panelW = 500;
    const panelH = 380;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.right + 10;
    if (left + panelW > vw - 12) left = rect.left - panelW - 10;
    if (left < 12) left = 12;

    let top = rect.top;
    if (top + panelH > vh - 12) top = Math.max(12, vh - panelH - 12);

    setPanelStyle({ top, left, width: panelW });
    setHovered(true);
  };

  const hidePanel = () => {
    hideTimer.current = setTimeout(() => setHovered(false), 130);
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
          'group relative flex flex-col bg-white transition-shadow duration-300 hover:z-10 hover:shadow-xl hover:shadow-violet-200/50',
          product.url && 'cursor-pointer',
          sel.isSelected && 'ring-2 ring-inset ring-kapruka-orange',
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
      {hovered && createPortal(
        <AnimatePresence>
          <div
            style={{ position: 'fixed', zIndex: 9999, ...panelStyle }}
            onMouseEnter={() => clearTimeout(hideTimer.current)}
            onMouseLeave={hidePanel}
          >
            <HoverPanel product={product} onClose={() => setHovered(false)} />
          </div>
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};
