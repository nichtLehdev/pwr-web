import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";

export type { PermissionKey };
import { db } from "@/server/db";

/**
 * Permission checking helper functions
 *
 * These functions check if a user has a specific permission, either through:
 * 1. Custom roles assigned to them
 * 2. Direct permissions assigned to them
 */

/**
 * Check if a user has a specific permission
 *
 * Checks in this order:
 * 1. Direct user permissions (granted/denied)
 * 2. Permissions from custom roles
 *
 * @param userId - User ID to check
 * @param permissionKey - Permission key to check
 * @returns true if user has the permission, false otherwise
 */
export async function userHasPermission(
  userId: string,
  permissionKey: PermissionKey,
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      customRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      userPermissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!user) return false;

  // 1. Check direct user permissions first (explicit grant/deny)
  const directPermission = user.userPermissions.find(
    (up) => up.permission.key === permissionKey,
  );
  if (directPermission) {
    return directPermission.granted;
  }

  // 2. Check permissions from custom roles (including inherited)
  const { getRolePermissionsIncludingInherited } = await import(
    "./role-permissions"
  );
  for (const userRole of user.customRoles) {
    const rolePermissions =
      await getRolePermissionsIncludingInherited(userRole.role.id);
    if (rolePermissions.has(permissionKey)) return true;
  }

  return false;
}

/**
 * Get all permission keys a user has
 *
 * Combines permissions from:
 * 1. Direct user permissions
 * 2. Custom roles
 *
 * @param userId - User ID
 * @returns Array of permission keys the user has
 */
export async function getUserPermissions(
  userId: string,
): Promise<PermissionKey[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      customRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
      userPermissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!user) return [];

  const permissions = new Set<PermissionKey>();

  // 1. Add direct permissions (only granted ones)
  user.userPermissions
    .filter((up) => up.granted)
    .forEach((up) => {
      permissions.add(up.permission.key as PermissionKey);
    });

  // 2. Add permissions from custom roles (including inherited)
  const { getRolePermissionsIncludingInherited } = await import(
    "./role-permissions"
  );
  for (const userRole of user.customRoles) {
    const rolePermissions =
      await getRolePermissionsIncludingInherited(userRole.role.id);
    rolePermissions.forEach((permissionKey) => {
      // Only add if not explicitly denied
      const denied = user.userPermissions.find(
        (up) => up.permission.key === permissionKey && !up.granted,
      );
      if (!denied) {
        permissions.add(permissionKey);
      }
    });
  }

  return Array.from(permissions);
}
