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
import { BEZIRKE } from "@/lib/bezirke";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.argv[2];

async function main() {
  console.log("🚀 Starting post-migration setup...\n");

  try {
    // Permissions are now hardcoded in the codebase (src/lib/permissions.ts)

    // Step 1: Create system roles
    console.log("👥 Step 1: Creating system roles...");
    const adminRole = await ensureSystemRolesExist();
    console.log("  ✅ System roles ready\n");

    // Step 2: Ensure the hardcoded districts exist
    console.log("🗺️  Step 2: Ensuring Bezirke exist...");
    await ensureBezirkeExist();
    console.log("  ✅ Bezirke ready\n");

    // Step 3: Assign admin role to admin user
    if (ADMIN_EMAIL) {
      console.log(
        `🔐 Step 3: Assigning Administrator role to ${ADMIN_EMAIL}...`,
      );
      await assignAdminRole(ADMIN_EMAIL, adminRole.id);
      console.log("  ✅ Admin role assigned\n");
    } else {
      console.log(
        "⚠️  Step 3: Skipping admin role assignment (no ADMIN_EMAIL provided)",
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

  // 2. Delete legacy roles (Landesposaunenwart, Benutzer) if they exist
  for (const legacyName of ["Landesposaunenwart", "Benutzer"]) {
    const legacyRole = await db.role.findUnique({
      where: { name: legacyName },
    });
    if (legacyRole) {
      await db.userRoleAssignment.deleteMany({
        where: { roleId: legacyRole.id },
      });
      await db.rolePermission.deleteMany({ where: { roleId: legacyRole.id } });
      await db.role.delete({ where: { id: legacyRole.id } });
      console.log(`  ✓ Deleted legacy role: ${legacyName}`);
    }
  }

  // 3. Regionalposaunenwart Role (renamed from Posaunenrat)
  const existingPosaunenrat = await db.role.findUnique({
    where: { name: "Posaunenrat" },
  });
  let rpwRole;
  if (existingPosaunenrat) {
    rpwRole = await db.role.update({
      where: { name: "Posaunenrat" },
      data: {
        name: "Regionalposaunenwart",
        description: "Kann Inhalte erstellen und bearbeiten",
        isSystem: true,
      },
    });
  } else {
    rpwRole = await db.role.upsert({
      where: { name: "Regionalposaunenwart" },
      update: {
        description: "Kann Inhalte erstellen und bearbeiten",
        isSystem: true,
      },
      create: {
        name: "Regionalposaunenwart",
        description: "Kann Inhalte erstellen und bearbeiten",
        isSystem: true,
      },
    });
  }

  // Freigeben ist bewusst nicht bezirksgebunden: RPWs prüfen wie LPW und Admin
  // für das ganze Werk. Die *_APPROVE-Rechte sind zugleich die Marke, an der
  // der Bezirks-Zuschnitt endet (siehe helpers/district-scope.ts) — ohne sie
  // wäre ein RPW wie ein Obmann auf seinen eigenen Bezirk beschränkt.
  const rpwPermissionKeys = [
    PERMISSIONS.EVENTS_CREATE,
    PERMISSIONS.EVENTS_EDIT,
    PERMISSIONS.EVENTS_APPROVE,
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.COURSES_CREATE,
    PERMISSIONS.COURSES_EDIT,
    PERMISSIONS.COURSES_APPROVE,
    PERMISSIONS.COURSES_VIEW,
    // RPWs entscheiden für ihre eigenen Kurse, ob abgerechnet wird; das
    // Erstellen der Rechnungen selbst läuft über die Kurs-Organisatorenrolle
    // bzw. invoices.generate (LPW/Admin).
    PERMISSIONS.COURSES_ENABLE_INVOICING,
    PERMISSIONS.INVOICES_VIEW,
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

  await db.rolePermission.deleteMany({
    where: { roleId: rpwRole.id },
  });

  if (rpwPermissionKeys.length > 0) {
    await db.rolePermission.createMany({
      data: rpwPermissionKeys.map((permissionKey) => ({
        roleId: rpwRole.id,
        permissionKey,
      })),
      skipDuplicates: true,
    });
  }
  console.log(
    `  ✓ Regionalposaunenwart role ready (${rpwPermissionKeys.length} permissions)`,
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

  return adminRole;
}

async function ensureBezirkeExist() {
  for (const bezirk of BEZIRKE) {
    await db.bezirk.upsert({
      where: { number: bezirk.number },
      update: { name: bezirk.name, shortName: bezirk.shortName },
      create: { ...bezirk },
    });
  }
  console.log(`  ✓ ${BEZIRKE.length} Bezirke ensured`);
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
