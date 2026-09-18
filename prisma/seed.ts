/** No-op, kept for compatibility; permissions live in src/lib/permissions.ts. */
import "dotenv/config";
import { db } from "@/server/db";

async function main() {
  console.log("🌱 Starting database seed...");
  console.log(
    "ℹ️  Permissions are now hardcoded in the codebase - no seeding needed",
  );
  console.log("✅ Seed completed successfully!");
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    db.$disconnect();
    process.exit(1);
  });
