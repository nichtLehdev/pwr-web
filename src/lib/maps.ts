/** The location fields a maps link can be built from. */
export interface MappableLocation {
  name?: string | null;
  street?: string | null;
  zipCode?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Google Maps URL for a location, or null when there is nothing to point at.
 *
 * Coordinates win whenever they are set: they open directions to the exact
 * spot, while a text query only guesses from an address that is often
 * ambiguous — a "Gemeindehaus" exists in every second Ort. Without
 * coordinates the search form is the honest fallback; it shows the place and
 * lets the user start navigation from there.
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
