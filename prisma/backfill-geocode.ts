/**
 * Backfill Script: Geocode Locations Missing Coordinates
 *
 * Finds all Location rows without latitude/longitude and geocodes them via
 * Nominatim, respecting its 1 request/second rate limit.
 *
 * Usage: npx tsx prisma/backfill-geocode.ts
 */
import "dotenv/config";
import { db } from "@/server/db";
import { geocodeAddress, delay } from "@/server/utils/geocoding";

async function main() {
  const locations = await db.location.findMany({
    where: {
      OR: [{ latitude: null }, { longitude: null }],
    },
  });

  console.log(`Found ${locations.length} locations missing coordinates.`);

  let succeeded = 0;
  const failed: { id: string; city: string; street: string | null }[] = [];

  for (const [index, location] of locations.entries()) {
    const result = await geocodeAddress({
      street: location.street,
      zipCode: location.zipCode,
      city: location.city,
    });

    if (result.latitude != null && result.longitude != null) {
      await db.location.update({
        where: { id: location.id },
        data: { latitude: result.latitude, longitude: result.longitude },
      });
      succeeded++;
      console.log(
        `[${index + 1}/${locations.length}] ✓ ${location.street ?? ""} ${location.city} -> ${result.latitude}, ${result.longitude}`,
      );
    } else {
      failed.push({
        id: location.id,
        city: location.city,
        street: location.street,
      });
      console.warn(
        `[${index + 1}/${locations.length}] ✗ ${location.street ?? ""} ${location.city} - geocoding failed`,
      );
    }

    if (index < locations.length - 1) {
      await delay(1100);
    }
  }

  console.log(`\nDone. Geocoded ${succeeded}/${locations.length} locations.`);
  if (failed.length > 0) {
    console.log(`Failed (${failed.length}):`);
    for (const f of failed) {
      console.log(`  - ${f.id}: ${f.street ?? ""} ${f.city}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
