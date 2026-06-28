const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || 'http://localhost:8000';

export interface Category {
  name: string;
  slug?: string;
  emoji?: string;
  count?: number;
  image?: string;
}

const FALLBACK_CATEGORIES: Category[] = [
  { name: 'Flowers',        emoji: '🌸' },
  { name: 'Birthday Cakes', emoji: '🎂' },
  { name: 'Gifts',          emoji: '🎁' },
  { name: 'Fruit Baskets',  emoji: '🍓' },
  { name: 'Chocolates',     emoji: '🍫' },
  { name: 'Wine & Spirits', emoji: '🍷' },
  { name: 'Jewellery',      emoji: '💍' },
  { name: 'Plants',         emoji: '🌿' },
  { name: 'Personalised',   emoji: '✍️' },
  { name: 'Kids & Toys',    emoji: '🧸' },
  { name: 'Hampers',        emoji: '🎀' },
  { name: 'Stationery',     emoji: '📝' },
];

export interface GiftMessageContext {
  recipient_name?: string;
  sender_name?: string;
  occasion?: string;
  relationship?: string;
  items?: string[];
  language?: string;
  anonymous?: boolean;
}

/** Ask the agent to draft a heartfelt gift-card message. Throws on failure. */
export async function writeGiftMessage(ctx: GiftMessageContext): Promise<string> {
  const res = await fetch(`${API_BASE}/api/gift-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ctx),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return String(data.message ?? '').trim();
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE}/api/categories`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return FALLBACK_CATEGORIES;
    const data = await res.json();
    const cats = (data.categories as Category[]) ?? [];
    return cats.length > 0 ? cats : FALLBACK_CATEGORIES;
  } catch {
    return FALLBACK_CATEGORIES;
  }
}
