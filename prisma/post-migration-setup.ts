/**
 * Post-Migration Setup Script
 *
 * This script runs AFTER migrations to ensure:
 * 1. System roles exist (permissions are now hardcoded in codebase)
 * 2. Admin user has Administrator role assigned
 *
 * Usage: pnpm tsx prisma/post-migration-setup.ts [admin-email]
 *
 * If admin-email is not provided, it will try to find the first user or use environment variable ADMIN_EMAIL
 */
import "dotenv/config";
import { db } from "@/server/db";
import { PERMISSIONS } from "@/lib/permissions";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.argv[2];

async function main() {
  console.log("🚀 Starting post-migration setup...\n");

  try {
    // Permissions are now hardcoded in the codebase (src/lib/permissions.ts)

    // Step 1: Create system roles
    console.log("👥 Step 1: Creating system roles...");
    const adminRole = await ensureSystemRolesExist();
    console.log("  ✅ System roles ready\n");

    // Step 2: Assign admin role to admin user
    if (ADMIN_EMAIL) {
      console.log(
        `🔐 Step 2: Assigning Administrator role to ${ADMIN_EMAIL}...`,
      );
      await assignAdminRole(ADMIN_EMAIL, adminRole.id);
      console.log("  ✅ Admin role assigned\n");
    } else {
      console.log(
        "⚠️  Step 2: Skipping admin role assignment (no ADMIN_EMAIL provided)",
      );
      console.log(
        "  💡 Set ADMIN_EMAIL environment variable or pass as argument\n",
      );
    }

    console.log("✅ Post-migration setup completed successfully!");
  } catch (error) {
    console.error("❌ Post-migration setup failed:", error);
    throw error;
  }
}

async function ensureSystemRolesExist() {
  // 1. Administrator Role
  const adminRole = await db.role.upsert({
    where: { name: "Administrator" },
    update: {
      description: "Vollzugriff auf alle Funktionen",
      isSystem: true,
    },
    create: {
      name: "Administrator",
      description: "Vollzugriff auf alle Funktionen",
      isSystem: true,
    },
  });

  // Assign all permissions to admin (using permission keys directly)
  const adminPermissionKeys = Object.values(PERMISSIONS);

  // Remove existing permissions and add all
  await db.rolePermission.deleteMany({
    where: { roleId: adminRole.id },
  });

  if (adminPermissionKeys.length > 0) {
    await db.rolePermission.createMany({
      data: adminPermissionKeys.map((permissionKey) => ({
        roleId: adminRole.id,
        permissionKey,
      })),
      skipDuplicates: true,
    });
  }
  console.log(
    `  ✓ Administrator role ready (${adminPermissionKeys.length} permissions)`,
  );

  // 2. Landesposaunenwart (LPW) Role
  const lpwRole = await db.role.upsert({
    where: { name: "Landesposaunenwart" },
    update: {
      description: "Kann alle Inhalte genehmigen",
      isSystem: true,
    },
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
    PERMISSIONS.ORGANIZATION_MANAGE_BEZIRKE,
  ];

  await db.rolePermission.deleteMany({
    where: { roleId: lpwRole.id },
  });

  if (lpwPermissionKeys.length > 0) {
    await db.rolePermission.createMany({
      data: lpwPermissionKeys.map((permissionKey) => ({
        roleId: lpwRole.id,
        permissionKey,
      })),
      skipDuplicates: true,
    });
  }
  console.log(
    `  ✓ Landesposaunenwart role ready (${lpwPermissionKeys.length} permissions)`,
  );

  // 3. Posaunenrat Role
  const posaunenratRole = await db.role.upsert({
    where: { name: "Posaunenrat" },
    update: {
      description: "Kann Inhalte erstellen und bearbeiten",
      isSystem: true,
    },
    create: {
      name: "Posaunenrat",
      description: "Kann Inhalte erstellen und bearbeiten",
      isSystem: true,
    },
  });

  const posaunenratPermissionKeys = [
    PERMISSIONS.EVENTS_CREATE,
    PERMISSIONS.EVENTS_EDIT,
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.COURSES_CREATE,
    PERMISSIONS.COURSES_EDIT,
    PERMISSIONS.COURSES_VIEW,
    PERMISSIONS.POSTS_CREATE,
    PERMISSIONS.POSTS_EDIT,
    PERMISSIONS.POSTS_VIEW,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_VIEW,
    PERMISSIONS.DOWNLOADS_UPLOAD,
    PERMISSIONS.DOWNLOADS_VIEW,
  ];

  await db.rolePermission.deleteMany({
    where: { roleId: posaunenratRole.id },
  });

  if (posaunenratPermissionKeys.length > 0) {
    await db.rolePermission.createMany({
      data: posaunenratPermissionKeys.map((permissionKey) => ({
        roleId: posaunenratRole.id,
        permissionKey,
      })),
      skipDuplicates: true,
    });
  }
  console.log(
    `  ✓ Posaunenrat role ready (${posaunenratPermissionKeys.length} permissions)`,
  );

  // 4. Obleute Role
  const obleuteRole = await db.role.upsert({
    where: { name: "Obleute" },
    update: {
      description: "Kann Inhalte erstellen",
      isSystem: true,
    },
    create: {
      name: "Obleute",
      description: "Kann Inhalte erstellen",
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

  await db.rolePermission.deleteMany({
    where: { roleId: obleuteRole.id },
  });

  if (obleutePermissionKeys.length > 0) {
    await db.rolePermission.createMany({
      data: obleutePermissionKeys.map((permissionKey) => ({
        roleId: obleuteRole.id,
        permissionKey,
      })),
      skipDuplicates: true,
    });
  }
  console.log(
    `  ✓ Obleute role ready (${obleutePermissionKeys.length} permissions)`,
  );

  // 5. User Role (view only)
  const userRole = await db.role.upsert({
    where: { name: "Benutzer" },
    update: {
      description: "Standard-Benutzer mit Lesezugriff",
      isSystem: true,
    },
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

  await db.rolePermission.deleteMany({
    where: { roleId: userRole.id },
  });

  if (userPermissionKeys.length > 0) {
    await db.rolePermission.createMany({
      data: userPermissionKeys.map((permissionKey) => ({
        roleId: userRole.id,
        permissionKey,
      })),
      skipDuplicates: true,
    });
  }
  console.log(
    `  ✓ Benutzer role ready (${userPermissionKeys.length} permissions)`,
  );

  return adminRole;
}

async function assignAdminRole(email: string, adminRoleId: string) {
  // Find user by email
  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log(`  ⚠️  User with email ${email} not found`);
    console.log("  💡 Available users:");
    const allUsers = await db.user.findMany({
      select: { id: true, email: true, displayName: true },
      take: 10,
    });
    allUsers.forEach((u) => {
      console.log(`     - ${u.email} (${u.displayName || "no name"})`);
    });
    return;
  }

  // Check if user already has admin role
  const existingAssignment = await db.userRoleAssignment.findUnique({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: adminRoleId,
      },
    },
  });

  if (existingAssignment) {
    console.log(`  ✓ User ${email} already has Administrator role`);
    return;
  }

  // Remove all existing role assignments (optional - comment out if you want to keep other roles)
  // await db.userRoleAssignment.deleteMany({
  //   where: { userId: user.id },
  // });

  // Assign admin role
  await db.userRoleAssignment.create({
    data: {
      userId: user.id,
      roleId: adminRoleId,
    },
  });

  console.log(`  ✓ Assigned Administrator role to ${email}`);
}

// ============================================================================
// RUN
// ============================================================================

main()
  .then(() => {
    db.$disconnect();
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ Setup failed:", e);
    db.$disconnect();
    process.exit(1);
  });
