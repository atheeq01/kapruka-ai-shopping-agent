import React, { useEffect, useRef } from 'react';
import { loadGoogleMaps, hasGoogleMapsKey } from '../../lib/googleMaps';

export interface PlaceResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  city?: string;
}

interface Props {
  onSelect: (place: PlaceResult) => void;
  className?: string;
}

/** Pull a human city name out of a place's address components. */
function extractCity(components?: google.maps.places.AddressComponent[]): string | undefined {
  if (!components) return undefined;
  const byType = (t: string) => components.find((c) => c.types.includes(t));
  const match =
    byType('locality') ??
    byType('postal_town') ??
    byType('administrative_area_level_2') ??
    byType('administrative_area_level_1');
  return match?.longText ?? undefined;
}

/**
 * Wraps the new Google Places `PlaceAutocompleteElement` web component, biased to
 * Sri Lanka. Renders nothing when no API key is configured (the typed address
 * field still works as a fallback).
 */
export const PlacesAutocomplete: React.FC<Props> = ({ onSelect, className }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  // Keep the latest handler in a ref so the element isn't torn down and
  // recreated when the parent passes a new closure (advanced-use-latest).
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!hasGoogleMapsKey) return;
    let element: HTMLElement | null = null;
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !hostRef.current) return;
        const pac = new google.maps.places.PlaceAutocompleteElement({
          includedRegionCodes: ['lk'],
        });
        pac.style.width = '100%';
        element = pac;
        hostRef.current.appendChild(pac);

        pac.addEventListener('gmp-select', async (event) => {
          const { placePrediction } = event as google.maps.places.PlacePredictionSelectEvent;
          const place = placePrediction.toPlace();
          await place.fetchFields({ fields: ['location', 'formattedAddress', 'addressComponents'] });
          const loc = place.location;
          if (!loc) return;
          onSelectRef.current({
            lat: loc.lat(),
            lng: loc.lng(),
            formattedAddress: place.formattedAddress ?? '',
            city: extractCity(place.addressComponents ?? undefined),
          });
        });
      })
      .catch((err) => console.error('[places] autocomplete load failed:', err));

    return () => {
      cancelled = true;
      element?.parentNode?.removeChild(element);
    };
  }, []);

  if (!hasGoogleMapsKey) return null;
  return <div ref={hostRef} className={className} />;
};
