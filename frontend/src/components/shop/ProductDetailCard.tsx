import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Check, ChevronDown, ChevronUp, ImageOff, ShoppingCart, Star, Truck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { normalizeProduct } from '../../lib/normalizeProduct';
import { IcingInput, QtyStepper, SizePicker, useProductSelection } from './productSelection';

interface ProductDetailCardProps {
  product: unknown;
}

const STOCK_LABELS: Record<string, string> = {
  low: 'Only a few left',
  in_stock: 'In Stock',
  high: 'In Stock',
  medium: 'In Stock',
};

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
  <span className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        size={13}
        className={
          rating >= s - 0.25
            ? 'fill-amber-400 text-amber-400'
            : rating >= s - 0.75
              ? 'fill-amber-200 text-amber-400'
              : 'fill-gray-100 text-gray-200'
        }
      />
    ))}
    <span className="ml-1 text-xs font-medium text-gray-500">{rating.toFixed(1)}</span>
  </span>
);

/**
 * A prominent, product-page-style card for a single chosen product — shown when
 * the agent looks up one specific item via `kapruka_get_product`. It mirrors the
 * real Kapruka product page: image gallery, description, rating, stock, size
 * variants, plus the right add-on for the product kind (icing for cakes, a
 * personalisation note for photo gifts).
 */
export const ProductDetailCard: React.FC<ProductDetailCardProps> = ({ product: raw }) => {
  const product = normalizeProduct(raw);
  const sel = useProductSelection(product);

  const gallery = product.images?.length ? product.images : product.image ? [product.image] : [];
  const [activeImg, setActiveImg] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [descOpen, setDescOpen] = useState(false);

  const lineTotal = sel.price * (sel.hasVariants ? sel.qty : 1);
  const stockLabel = product.stockLevel ? STOCK_LABELS[product.stockLevel] ?? 'In Stock' : null;
  const lowStock = product.stockLevel === 'low';
  // Cakes can re-add to refresh the icing text, so prefer add() over a simple toggle.
  const primaryAction = sel.hasVariants || product.isCake ? sel.add : sel.toggleSimple;
  const currentImage = gallery[activeImg] ?? gallery[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={cn(
        'my-3 overflow-hidden rounded-2xl border bg-white shadow-sm',
        sel.isSelected ? 'border-kapruka-orange' : 'border-gray-200',
      )}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image gallery */}
        <div className="shrink-0 sm:w-52">
          <div className="relative aspect-[4/3] w-full bg-gray-100 sm:aspect-square">
            {currentImage && !imgError ? (
              <img
                src={currentImage}
                alt={product.name}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300">
                <ImageOff size={24} />
              </div>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto p-2">
              {gallery.slice(0, 5).map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => { setActiveImg(i); setImgError(false); }}
                  className={cn(
                    'h-11 w-11 shrink-0 overflow-hidden rounded-md border-2 transition-all',
                    i === activeImg ? 'border-primary-500' : 'border-transparent opacity-70 hover:opacity-100',
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-1 flex-col p-4">
          {product.category && (
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
              {product.category}
            </p>
          )}
          <h3 className="text-base font-semibold leading-snug text-kapruka-dark">{product.name}</h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-lg font-bold text-gray-900">Rs. {sel.price.toLocaleString()}</span>
            {product.compareAtPrice && (
              <span className="text-sm text-gray-400 line-through">
                Rs. {product.compareAtPrice.toLocaleString()}
              </span>
            )}
            {product.rating != null && <StarRating rating={product.rating} />}
            <span className={cn('text-xs', !sel.inStock ? 'text-gray-400' : lowStock ? 'text-amber-600' : 'text-kapruka-green')}>
              {sel.inStock ? `● ${stockLabel ?? 'In Stock'}` : 'Out of Stock'}
            </span>
          </div>

          {product.weight && (
            <p className="mt-0.5 text-xs text-gray-400">Net weight: {product.weight}</p>
          )}

          {/* Description (expandable) */}
          {product.description && (
            <div className="mt-2">
              <p className={cn('text-xs leading-relaxed text-gray-500', !descOpen && 'line-clamp-3')}>
                {product.description}
              </p>
              {product.description.length > 160 && (
                <button
                  type="button"
                  onClick={() => setDescOpen((v) => !v)}
                  className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-medium text-primary-600 hover:text-primary-700"
                >
                  {descOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {descOpen ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {/* Size variants */}
          {sel.hasVariants && (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Choose a size
              </p>
              <SizePicker variants={sel.variants} size={sel.size} onSelect={sel.setSize} />
            </div>
          )}

          {/* Cake icing greeting */}
          {product.isCake && (
            <div className="mt-3">
              <IcingInput value={sel.icing} onChange={sel.setIcing} />
            </div>
          )}

          {/* Personalised / photo gift note */}
          {product.needsPersonalization && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2">
              <Camera size={15} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="text-[11px] leading-relaxed text-amber-800">
                {product.personalizationNote ??
                  'This is a personalised item — add your photo and custom message on the Kapruka product page.'}
                {product.url && (
                  <>
                    {' '}
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline"
                    >
                      Open product page
                    </a>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Quantity + add */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <QtyStepper qty={sel.qty} setQty={sel.setQty} />
            <button
              type="button"
              onClick={primaryAction}
              disabled={!sel.inStock}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-95',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-40',
                sel.isSelected
                  ? 'bg-kapruka-orange text-white hover:bg-kapruka-orange/90'
                  : 'btn-primary',
              )}
            >
              {sel.isSelected ? <Check size={15} strokeWidth={3} /> : <ShoppingCart size={15} />}
              {sel.isSelected ? 'In cart — update' : 'Add to cart'}
            </button>
          </div>

          {((sel.hasVariants && sel.qty > 1) || (product.isCake && sel.icing.trim())) && (
            <div className="mt-2 space-y-0.5">
              {sel.hasVariants && sel.qty > 1 && (
                <p className="text-xs text-gray-500">
                  Total for {sel.qty}:{' '}
                  <span className="font-semibold text-kapruka-dark">Rs. {lineTotal.toLocaleString()}</span>
                </p>
              )}
              {product.isCake && sel.icing.trim() && (
                <p className="text-xs text-gray-500">
                  Icing: <span className="font-medium text-kapruka-dark">“{sel.icing.trim()}”</span>
                </p>
              )}
            </div>
          )}

          {product.url && (
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-kapruka-orange"
            >
              <Truck size={12} /> View full details on Kapruka
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};
