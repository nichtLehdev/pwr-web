export interface MappableLocation {
  name?: string | null;
  street?: string | null;
  zipCode?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Coordinates win: they open directions to the exact spot, while an address
 * query is often ambiguous (a "Gemeindehaus" exists in every second Ort).
 */
export function locationMapsUrl(
  location: MappableLocation | null | undefined,
): string | null {
  if (!location) return null;

  const { latitude, longitude } = location;
  if (typeof latitude === "number" && typeof longitude === "number") {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }

  const query = [
    location.name,
    location.street,
    location.zipCode,
    location.city,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");

  if (!query) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
