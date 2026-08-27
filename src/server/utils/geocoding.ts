/**
 * Geocoding utility using OpenStreetMap Nominatim API
 * Free, no API key required, but please respect rate limits (1 request per second)
 */

import { env } from "@/env";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Geocoding");

interface GeocodeResult {
  latitude: number | null;
  longitude: number | null;
}

/**
 * Geocode an address to get latitude and longitude coordinates
 * @param address - Address object with street, zipCode, and city
 * @returns Promise with latitude and longitude, or null if geocoding fails
 */
export async function geocodeAddress(address: {
  street?: string | null;
  zipCode?: string | null;
  city: string;
  country?: string | null;
}): Promise<GeocodeResult> {
  try {
    const queryParts: string[] = [];

    if (address.street) {
      queryParts.push(address.street);
    }
    if (address.zipCode) {
      queryParts.push(address.zipCode);
    }
    if (address.city) {
      queryParts.push(address.city);
    }

    // Nominatim understands localised country names, so the stored value can
    // be passed straight through; fall back to our default catchment area.
    queryParts.push(address.country?.trim() || "Germany");

    const query = queryParts.join(", ");

    if (!query.trim()) {
      return { latitude: null, longitude: null };
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;

    const userAgentEmail = env.SMTP_FROM || "noreply@posaunenwerk.de";
    const response = await fetch(url, {
      headers: {
        "User-Agent": `Posaunenwerk/1.0 (${userAgentEmail})`,
      },
    });

    if (!response.ok) {
      log.error("Geocoding API error:", response.statusText);
      return { latitude: null, longitude: null };
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);

      if (!isNaN(lat) && !isNaN(lon)) {
        return {
          latitude: lat,
          longitude: lon,
        };
      }
    }

    return { latitude: null, longitude: null };
  } catch (error) {
    log.error("Geocoding error:", error);
    return { latitude: null, longitude: null };
  }
}

/**
 * Add a small delay to respect Nominatim rate limits (1 request per second)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
