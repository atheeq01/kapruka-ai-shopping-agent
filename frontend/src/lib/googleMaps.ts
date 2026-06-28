import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

/**
 * Google Maps JS API key, read from Vite env at build time.
 * Add it to `frontend/.env` as:  VITE_GOOGLE_MAPS_API_KEY=your_key_here
 * (Enable "Maps JavaScript API" + "Geocoding API" on the key, with billing.)
 */
export const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? '';

export const hasGoogleMapsKey = GOOGLE_MAPS_API_KEY.length > 0;

/** Colombo — sensible default centre when an address can't be geocoded. */
export const DEFAULT_CENTER = { lat: 6.9271, lng: 79.8612 };

let configured = false;
let loadPromise: Promise<void> | null = null;

/**
 * Loads the Maps, Marker and Geocoding libraries exactly once (init-once).
 * After this resolves the global `google.maps` namespace is ready to use.
 * Throws if no API key is configured so callers can show a fallback.
 */
export function loadGoogleMaps(): Promise<void> {
  if (!hasGoogleMapsKey) {
    return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'));
  }
  if (loadPromise) return loadPromise;

  if (!configured) {
    setOptions({ key: GOOGLE_MAPS_API_KEY, v: 'weekly', region: 'LK', language: 'en' });
    configured = true;
  }

  loadPromise = Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('geocoding'),
    importLibrary('places'),
  ]).then(() => undefined);

  return loadPromise;
}
