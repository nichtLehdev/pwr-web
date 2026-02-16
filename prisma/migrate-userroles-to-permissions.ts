/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Data Migration Script: UserRole → Permissions
 *
 * This script creates system roles and assigns permissions to them.
 * Run this AFTER the schema migration that removed UserRole enum.
 *
 * Usage: pnpm tsx prisma/migrate-userroles-to-permissions.ts
 */
import "dotenv/config";
import { db } from "@/server/db";
import { PERMISSIONS } from "@/lib/permissions";

async function main() {
  console.log("🔄 Starting UserRole → Permissions migration...");

  // Get all permissions from database
  const allPermissions = await db.permission.findMany();
  const permissionMap = new Map(allPermissions.map((p) => [p.key, p.id]));

  // Ensure all system permissions exist
  console.log("📋 Ensuring all system permissions exist...");
  for (const permDef of Object.values(PERMISSIONS)) {
    const existing = permissionMap.get(permDef);
    if (!existing) {
      console.log(
        `  ⚠️  Warning: Permission ${permDef} not found. Run seed.ts first.`,
      );
    }
  }

  // Create system roles
  console.log("👥 Creating system roles...");

  // 1. Administrator Role
  const adminRole = await db.role.upsert({
    where: { name: "Administrator" },
    update: {},
    create: {
      name: "Administrator",
      description: "Vollzugriff auf alle Funktionen",
      isSystem: true,
    },
  });

  // Assign all permissions to admin
  const adminPermissionIds = Object.values(PERMISSIONS)
    .map((key) => permissionMap.get(key))
    .filter((id): id is string => id !== undefined);

  await db.rolePermission.createMany({
    data: adminPermissionIds.map((permissionId) => ({
      roleId: adminRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });
  console.log(
    `  ✓ Created Administrator role with ${adminPermissionIds.length} permissions`,
  );

  // 2. Landesposaunenwart (LPW) Role
  const lpwRole = await db.role.upsert({
    where: { name: "Landesposaunenwart" },
    update: {},
    create: {
      name: "Landesposaunenwart",
      description: "Kann alle Inhalte genehmigen",
      isSystem: true,
    },
  });

  const lpwPermissionKeys = [
    PERMISSIONS.EVENTS_CREATE,
    PERMISSIONS.EVENTS_EDIT,
    PERMISSIONS.EVENTS_DELETE,
    PERMISSIONS.EVENTS_APPROVE,
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.COURSES_CREATE,
    PERMISSIONS.COURSES_EDIT,
    PERMISSIONS.COURSES_DELETE,
    PERMISSIONS.COURSES_APPROVE,
    PERMISSIONS.COURSES_VIEW,
    PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
    PERMISSIONS.POSTS_CREATE,
    PERMISSIONS.POSTS_EDIT,
    PERMISSIONS.POSTS_DELETE,
    PERMISSIONS.POSTS_APPROVE,
    PERMISSIONS.POSTS_VIEW,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_DELETE,
    PERMISSIONS.MEDIA_APPROVE,
    PERMISSIONS.MEDIA_VIEW,
    PERMISSIONS.DOWNLOADS_UPLOAD,
    PERMISSIONS.DOWNLOADS_DELETE,
    PERMISSIONS.DOWNLOADS_APPROVE,
    PERMISSIONS.DOWNLOADS_VIEW,
    PERMISSIONS.ORGANIZATION_MANAGE_TEAM,
    PERMISSIONS.ORGANIZATION_MANAGE_VORSTAND,
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENRAT,
    PERMISSIONS.ORGANIZATION_MANAGE_FOERDERVEREIN,
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENWARTE,
    PERMISSIONS.ORGANIZATION_MANAGE_ENSEMBLES,
    PERMISSIONS.ORGANIZATION_MANAGE_AUSWAHLCHOERE,
    PERMISSIONS.ORGANIZATION_MANAGE_BEZIRKE,
    PERMISSIONS.ORGANIZATION_MANAGE_LOCATIONS,
    PERMISSIONS.HOMEPAGE_MANAGE,
    PERMISSIONS.NEWSLETTER_MANAGE,
    PERMISSIONS.NEWSLETTER_SEND,
    PERMISSIONS.STATS_VIEW,
  ];

  const lpwPermissionIds = lpwPermissionKeys
    .map((key) => permissionMap.get(key))
    .filter((id): id is string => id !== undefined);

  await db.rolePermission.createMany({
    data: lpwPermissionIds.map((permissionId) => ({
      roleId: lpwRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });
  console.log(
    `  ✓ Created Landesposaunenwart role with ${lpwPermissionIds.length} permissions`,
  );

  // 3. Regionalposaunenwart (RPW) Role
  const rpwRole = await db.role.upsert({
    where: { name: "Regionalposaunenwart" },
    update: {},
    create: {
      name: "Regionalposaunenwart",
      description: "Kann Inhalte für ihren Bezirk genehmigen",
      isSystem: true,
    },
  });

  const rpwPermissionKeys = [
    PERMISSIONS.EVENTS_CREATE,
    PERMISSIONS.EVENTS_EDIT,
    PERMISSIONS.EVENTS_APPROVE,
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.COURSES_CREATE,
    PERMISSIONS.COURSES_EDIT,
    PERMISSIONS.COURSES_APPROVE,
    PERMISSIONS.COURSES_VIEW,
    PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
    PERMISSIONS.POSTS_CREATE,
    PERMISSIONS.POSTS_EDIT,
    PERMISSIONS.POSTS_APPROVE,
    PERMISSIONS.POSTS_VIEW,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_APPROVE,
    PERMISSIONS.MEDIA_VIEW,
    PERMISSIONS.DOWNLOADS_UPLOAD,
    PERMISSIONS.DOWNLOADS_APPROVE,
    PERMISSIONS.DOWNLOADS_VIEW,
  ];

  const rpwPermissionIds = rpwPermissionKeys
    .map((key) => permissionMap.get(key))
    .filter((id): id is string => id !== undefined);

  await db.rolePermission.createMany({
    data: rpwPermissionIds.map((permissionId) => ({
      roleId: rpwRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });
  console.log(
    `  ✓ Created Regionalposaunenwart role with ${rpwPermissionIds.length} permissions`,
  );

  // 4. Obleute Role
  const obleuteRole = await db.role.upsert({
    where: { name: "Obleute" },
    update: {},
    create: {
      name: "Obleute",
      description: "Kann Inhalte erstellen, benötigt Genehmigung",
      isSystem: true,
    },
  });

  const obleutePermissionKeys = [
    PERMISSIONS.EVENTS_CREATE,
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.COURSES_CREATE,
    PERMISSIONS.COURSES_VIEW,
    PERMISSIONS.POSTS_CREATE,
    PERMISSIONS.POSTS_VIEW,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_VIEW,
    PERMISSIONS.DOWNLOADS_UPLOAD,
    PERMISSIONS.DOWNLOADS_VIEW,
  ];

  const obleutePermissionIds = obleutePermissionKeys
    .map((key) => permissionMap.get(key))
    .filter((id): id is string => id !== undefined);

  await db.rolePermission.createMany({
    data: obleutePermissionIds.map((permissionId) => ({
      roleId: obleuteRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });
  console.log(
    `  ✓ Created Obleute role with ${obleutePermissionIds.length} permissions`,
  );

  // 5. User Role (view only)
  const userRole = await db.role.upsert({
    where: { name: "Benutzer" },
    update: {},
    create: {
      name: "Benutzer",
      description: "Standard-Benutzer mit Lesezugriff",
      isSystem: true,
    },
  });

  const userPermissionKeys = [
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.COURSES_VIEW,
    PERMISSIONS.POSTS_VIEW,
    PERMISSIONS.MEDIA_VIEW,
    PERMISSIONS.DOWNLOADS_VIEW,
  ];

  const userPermissionIds = userPermissionKeys
    .map((key) => permissionMap.get(key))
    .filter((id): id is string => id !== undefined);

  await db.rolePermission.createMany({
    data: userPermissionIds.map((permissionId) => ({
      roleId: userRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });
  console.log(
    `  ✓ Created Benutzer role with ${userPermissionIds.length} permissions`,
  );

  console.log("\n✅ System roles created successfully!");
  console.log("\n📝 Next steps:");
  console.log(
    "   1. Manually assign roles to users via the permissions dashboard",
  );
  console.log(
    "   2. Or run a script to migrate existing users based on their previous roles",
  );
  console.log(
    "   3. Update all code references from user.role to permission checks",
  );
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    db.$disconnect();
    process.exit(1);
  });
