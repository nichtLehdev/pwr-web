import { db } from "@/server/db";
import type { PermissionKey } from "@/lib/permissions";

/**
 * Get all permissions for a role, including inherited permissions from parent roles
 *
 * This function traverses the role hierarchy and collects all permissions
 * from the role itself and all its parent roles.
 *
 * @param roleId - Role ID to get permissions for
 * @returns Set of permission keys (including inherited ones)
 */
export async function getRolePermissionsIncludingInherited(
  roleId: string,
): Promise<Set<PermissionKey>> {
  const permissions = new Set<PermissionKey>();
  const visitedRoles = new Set<string>();

  async function collectPermissions(currentRoleId: string) {
    // Prevent infinite loops in case of circular references
    if (visitedRoles.has(currentRoleId)) {
      return;
    }
    visitedRoles.add(currentRoleId);

    const role = await db.role.findUnique({
      where: { id: currentRoleId },
      include: {
        permissions: true,
        parentRole: true,
      },
    });

    if (!role) return;

    // First, collect permissions from parent role (if exists)
    if (role.parentRoleId) {
      await collectPermissions(role.parentRoleId);
    }

    // Then, add permissions from this role
    role.permissions.forEach((rp) => {
      permissions.add(rp.permissionKey as PermissionKey);
    });
  }

  await collectPermissions(roleId);
  return permissions;
}

/**
 * Get all permission keys for a role, including inherited permissions
 * (This is now just an alias for getRolePermissionsIncludingInherited)
 *
 * @param roleId - Role ID to get permission keys for
 * @returns Array of permission keys
 */
export async function getRolePermissionKeysIncludingInherited(
  roleId: string,
): Promise<string[]> {
  const permissionKeys = await getRolePermissionsIncludingInherited(roleId);
  return Array.from(permissionKeys);
}

/**
 * Check if a role hierarchy would create a circular reference
 *
 * @param roleId - Role ID to check
 * @param potentialParentId - Potential parent role ID
 * @returns true if adding this parent would create a cycle
 */
export async function wouldCreateCircularReference(
  roleId: string,
  potentialParentId: string,
): Promise<boolean> {
  // If setting parent to self, it's a cycle
  if (roleId === potentialParentId) {
    return true;
  }

  // Check if the potential parent is a descendant of this role
  const visited = new Set<string>();

  async function checkDescendants(currentRoleId: string): Promise<boolean> {
    if (visited.has(currentRoleId)) {
      return false; // Already checked this branch
    }
    visited.add(currentRoleId);

    if (currentRoleId === roleId) {
      return true; // Found a cycle
    }

    const role = await db.role.findUnique({
      where: { id: currentRoleId },
      select: {
        childRoles: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!role) return false;

    // Check all child roles recursively
    for (const child of role.childRoles) {
      if (await checkDescendants(child.id)) {
        return true;
      }
    }

    return false;
  }

  return await checkDescendants(potentialParentId);
}
