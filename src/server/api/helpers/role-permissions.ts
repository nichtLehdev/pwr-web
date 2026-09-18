import { db } from "@/server/db";
import type { PermissionKey } from "@/lib/permissions";

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

    if (role.parentRoleId) {
      await collectPermissions(role.parentRoleId);
    }

    role.permissions.forEach((rp) => {
      permissions.add(rp.permissionKey as PermissionKey);
    });
  }

  await collectPermissions(roleId);
  return permissions;
}

export async function getRolePermissionKeysIncludingInherited(
  roleId: string,
): Promise<string[]> {
  const permissionKeys = await getRolePermissionsIncludingInherited(roleId);
  return Array.from(permissionKeys);
}

export async function wouldCreateCircularReference(
  roleId: string,
  potentialParentId: string,
): Promise<boolean> {
  if (roleId === potentialParentId) {
    return true;
  }

  // Check if the potential parent is a descendant of this role
  const visited = new Set<string>();

  async function checkDescendants(currentRoleId: string): Promise<boolean> {
    if (visited.has(currentRoleId)) {
      return false;
    }
    visited.add(currentRoleId);

    if (currentRoleId === roleId) {
      return true;
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

    for (const child of role.childRoles) {
      if (await checkDescendants(child.id)) {
        return true;
      }
    }

    return false;
  }

  return await checkDescendants(potentialParentId);
}
