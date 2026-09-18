/**
 * Type-ahead address search via Photon (https://photon.komoot.io): Nominatim's
 * usage policy forbids search-as-you-type. Save-time geocoding: ./geocoding.ts.
 */
import { createLogger } from "@/server/utils/logger";

const log = createLogger("Address Search");

/** Roughly the centre of the Rheinland — biases results towards our area. */
const BIAS_LAT = 50.9;
const BIAS_LON = 7.0;

/** Soft bias (0–1): pulls nearby hits up without hiding the rest of Germany. */
const BIAS_SCALE = 0.4;

const REQUEST_TIMEOUT_MS = 5000;

export interface AddressSuggestion {
  id: string;
  label: string;
  name: string | null;
  street: string | null;
  zipCode: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

interface PhotonProperties {
  osm_id?: number;
  osm_type?: string;
  osm_key?: string;
  osm_value?: string;
  type?: string;
  name?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  city?: string;
  district?: string;
  locality?: string;
  country?: string;
  countrycode?: string;
}

interface PhotonFeature {
  properties?: PhotonProperties;
  geometry?: { coordinates?: unknown };
}

/** Photon `type` values where `name` is the place itself, not a venue. */
const PLACE_TYPES = new Set(["city", "district", "locality", "county"]);

function toSuggestion(feature: PhotonFeature): AddressSuggestion | null {
  const props = feature.properties;
  const coords = feature.geometry?.coordinates;

  if (!props || !Array.isArray(coords) || coords.length < 2) {
    return null;
  }

  // Photon returns GeoJSON order: [longitude, latitude].
  const longitude = Number(coords[0]);
  const latitude = Number(coords[1]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const isPlace = props.type ? PLACE_TYPES.has(props.type) : false;
  const isPostcode = props.osm_value === "postcode";

  const street = props.street
    ? [props.street, props.housenumber].filter(Boolean).join(" ")
    : props.type === "street"
      ? (props.name ?? null)
      : null;

  const zipCode = props.postcode ?? (isPostcode ? (props.name ?? null) : null);

  // Bei Städten/Orten steht der Name selbst im `name`-Feld, nicht in `city`.
  let city = props.city ?? null;
  if (!city && isPlace) {
    city = props.name ?? null;
  }
  if (!city) {
    city = props.district ?? null;
  }

  // Only a venue name belongs here; Photon also returns city/postcode under `name`.
  const name =
    props.type === "house" && props.name && props.name !== city
      ? props.name
      : null;

  const country = props.country ?? null;
  const isGerman = props.countrycode === "DE";

  const label = [
    name,
    street,
    [zipCode, city].filter(Boolean).join(" "),
    // Nur auswärtige Treffer brauchen das Land zur Unterscheidung.
    isGerman ? null : country,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  if (!label) {
    return null;
  }

  return {
    id: `${props.osm_type ?? "x"}${props.osm_id ?? label}`,
    label,
    name,
    street,
    zipCode,
    city,
    country,
    latitude,
    longitude,
  };
}

/** Never throws: a failing autocomplete must not block typing the address by hand. */
export async function searchAddresses(
  query: string,
  limit = 5,
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return [];
  }

  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}` +
    `&lang=de&limit=${limit * 2}` +
    `&lat=${BIAS_LAT}&lon=${BIAS_LON}&location_bias_scale=${BIAS_SCALE}`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Posaunenwerk/1.0 (+https://posaunenwerk.de)" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      log.error("Photon API error:", response.status, response.statusText);
      return [];
    }

    const data: unknown = await response.json();
    const features =
      data && typeof data === "object" && "features" in data
        ? (data as { features?: unknown }).features
        : null;

    if (!Array.isArray(features)) {
      return [];
    }

    const seen = new Set<string>();
    const german: AddressSuggestion[] = [];
    const abroad: AddressSuggestion[] = [];

    for (const feature of features as PhotonFeature[]) {
      const suggestion = toSuggestion(feature);
      if (!suggestion || seen.has(suggestion.label)) {
        continue;
      }

      seen.add(suggestion.label);
      // Postcodes also match abroad, so German hits come first; foreign ones stay reachable.
      (feature.properties?.countrycode === "DE" ? german : abroad).push(
        suggestion,
      );
    }

    return [...german, ...abroad].slice(0, limit);
  } catch (error) {
    log.error("Address search error:", error);
    return [];
  }
}
