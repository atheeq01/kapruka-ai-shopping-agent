import { useState, useEffect, useRef } from 'react';
import { quickDetect, type LangCode } from '../lib/detectLang';

const API_BASE = 'http://localhost:8000';

/**
 * Detects language from input text.
 * - Instant local result via quickDetect (zero network)
 * - Confirmed by /api/detect-lang after 600ms debounce (handles ambiguous ASCII)
 */
export function useLanguageDetection(text: string): LangCode | null {
  const [detectedLang, setDetectedLang] = useState<LangCode | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef    = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!text.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetectedLang(null);
      return;
    }

    // Instant local guess — shown immediately
    const local = quickDetect(text);
    if (local) setDetectedLang(local);

    // Debounced server confirmation (for short/ambiguous ASCII)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`${API_BASE}/api/detect-lang`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
          signal: ctrl.signal,
        });
        if (res.ok) {
          const { detected_lang } = await res.json();
          if (detected_lang) setDetectedLang(detected_lang as LangCode);
        }
      } catch {
        /* abort or network error — keep local guess */
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text]);

  return detectedLang;
}
