/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Maps JavaScript API key (Maps JS + Geocoding enabled). */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
