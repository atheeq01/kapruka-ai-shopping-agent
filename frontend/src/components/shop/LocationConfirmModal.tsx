import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Check, Loader2, AlertTriangle, Crosshair } from 'lucide-react';
import { loadGoogleMaps, hasGoogleMapsKey, DEFAULT_CENTER } from '../../lib/googleMaps';
import { PlacesAutocomplete, type PlaceResult } from './PlacesAutocomplete';

export interface ConfirmedLocation {
  lat: number | null;
  lng: number | null;
  formattedAddress: string;
  mapsUrl?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Typed street address — used to geocode the initial pin. */
  address: string;
  /** Typed city — appended to improve geocoding accuracy. */
  city: string;
  /** Previously confirmed pin, so re-opening restores it. */
  initial?: ConfirmedLocation | null;
  onConfirm: (loc: ConfirmedLocation) => void;
}

const mapsUrlFor = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;

/** Promisified forward/reverse geocode. */
function geocode(
  geocoder: google.maps.Geocoder,
  request: google.maps.GeocoderRequest,
): Promise<google.maps.GeocoderResult | null> {
  return new Promise((resolve) => {
    geocoder.geocode(request, (results, status) => {
      resolve(status === 'OK' && results && results.length > 0 ? results[0] : null);
    });
  });
}

const LocationConfirmModalInner: React.FC<Props> = ({ open, onClose, address, city, initial, onConfirm }) => {
  const mapDivRef   = useRef<HTMLDivElement | null>(null);
  const mapRef      = useRef<google.maps.Map | null>(null);
  const markerRef   = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [formatted, setFormatted] = useState(initial?.formattedAddress ?? '');
  const [coords, setCoords]     = useState<{ lat: number; lng: number } | null>(
    initial?.lat != null && initial?.lng != null ? { lat: initial.lat, lng: initial.lng } : null,
  );

  // Reverse-geocode a dragged/clicked pin into a human address.
  const applyPosition = async (lat: number, lng: number) => {
    setCoords({ lat, lng });
    const geocoder = geocoderRef.current;
    if (!geocoder) return;
    const result = await geocode(geocoder, { location: { lat, lng } });
    if (result) setFormatted(result.formatted_address);
  };

  // Initialise the map each time the modal opens.
  useEffect(() => {
    if (!open) return;

    if (!hasGoogleMapsKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      setError('NO_KEY');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadGoogleMaps()
      .then(async () => {
        if (cancelled || !mapDivRef.current) return;

        const start = coords ?? DEFAULT_CENTER;
        const map = new google.maps.Map(mapDivRef.current, {
          center: start,
          zoom: coords ? 16 : 13,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
        });
        const marker = new google.maps.Marker({
          map,
          position: start,
          draggable: true,
          animation: google.maps.Animation.DROP,
        });
        const geocoder = new google.maps.Geocoder();
        mapRef.current = map;
        markerRef.current = marker;
        geocoderRef.current = geocoder;

        // Keep the pin draggable AND tappable: drag end + map click both move it.
        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (pos) void applyPosition(pos.lat(), pos.lng());
        });
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            marker.setPosition(e.latLng);
            void applyPosition(e.latLng.lat(), e.latLng.lng());
          }
        });

        // If we don't already have a confirmed pin, geocode the typed address.
        if (!coords) {
          const query = [address, city, 'Sri Lanka'].filter(Boolean).join(', ');
          const result = await geocode(geocoder, { address: query });
          if (cancelled) return;
          if (result) {
            const loc = result.geometry.location;
            map.setCenter(loc);
            map.setZoom(16);
            marker.setPosition(loc);
            setCoords({ lat: loc.lat(), lng: loc.lng() });
            setFormatted(result.formatted_address);
          } else {
            setFormatted(city ? `${city}, Sri Lanka` : 'Drag the pin to your location');
            setCoords(DEFAULT_CENTER);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[maps] load failed:', err);
        setError('LOAD_FAILED');
        setLoading(false);
      });

    return () => {
      cancelled = true;
      mapRef.current = null;
      markerRef.current = null;
      geocoderRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Picking a search suggestion moves the pin straight to that place.
  const handleSearchSelect = (p: PlaceResult) => {
    setCoords({ lat: p.lat, lng: p.lng });
    setFormatted(p.formattedAddress);
    const map = mapRef.current;
    const marker = markerRef.current;
    if (map && marker) {
      const pos = { lat: p.lat, lng: p.lng };
      map.setCenter(pos);
      map.setZoom(16);
      marker.setPosition(pos);
    }
  };

  const recenterToAddress = async () => {
    const geocoder = geocoderRef.current;
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!geocoder || !map || !marker) return;
    const query = [address, city, 'Sri Lanka'].filter(Boolean).join(', ');
    const result = await geocode(geocoder, { address: query });
    if (result) {
      const loc = result.geometry.location;
      map.setCenter(loc);
      map.setZoom(16);
      marker.setPosition(loc);
      setCoords({ lat: loc.lat(), lng: loc.lng() });
      setFormatted(result.formatted_address);
    }
  };

  const handleConfirm = () => {
    onConfirm({
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      formattedAddress: formatted || [address, city].filter(Boolean).join(', '),
      mapsUrl: coords ? mapsUrlFor(coords.lat, coords.lng) : undefined,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl shadow-violet-950/20"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-pink-500" />
                <h3 className="text-sm font-bold text-gray-800">Confirm delivery location</h3>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            </div>

            {/* Map area */}
            <div className="relative h-72 w-full bg-violet-50">
              {/* The map mounts into this div */}
              <div ref={mapDivRef} className="absolute inset-0 h-full w-full" />

              {loading && !error && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-violet-50/80 text-violet-500">
                  <Loader2 size={22} className="animate-spin" />
                  <span className="text-xs font-medium">Locating your address…</span>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-8 text-center">
                  <AlertTriangle size={22} className="text-amber-500" />
                  <p className="text-sm font-semibold text-gray-700">
                    {error === 'NO_KEY' ? 'Map not configured' : "Couldn't load the map"}
                  </p>
                  <p className="text-xs leading-relaxed text-gray-500">
                    {error === 'NO_KEY'
                      ? 'Add VITE_GOOGLE_MAPS_API_KEY to frontend/.env to show the interactive map. You can still confirm the typed address below.'
                      : 'Check your network or API key. You can still confirm the typed address below.'}
                  </p>
                </div>
              )}

              {/* Search bar overlay (only with a live map) */}
              {!error && (
                <div className="absolute left-3 right-3 top-3 z-10">
                  <PlacesAutocomplete
                    onSelect={handleSearchSelect}
                    className="rounded-xl bg-white shadow-md ring-1 ring-black/5 [&_gmp-place-autocomplete]:w-full"
                  />
                </div>
              )}

              {/* Recenter button (only with a live map) */}
              {!loading && !error && (
                <button
                  onClick={recenterToAddress}
                  title="Re-center to typed address"
                  className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-md ring-1 ring-black/5 transition-colors hover:text-pink-500"
                >
                  <Crosshair size={13} /> Re-center
                </button>
              )}
            </div>

            {/* Footer: resolved address + confirm */}
            <div className="px-5 py-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Pinned address</p>
              <p className="mb-3 min-h-[2.5rem] rounded-xl bg-gray-50 px-3 py-2 text-sm leading-relaxed text-gray-700">
                {formatted || [address, city].filter(Boolean).join(', ') || 'Enter an address first'}
              </p>
              {!error && (
                <p className="mb-3 text-center text-[11px] text-gray-400">
                  Drag the pin or tap the map to adjust the exact spot.
                </p>
              )}
              <button
                onClick={handleConfirm}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: 'linear-gradient(135deg, #ff3fa1, #ff007c)' }}
              >
                <Check size={16} /> Confirm this location
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const LocationConfirmModal = (props: Props) =>
  createPortal(<LocationConfirmModalInner {...props} />, document.body);
