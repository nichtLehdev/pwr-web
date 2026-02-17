/**
 * Seed Script for Posaunenwerk Database
 *
 * Permissions are now hardcoded in the codebase (src/lib/permissions.ts).
 * This seed script is kept for backwards compatibility but does nothing.
 */
import "dotenv/config";
import { db } from "@/server/db";

async function main() {
  console.log("🌱 Starting database seed...");
  console.log("ℹ️  Permissions are now hardcoded in the codebase - no seeding needed");
  console.log("✅ Seed completed successfully!");
}

// ============================================================================
// RUN
// ============================================================================

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    db.$disconnect();
    process.exit(1);
  });
