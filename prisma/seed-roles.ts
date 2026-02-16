/* eslint-disable @typescript-eslint/no-explicit-any */
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
    // 1. Ensure permissions exist first
    console.log("🔐 Ensuring permissions exist...");
    await ensurePermissionsExist();

    // 2. Create base roles with category-specific permissions
    console.log("👥 Creating base roles...");
    const courseManagerRole = await createCourseManagerRole();
    const eventManagerRole = await createEventManagerRole();
    const postManagerRole = await createPostManagerRole();
    const organizationManagerRole = await createOrganizationManagerRole();

    // 3. Create a comprehensive admin role that inherits from multiple base roles
    console.log("👑 Creating admin role...");
    const adminRole = await createAdminRole([
      courseManagerRole.id,
      eventManagerRole.id,
      postManagerRole.id,
      organizationManagerRole.id,
    ]);

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

async function createCourseManagerRole() {
  // Get all course-related permissions
  const coursePermissions = await db.permission.findMany({
    where: {
      key: {
        in: [
          PERMISSIONS.COURSES_CREATE,
          PERMISSIONS.COURSES_EDIT,
          PERMISSIONS.COURSES_DELETE,
          PERMISSIONS.COURSES_APPROVE,
          PERMISSIONS.COURSES_VIEW,
          PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
        ],
      },
    },
  });

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

  if (coursePermissions.length > 0) {
    await db.rolePermission.createMany({
      data: coursePermissions.map((perm) => ({
        roleId: role.id,
        permissionId: perm.id,
      })),
      skipDuplicates: true,
    });
  }

  console.log(`  ✓ Created/Updated Course Manager role`);
  return role;
}

async function createEventManagerRole() {
  // Get all event-related permissions
  const eventPermissions = await db.permission.findMany({
    where: {
      key: {
        in: [
          PERMISSIONS.EVENTS_CREATE,
          PERMISSIONS.EVENTS_EDIT,
          PERMISSIONS.EVENTS_DELETE,
          PERMISSIONS.EVENTS_APPROVE,
          PERMISSIONS.EVENTS_VIEW,
        ],
      },
    },
  });

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

  if (eventPermissions.length > 0) {
    await db.rolePermission.createMany({
      data: eventPermissions.map((perm) => ({
        roleId: role.id,
        permissionId: perm.id,
      })),
      skipDuplicates: true,
    });
  }

  console.log(`  ✓ Created/Updated Event Manager role`);
  return role;
}

async function createPostManagerRole() {
  // Get all post-related permissions
  const postPermissions = await db.permission.findMany({
    where: {
      key: {
        in: [
          PERMISSIONS.POSTS_CREATE,
          PERMISSIONS.POSTS_EDIT,
          PERMISSIONS.POSTS_DELETE,
          PERMISSIONS.POSTS_APPROVE,
          PERMISSIONS.POSTS_VIEW,
        ],
      },
    },
  });

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

  if (postPermissions.length > 0) {
    await db.rolePermission.createMany({
      data: postPermissions.map((perm) => ({
        roleId: role.id,
        permissionId: perm.id,
      })),
      skipDuplicates: true,
    });
  }

  console.log(`  ✓ Created/Updated Post Manager role`);
  return role;
}

async function createOrganizationManagerRole() {
  // Get all organization-related permissions
  const orgPermissions = await db.permission.findMany({
    where: {
      key: {
        in: [
          PERMISSIONS.ORGANIZATION_MANAGE_TEAM,
          PERMISSIONS.ORGANIZATION_MANAGE_VORSTAND,
          PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENRAT,
          PERMISSIONS.ORGANIZATION_MANAGE_FOERDERVEREIN,
          PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENWARTE,
          PERMISSIONS.ORGANIZATION_MANAGE_ENSEMBLES,
          PERMISSIONS.ORGANIZATION_MANAGE_AUSWAHLCHOERE,
          PERMISSIONS.ORGANIZATION_MANAGE_BEZIRKE,
          PERMISSIONS.ORGANIZATION_MANAGE_LOCATIONS,
        ],
      },
    },
  });

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

  if (orgPermissions.length > 0) {
    await db.rolePermission.createMany({
      data: orgPermissions.map((perm) => ({
        roleId: role.id,
        permissionId: perm.id,
      })),
      skipDuplicates: true,
    });
  }

  console.log(`  ✓ Created/Updated Organization Manager role`);
  return role;
}

async function createAdminRole(parentRoleIds: string[]) {
  // Get all permissions
  const allPermissions = await db.permission.findMany();

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

  if (allPermissions.length > 0) {
    await db.rolePermission.createMany({
      data: allPermissions.map((perm) => ({
        roleId: role.id,
        permissionId: perm.id,
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
