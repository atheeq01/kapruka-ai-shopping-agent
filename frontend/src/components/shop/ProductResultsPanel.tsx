import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LayoutGrid, List as ListIcon, Package } from 'lucide-react';
import { cn } from '../../lib/utils';
import { normalizeProduct } from '../../lib/normalizeProduct';
import { ProductCard } from './ProductCard';

type SortOption = 'relevance' | 'price_asc' | 'price_desc';

const SORT_LABELS: Record<SortOption, string> = {
  relevance: 'Relevance',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
};

const PAGE_SIZE = 8;

interface ProductResultsPanelProps {
  products: any[];
}

export const ProductResultsPanel: React.FC<ProductResultsPanelProps> = ({ products }) => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<SortOption>('relevance');
  const [sortOpen, setSortOpen] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sortRef = useRef<HTMLDivElement>(null);

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
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="my-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-violet-50/60 to-transparent px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Package size={15} className="shrink-0 text-violet-600" />
          <span className="truncate text-sm font-semibold text-kapruka-dark">{category}</span>
          <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600">
            {normalized.length} results
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Sort dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setSortOpen((o) => !o)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              {SORT_LABELS[sort]} <ChevronDown size={12} className={cn('transition-transform', sortOpen && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {sortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg"
                >
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => { setSort(opt); setSortOpen(false); }}
                      className={cn(
                        'block w-full px-4 py-2 text-left text-xs transition-colors hover:bg-violet-50',
                        sort === opt ? 'font-semibold text-violet-600' : 'text-gray-600',
                      )}
                    >
                      {SORT_LABELS[opt]}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px bg-gray-100">
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
            className="rounded-full border border-violet-200 bg-violet-50 px-5 py-1.5 text-xs font-semibold text-violet-600 transition-colors hover:bg-violet-100 active:scale-95"
          >
            Show more ({sorted.length - visible} remaining)
          </button>
        </div>
      )}
    </motion.div>
  );
};
