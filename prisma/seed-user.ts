/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Seed Script for Creating Admin User with Full Permissions
 *
 * This script creates/updates the admin user (lars.lehmann) and grants
 * all available permissions to them.
 *
 * Usage: npx tsx prisma/seed-user.ts
 */
import "dotenv/config";
import { db } from "@/server/db";
import { PERMISSION_DEFINITIONS } from "@/lib/permissions";

// Configuration - can be overridden via environment variables
const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || "lars.lehmann@posaunenwerk-rheinland.de";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "lars.lehmann";
const ADMIN_DISPLAY_NAME = process.env.ADMIN_DISPLAY_NAME || "Lars Lehmann";

async function main() {
  console.log("🌱 Starting user seed...");

  try {
    // 1. Ensure permissions exist first
    console.log("🔐 Ensuring permissions exist...");
    await ensurePermissionsExist();

    // 2. Create or update the admin user
    console.log(`👤 Creating/updating user: ${ADMIN_USERNAME}...`);
    const user = await createOrUpdateUser();

    // 3. Grant all permissions to the user
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

async function ensurePermissionsExist() {
  for (const perm of PERMISSION_DEFINITIONS) {
    await db.permission.upsert({
      where: { key: perm.key },
      update: {
        name: perm.name,
        description: perm.description,
        category: perm.category,
        isSystem: true,
      },
      create: {
        key: perm.key,
        name: perm.name,
        description: perm.description,
        category: perm.category,
        isSystem: true,
      },
    });
  }
  console.log(
    `  ✓ Ensured ${PERMISSION_DEFINITIONS.length} permissions exist`,
  );
}

async function createOrUpdateUser() {
  // Try to find existing user by email or username
  const existingUser =
    (await db.user.findUnique({
      where: { email: ADMIN_EMAIL },
    })) ||
    (await db.user.findUnique({
      where: { username: ADMIN_USERNAME },
    }));

  if (existingUser) {
    console.log(`  ✓ Found existing user: ${existingUser.email}`);
    // Update user if needed
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

  // Create new user
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
  // Get all permissions from database
  const allPermissions = await db.permission.findMany();

  if (allPermissions.length === 0) {
    console.warn("  ⚠️  No permissions found in database!");
    return;
  }

  // Remove existing permissions for this user (clean slate)
  await db.userPermission.deleteMany({
    where: { userId },
  });

  // Grant all permissions
  const permissionGrants = allPermissions.map((permission) => ({
    userId,
    permissionId: permission.id,
    granted: true,
  }));

  // Batch create all permission grants
  await db.userPermission.createMany({
    data: permissionGrants,
    skipDuplicates: true,
  });

  console.log(
    `  ✓ Granted ${permissionGrants.length} permissions to user`,
  );
}

// ============================================================================
// RUN
// ============================================================================

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
