import type { PrismaClient } from "~/generated/prisma/client";
import { geocodeAddress, delay } from "@/server/utils/geocoding";
import {
  addressFilter,
  locationCacheKey,
  trimmed,
  type ImportLocation,
} from "@/server/utils/ensemble-import";

/**
 * The slice of the Prisma client the resolver needs. Passed in rather than
 * imported so this module stays usable from scripts and tests.
 */
type LocationStore = Pick<PrismaClient, "location">;

/**
 * Resolves the `location` blocks of one import run: an address that already
 * exists is reused, everything else is created once and geocoded.
 *
 * Stateful per run on purpose. Two chors rehearsing at the same address must
 * not race into duplicate Locations, and Nominatim allows one lookup per
 * second — both only hold if the run resolves its addresses in sequence.
 */
export function createLocationResolver(db: LocationStore) {
  const cache = new Map<string, string>();
  let geocodeCalls = 0;

  return async function resolveLocation(
    raw: ImportLocation,
    ensembleName: string,
  ): Promise<string> {
    const street = trimmed(raw.street);
    const zipCode = trimmed(raw.zipCode);
    const city = trimmed(raw.city);
    const country = trimmed(raw.country);

    if (!city) {
      throw new Error(
        `Probenort ohne Ort (city) fuer Ensemble: ${ensembleName}`,
      );
    }

    const key = locationCacheKey({ street, zipCode, city, country });
    const cached = cache.get(key);
    if (cached) return cached;

    const existing = await db.location.findFirst({
      where: {
        street: addressFilter(street),
        zipCode: addressFilter(zipCode),
        city: { equals: city, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (existing) {
      cache.set(key, existing.id);
      return existing.id;
    }

    // Nominatim's budget is one request per second, so every lookup after the
    // first waits its turn.
    if (geocodeCalls > 0) await delay(1100);
    geocodeCalls += 1;
    const { latitude, longitude } = await geocodeAddress({
      street,
      zipCode,
      city,
      country,
    });

    const created = await db.location.create({
      data: {
        name: trimmed(raw.name),
        street,
        zipCode,
        city,
        country: country ?? "Deutschland",
        additionalInfo: trimmed(raw.additionalInfo),
        latitude,
        longitude,
      },
      select: { id: true },
    });

    cache.set(key, created.id);
    return created.id;
  };
}
