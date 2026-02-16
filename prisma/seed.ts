/**
 * Seed Script for Posaunenwerk Database
 *
 * This script seeds system permissions into the database.
 * System permissions are hardcoded core permissions that cannot be deleted/modified via UI.
 */
import "dotenv/config";
import { db } from "@/server/db";
import { permissionsData } from "./seed-data/permissions";

async function main() {
  console.log("🌱 Starting database seed...");

  // Create System Permissions
  console.log("🔐 Creating system permissions...");
  await seedPermissions();

  console.log("✅ Seed completed successfully!");
}

async function seedPermissions() {
  for (const perm of permissionsData) {
    await db.permission.upsert({
      where: { key: perm.key },
      update: {
        // Update name/description if they changed, but keep isSystem true
        name: perm.name,
        description: perm.description,
        category: perm.category,
        isSystem: true,
      },
      create: perm,
    });
  }
  console.log(
    `  ✓ Created/Updated ${permissionsData.length} system permissions`,
  );
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
