import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LayoutGrid, List as ListIcon, Package } from 'lucide-react';
import { cn } from '../../lib/utils';
import { normalizeProduct } from '../../lib/normalizeProduct';
import { easeOutExpo } from '../../lib/motion';
import { ProductCard } from './ProductCard';

type SortOption = 'relevance' | 'price_asc' | 'price_desc';

const SORT_LABELS: Record<SortOption, string> = {
  relevance: 'Relevance',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
};

const PAGE_SIZE = 8;

interface ProductResultsPanelProps {
  products: unknown[];
}

export const ProductResultsPanel: React.FC<ProductResultsPanelProps> = ({ products }) => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<SortOption>('relevance');
  const [sortOpen, setSortOpen] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sortBtnRef = useRef<HTMLButtonElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  // Anchor the Sort menu to its trigger, matching the trigger width, flipping
  // above when there isn't room below, and portaled to <body> so it never clips
  // inside the rounded results card (Bug 3).
  const positionMenu = () => {
    const btn = sortBtnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const menuW = 180;
    const menuH = 150;
    const left = Math.min(Math.max(8, r.right - menuW), window.innerWidth - menuW - 8);
    const flipUp = r.bottom + menuH > window.innerHeight - 8 && r.top > menuH;
    setMenuStyle({
      position: 'fixed',
      width: menuW,
      left,
      zIndex: 9999,
      ...(flipUp ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
    });
  };

  useLayoutEffect(() => {
    if (sortOpen) positionMenu();
  }, [sortOpen]);

  useEffect(() => {
    if (!sortOpen) return;
    const reposition = () => positionMenu();
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (sortBtnRef.current?.contains(t) || sortMenuRef.current?.contains(t)) return;
      setSortOpen(false);
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      document.removeEventListener('mousedown', onClick);
    };
  }, [sortOpen]);

  const normalized = useMemo(() => products.map(normalizeProduct), [products]);
  const category = normalized[0]?.category ?? 'Results';

  const sorted = useMemo(() => {
    if (sort === 'price_asc') return [...normalized].sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') return [...normalized].sort((a, b) => b.price - a.price);
    return normalized;
  }, [normalized, sort]);

  const shown = sorted.slice(0, visible);
  const hasMore = visible < sorted.length;

  if (normalized.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
      className="my-3 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(17,12,46,0.04),0_8px_28px_-12px_rgba(124,58,237,0.18)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-primary-50/60 to-transparent px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Package size={15} className="shrink-0 text-primary-600" />
          <span className="truncate text-sm font-semibold text-kapruka-dark">{category}</span>
          <span className="shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
            {normalized.length} results
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Sort dropdown — anchored + portaled (Bug 3) */}
          <button
            ref={sortBtnRef}
            type="button"
            onClick={() => setSortOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 rounded"
          >
            {SORT_LABELS[sort]} <ChevronDown size={12} className={cn('transition-transform', sortOpen && 'rotate-180')} />
          </button>
          {createPortal(
            <AnimatePresence>
              {sortOpen && (
                <motion.div
                  ref={sortMenuRef}
                  role="listbox"
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  style={menuStyle}
                  className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg"
                >
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      role="option"
                      aria-selected={sort === opt}
                      onClick={() => { setSort(opt); setSortOpen(false); }}
                      className={cn(
                        'block w-full px-4 py-2 text-left text-xs transition-colors hover:bg-primary-50',
                        sort === opt ? 'font-semibold text-primary-600' : 'text-gray-600',
                      )}
                    >
                      {SORT_LABELS[opt]}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )}

          {/* View toggle */}
          <div className="flex items-center bg-gray-50 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setView('grid')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                view === 'grid' ? 'bg-white shadow-sm text-kapruka-dark' : 'text-gray-400 hover:text-gray-600',
              )}
              title="Grid view"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                view === 'list' ? 'bg-white shadow-sm text-kapruka-dark' : 'text-gray-400 hover:text-gray-600',
              )}
              title="List view"
            >
              <ListIcon size={14} />
            </button>
          </div>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-1 @[20rem]:grid-cols-2 @md:grid-cols-3 @2xl:grid-cols-4 @5xl:grid-cols-5 gap-4 @md:gap-5 p-4 bg-gray-50/50">
          {shown.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} view="grid" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-gray-100">
          {shown.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} view="list" />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-full border border-primary-200 bg-primary-50 px-5 py-1.5 text-xs font-semibold text-primary-600 transition-colors hover:bg-primary-100 active:scale-95"
          >
            Show more ({sorted.length - visible} remaining)
          </button>
        </div>
      )}
    </motion.div>
  );
};
