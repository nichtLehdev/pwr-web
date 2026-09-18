/**
 * Creates or updates the admin user and grants all permissions directly.
 * Usage: npx tsx prisma/seed-user.ts
 */
import "dotenv/config";
import { db } from "@/server/db";
import { PERMISSION_DEFINITIONS } from "@/lib/permissions";

// Overridable via environment variables
const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || "lars.lehmann@posaunenwerk-rheinland.de";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "lars.lehmann";
const ADMIN_DISPLAY_NAME = process.env.ADMIN_DISPLAY_NAME || "Lars Lehmann";

async function main() {
  console.log("🌱 Starting user seed...");

  try {
    console.log(`👤 Creating/updating user: ${ADMIN_USERNAME}...`);
    const user = await createOrUpdateUser();

    console.log("🔑 Granting all permissions to user...");
    await grantAllPermissions(user.id);

    console.log("✅ User seed completed successfully!");
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username || "N/A"}`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

async function createOrUpdateUser() {
  const existingUser =
    (await db.user.findUnique({
      where: { email: ADMIN_EMAIL },
    })) ||
    (await db.user.findUnique({
      where: { username: ADMIN_USERNAME },
    }));

  if (existingUser) {
    console.log(`  ✓ Found existing user: ${existingUser.email}`);
    const updated = await db.user.update({
      where: { id: existingUser.id },
      data: {
        email: ADMIN_EMAIL,
        username: ADMIN_USERNAME,
        displayName: ADMIN_DISPLAY_NAME,
        emailVerified: true,
      },
    });
    return updated;
  }

  const newUser = await db.user.create({
    data: {
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      displayName: ADMIN_DISPLAY_NAME,
      emailVerified: true,
    },
  });
  console.log(`  ✓ Created new user: ${newUser.email}`);
  return newUser;
}

async function grantAllPermissions(userId: string) {
  const allPermissionKeys = PERMISSION_DEFINITIONS.map((p) => p.key);

  if (allPermissionKeys.length === 0) {
    console.warn("  ⚠️  No permissions found!");
    return;
  }

  await db.userPermission.deleteMany({
    where: { userId },
  });

  const permissionGrants = allPermissionKeys.map((permissionKey) => ({
    userId,
    permissionKey,
    granted: true,
  }));

  await db.userPermission.createMany({
    data: permissionGrants,
    skipDuplicates: true,
  });

  console.log(`  ✓ Granted ${permissionGrants.length} permissions to user`);
}

main()
  .then(() => {
    console.log("\n✨ Done!");
    db.$disconnect();
  })
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    db.$disconnect();
    process.exit(1);
  });
