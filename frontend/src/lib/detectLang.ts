/**
 * Client-side language detection — zero network calls.
 * Mirrors backend language.py quick_detect logic exactly.
 */

const TAMIL_RE   = /[஀-௿]/;
const SINHALA_RE = /[඀-෿]/;
const WORD_RE    = /\b[a-z]+\b/g;

const TA_ROM = new Set([
  'enna', 'epdi', 'illa', 'romba', 'vanakkam', 'machan', 'seri',
  'sollu', 'theriyum', 'venum', 'irukku', 'nalla', 'ponga', 'thambi',
  'enakku', 'unakku', 'kandippa', 'paaru', 'kelunga', 'ungalukku',
]);
const SI_ROM = new Set([
  'kohomada', 'mama', 'eka', 'neda', 'hari', 'puluwan', 'oyage',
  'mata', 'banne', 'aiya', 'kiyanna', 'ganna', 'denna', 'tikak',
  'monawada', 'hodai', 'api', 'meka', 'ohe', 'wage',
]);
const WEAK = new Set(['da', 'bro', 'pa', 'ne', 'la']);

export type LangCode = 'en' | 'ta' | 'si' | 'ta-rom' | 'si-rom';

export const LANG_CONFIG: Record<LangCode, { label: string; short: string; className: string }> = {
  'en':     { label: 'English',        short: 'EN',  className: 'bg-blue-100 text-blue-700 border-blue-200' },
  'ta':     { label: 'Tamil',          short: 'TA',  className: 'bg-orange-100 text-orange-700 border-orange-200' },
  'si':     { label: 'Sinhala',        short: 'SI',  className: 'bg-green-100 text-green-700 border-green-200' },
  'ta-rom': { label: 'Romanized Tamil', short: 'TA~', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  'si-rom': { label: 'Singlish',       short: 'SI~', className: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
};

export function quickDetect(text: string): LangCode | null {
  if (!text.trim()) return 'en';
  if (TAMIL_RE.test(text)) return 'ta';
  if (SINHALA_RE.test(text)) return 'si';

  const words = new Set<string>(Array.from(text.toLowerCase().matchAll(WORD_RE), m => m[0]));
  let ta = 0;
  let si = 0;

  words.forEach(w => {
    if (TA_ROM.has(w)) ta += 2;
    if (SI_ROM.has(w)) si += 2;
    if (WEAK.has(w)) { ta += 1; si += 1; }
  });

  if (ta === 0 && si === 0) return words.size > 3 ? 'en' : null;
  if (ta > si) return 'ta-rom';
  if (si > ta) return 'si-rom';
  return null; // tied — ambiguous
}
