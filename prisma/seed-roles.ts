/**
 * Seed Script for Creating Hierarchical Roles
 *
 * This script creates example roles with hierarchical relationships.
 * For example, you can create a "Course Manager" role with all course permissions,
 * and then create other roles that inherit from it.
 *
 * Usage: npx tsx prisma/seed-roles.ts
 */
import "dotenv/config";
import { db } from "@/server/db";
import { PERMISSION_DEFINITIONS } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissions";

async function main() {
  console.log("🌱 Starting role seed...");

  try {
    // Permissions are now hardcoded in the codebase, no need to seed them

    // Create base roles with category-specific permissions
    console.log("👥 Creating base roles...");
    const courseManagerRole = await createCourseManagerRole();
    const eventManagerRole = await createEventManagerRole();
    const postManagerRole = await createPostManagerRole();
    const organizationManagerRole = await createOrganizationManagerRole();

    // Create a comprehensive admin role that inherits from multiple base roles
    console.log("👑 Creating admin role...");
    const adminRole = await createAdminRole();

    console.log("✅ Role seed completed successfully!");
    console.log("\nCreated roles:");
    console.log(`  - Course Manager (${courseManagerRole.id})`);
    console.log(`  - Event Manager (${eventManagerRole.id})`);
    console.log(`  - Post Manager (${postManagerRole.id})`);
    console.log(`  - Organization Manager (${organizationManagerRole.id})`);
    console.log(`  - Admin (${adminRole.id}) - inherits from all base roles`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

async function createCourseManagerRole() {
  // Course-related permission keys (hardcoded)
  const coursePermissionKeys = [
    PERMISSIONS.COURSES_CREATE,
    PERMISSIONS.COURSES_EDIT,
    PERMISSIONS.COURSES_DELETE,
    PERMISSIONS.COURSES_APPROVE,
    PERMISSIONS.COURSES_VIEW,
    PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
  ];

  const role = await db.role.upsert({
    where: { name: "Course Manager" },
    update: {
      description: "Full access to all course-related functionality",
    },
    create: {
      name: "Course Manager",
      description: "Full access to all course-related functionality",
      isSystem: false,
    },
  });

  // Update permissions
  await db.rolePermission.deleteMany({
    where: { roleId: role.id },
  });

  if (coursePermissionKeys.length > 0) {
    await db.rolePermission.createMany({
      data: coursePermissionKeys.map((permissionKey) => ({
        roleId: role.id,
        permissionKey,
      })),
      skipDuplicates: true,
    });
  }

  console.log(`  ✓ Created/Updated Course Manager role`);
  return role;
}

async function createEventManagerRole() {
  // Event-related permission keys (hardcoded)
  const eventPermissionKeys = [
    PERMISSIONS.EVENTS_CREATE,
    PERMISSIONS.EVENTS_EDIT,
    PERMISSIONS.EVENTS_DELETE,
    PERMISSIONS.EVENTS_APPROVE,
    PERMISSIONS.EVENTS_VIEW,
  ];

  const role = await db.role.upsert({
    where: { name: "Event Manager" },
    update: {
      description: "Full access to all event-related functionality",
    },
    create: {
      name: "Event Manager",
      description: "Full access to all event-related functionality",
      isSystem: false,
    },
  });

  // Update permissions
  await db.rolePermission.deleteMany({
    where: { roleId: role.id },
  });

  if (eventPermissionKeys.length > 0) {
    await db.rolePermission.createMany({
      data: eventPermissionKeys.map((permissionKey) => ({
        roleId: role.id,
        permissionKey,
      })),
      skipDuplicates: true,
    });
  }

  console.log(`  ✓ Created/Updated Event Manager role`);
  return role;
}

async function createPostManagerRole() {
  // Post-related permission keys (hardcoded)
  const postPermissionKeys = [
    PERMISSIONS.POSTS_CREATE,
    PERMISSIONS.POSTS_EDIT,
    PERMISSIONS.POSTS_DELETE,
    PERMISSIONS.POSTS_APPROVE,
    PERMISSIONS.POSTS_VIEW,
  ];

  const role = await db.role.upsert({
    where: { name: "Post Manager" },
    update: {
      description: "Full access to all post-related functionality",
    },
    create: {
      name: "Post Manager",
      description: "Full access to all post-related functionality",
      isSystem: false,
    },
  });

  // Update permissions
  await db.rolePermission.deleteMany({
    where: { roleId: role.id },
  });

  if (postPermissionKeys.length > 0) {
    await db.rolePermission.createMany({
      data: postPermissionKeys.map((permissionKey) => ({
        roleId: role.id,
        permissionKey,
      })),
      skipDuplicates: true,
    });
  }

  console.log(`  ✓ Created/Updated Post Manager role`);
  return role;
}

async function createOrganizationManagerRole() {
  // Organization-related permission keys (hardcoded)
  const orgPermissionKeys = [
    PERMISSIONS.ORGANIZATION_MANAGE_TEAM,
    PERMISSIONS.ORGANIZATION_MANAGE_VORSTAND,
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENRAT,
    PERMISSIONS.ORGANIZATION_MANAGE_FOERDERVEREIN,
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENWARTE,
    PERMISSIONS.ORGANIZATION_MANAGE_ENSEMBLES,
    PERMISSIONS.ORGANIZATION_MANAGE_AUSWAHLCHOERE,
    PERMISSIONS.ORGANIZATION_MANAGE_BEZIRKE,
    PERMISSIONS.ORGANIZATION_MANAGE_LOCATIONS,
  ];

  const role = await db.role.upsert({
    where: { name: "Organization Manager" },
    update: {
      description: "Full access to all organization-related functionality",
    },
    create: {
      name: "Organization Manager",
      description: "Full access to all organization-related functionality",
      isSystem: false,
    },
  });

  // Update permissions
  await db.rolePermission.deleteMany({
    where: { roleId: role.id },
  });

  if (orgPermissionKeys.length > 0) {
    await db.rolePermission.createMany({
      data: orgPermissionKeys.map((permissionKey) => ({
        roleId: role.id,
        permissionKey,
      })),
      skipDuplicates: true,
    });
  }

  console.log(`  ✓ Created/Updated Organization Manager role`);
  return role;
}

async function createAdminRole() {
  // All permission keys (hardcoded)
  const allPermissionKeys = PERMISSION_DEFINITIONS.map((p) => p.key);

  // Create admin role that inherits from the first parent role
  // (In a real scenario, you might want to create a composite role differently)
  // For admin role, we'll add all permissions directly instead of using inheritance
  // (inheritance is demonstrated with the base roles)
  const role = await db.role.upsert({
    where: { name: "Admin" },
    update: {
      description: "Full system access with all permissions",
      // parentRoleId: null, // Admin doesn't inherit - has all permissions directly
    },
    create: {
      name: "Admin",
      description: "Full system access with all permissions",
      isSystem: false,
      // parentRoleId: null, // Admin doesn't inherit - has all permissions directly
    },
  });

  // Add all permissions directly to admin role
  await db.rolePermission.deleteMany({
    where: { roleId: role.id },
  });

  if (allPermissionKeys.length > 0) {
    await db.rolePermission.createMany({
      data: allPermissionKeys.map((permissionKey) => ({
        roleId: role.id,
        permissionKey,
      })),
      skipDuplicates: true,
    });
  }

  console.log(`  ✓ Created/Updated Admin role`);
  return role;
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
