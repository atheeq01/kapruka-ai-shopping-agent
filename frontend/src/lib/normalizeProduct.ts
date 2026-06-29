/* eslint-disable @typescript-eslint/no-explicit-any --
   This module's whole job is to normalize arbitrary, loosely-typed backend JSON
   (varying field names: product_id|id, image_url|image, nested price objects…)
   into the strict NormalizedProduct shape. Dynamic `any` access at this boundary
   is intentional; downstream code consumes the typed result. */

export interface ProductVariant {
  label: string;
  price: number;
  inStock: boolean;
  weight?: string;
}

export interface NormalizedProduct {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  image?: string;
  images?: string[];
  inStock: boolean;
  stockLevel?: string;
  category?: string;
  rating?: number;
  purchaseCount?: number;
  variants?: ProductVariant[];
  weight?: string;
  url?: string;
  description?: string;
  summary?: string;
  vendor?: string;
  /** Cake → can carry an iced-on greeting (icing_text). */
  isCake?: boolean;
  /** Personalised/photo gift → photo & custom text added on Kapruka checkout. */
  needsPersonalization?: boolean;
  personalizationNote?: string;
}

/**
 * Backend tool results aren't guaranteed to use one consistent field naming
 * (we've already seen `product_id` vs `id`, `image_url` vs `image`, etc).
 * Normalize once here so every component downstream can trust the shape.
 */
/**
 * Coerce a loosely-typed price field into a number. Handles plain numbers,
 * numeric strings ("Rs. 4,500" / "4500.00"), and nested money objects
 * ({ amount: 4500 }). Returns 0 only when truly nothing parseable is present —
 * which is what was incorrectly showing as "Rs. 0" when valid prices lived in
 * un-checked field names or string form.
 */
function parsePrice(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.]/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return parsePrice(o.amount ?? o.price ?? o.unit_price ?? o.value);
  }
  return 0;
}

export function normalizeProduct(raw: any): NormalizedProduct {
  const rating = raw.rating ?? raw.average_rating ?? raw.avg_rating ?? raw.stars;
  const purchaseCount =
    raw.purchaseCount ?? raw.purchase_count ?? raw.sold_count ?? raw.orders ?? raw.buyers;

  const rawVariants = Array.isArray(raw.variants) ? raw.variants : undefined;
  const variants: ProductVariant[] | undefined = rawVariants
    ?.map((v: any) => ({
      label: String(v.label ?? v.name ?? v.size ?? ''),
      price: parsePrice(v.price ?? v.amount ?? v.selling_price ?? v.sale_price),
      inStock: v.inStock ?? v.in_stock ?? v.available ?? true,
      ...(v.weight && { weight: String(v.weight) }),
    }))
    .filter((v: ProductVariant) => v.label);

  const images = Array.isArray(raw.images)
    ? (raw.images as any[]).map(String).filter(Boolean)
    : undefined;
  const primaryImage =
    raw.image ?? raw.image_url ?? raw.imageUrl ?? raw.thumbnail ?? images?.[0];
  const rawCompare = raw.compareAtPrice ?? raw.compare_at_price;
  const compareAtPrice = (function() {
    if (!rawCompare) return 0;
    if (typeof rawCompare === 'object' && rawCompare !== null) {
      return Number(rawCompare.amount ?? rawCompare.price ?? 0);
    }
    return Number(rawCompare);
  })();

  return {
    id: String(raw.id ?? raw.product_id ?? raw.productId ?? crypto.randomUUID()),
    name: raw.name ?? raw.title ?? 'Unnamed product',
    price: parsePrice(
      raw.price ?? raw.unit_price ?? raw.amount ?? raw.selling_price ??
      raw.sale_price ?? raw.current_price ?? raw.price_lkr ?? raw.mrp,
    ),
    ...(compareAtPrice > 0 && { compareAtPrice }),
    image: primaryImage,
    ...(images && images.length > 0 && { images }),
    inStock: raw.inStock ?? raw.in_stock ?? raw.available ?? true,
    ...(raw.stockLevel ?? raw.stock_level
      ? { stockLevel: String(raw.stockLevel ?? raw.stock_level) }
      : {}),
    category: (function() {
      const cat = raw.category ?? raw.category_name ?? raw.type;
      if (!cat) return undefined;
      if (typeof cat === 'object') {
        return String(cat.name ?? cat.slug ?? cat.id ?? '');
      }
      return String(cat);
    })(),
    ...(rating != null && { rating: Number(rating) }),
    ...(purchaseCount != null && { purchaseCount: Number(purchaseCount) }),
    ...(variants && variants.length > 0 && { variants }),
    ...(raw.weight && { weight: String(raw.weight) }),
    ...((raw.url ?? raw.product_url) && { url: String(raw.url ?? raw.product_url) }),
    ...((raw.description ?? raw.desc ?? raw.short_description ?? raw.summary) && {
      description: String(raw.description ?? raw.desc ?? raw.short_description ?? raw.summary),
    }),
    ...(raw.summary && { summary: String(raw.summary) }),
    ...(raw.vendor && { vendor: String(raw.vendor) }),
    ...(raw.isCake && { isCake: true }),
    ...(raw.needsPersonalization && { needsPersonalization: true }),
    ...(raw.personalizationNote && { personalizationNote: String(raw.personalizationNote) }),
  };
}
