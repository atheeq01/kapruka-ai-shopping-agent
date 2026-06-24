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
export function normalizeProduct(raw: any): NormalizedProduct {
  const rating = raw.rating ?? raw.average_rating ?? raw.avg_rating ?? raw.stars;
  const purchaseCount =
    raw.purchaseCount ?? raw.purchase_count ?? raw.sold_count ?? raw.orders ?? raw.buyers;

  const rawVariants = Array.isArray(raw.variants) ? raw.variants : undefined;
  const variants: ProductVariant[] | undefined = rawVariants
    ?.map((v: any) => ({
      label: String(v.label ?? v.name ?? v.size ?? ''),
      price: Number(v.price ?? v.amount ?? 0),
      inStock: v.inStock ?? v.in_stock ?? v.available ?? true,
      ...(v.weight && { weight: String(v.weight) }),
    }))
    .filter((v: ProductVariant) => v.label);

  const images = Array.isArray(raw.images)
    ? (raw.images as any[]).map(String).filter(Boolean)
    : undefined;
  const primaryImage =
    raw.image ?? raw.image_url ?? raw.imageUrl ?? raw.thumbnail ?? images?.[0];
  const compareAtPrice = Number(raw.compareAtPrice ?? raw.compare_at_price ?? 0);

  return {
    id: String(raw.id ?? raw.product_id ?? raw.productId ?? crypto.randomUUID()),
    name: raw.name ?? raw.title ?? 'Unnamed product',
    price: Number(raw.price ?? raw.unit_price ?? raw.amount ?? 0),
    ...(compareAtPrice > 0 && { compareAtPrice }),
    image: primaryImage,
    ...(images && images.length > 0 && { images }),
    inStock: raw.inStock ?? raw.in_stock ?? raw.available ?? true,
    ...(raw.stockLevel ?? raw.stock_level
      ? { stockLevel: String(raw.stockLevel ?? raw.stock_level) }
      : {}),
    category: raw.category ?? raw.category_name ?? raw.type,
    ...(rating != null && { rating: Number(rating) }),
    ...(purchaseCount != null && { purchaseCount: Number(purchaseCount) }),
    ...(variants && variants.length > 0 && { variants }),
    ...(raw.weight && { weight: String(raw.weight) }),
    ...((raw.url ?? raw.product_url) && { url: String(raw.url ?? raw.product_url) }),
    ...((raw.description ?? raw.desc ?? raw.short_description) && {
      description: String(raw.description ?? raw.desc ?? raw.short_description),
    }),
    ...(raw.summary && { summary: String(raw.summary) }),
    ...(raw.vendor && { vendor: String(raw.vendor) }),
    ...(raw.isCake && { isCake: true }),
    ...(raw.needsPersonalization && { needsPersonalization: true }),
    ...(raw.personalizationNote && { personalizationNote: String(raw.personalizationNote) }),
  };
}
