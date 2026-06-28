const API_BASE = 'http://localhost:8000';

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
