import { type UserRole } from "~/generated/prisma/client";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import { db } from "@/server/db";

/**
 * Permission checking helper functions
 *
 * These functions check if a user has a specific permission, either through:
 * 1. Their role (legacy UserRole enum)
 * 2. Custom roles assigned to them
 * 3. Direct permissions assigned to them
 */

/**
 * Legacy role-to-permission mapping
 * Maps old UserRole enum values to new permission keys
 * This allows backward compatibility while migrating to the new system
 */
const ROLE_PERMISSION_MAP: Record<UserRole, PermissionKey[]> = {
  [UserRole.ADMIN]: [
    // Admin has all permissions
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
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_EDIT_ROLES,
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
    PERMISSIONS.PERMISSIONS_MANAGE,
  ],
  [UserRole.LPW]: [
    // Landesposaunenwart - can approve everything
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
  ],
  [UserRole.RPW]: [
    // Regionalposaunenwart - can approve for their Bezirk
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
  ],
  [UserRole.OBLEUTE]: [
    // Obleute - can create but needs approval
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
  ],
  [UserRole.USER]: [
    // Regular user - view only
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.COURSES_VIEW,
    PERMISSIONS.POSTS_VIEW,
    PERMISSIONS.MEDIA_VIEW,
    PERMISSIONS.DOWNLOADS_VIEW,
  ],
};

/**
 * Get all permission keys for a user role (legacy)
 */
export function getRolePermissions(role: UserRole): PermissionKey[] {
  return ROLE_PERMISSION_MAP[role] || [];
}

/**
 * Check if a user has a specific permission
 *
 * Checks in this order:
 * 1. Direct user permissions (granted/denied)
 * 2. Permissions from custom roles
 * 3. Permissions from legacy UserRole enum
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

  // 2. Check permissions from custom roles
  for (const userRole of user.customRoles) {
    const hasPermission = userRole.role.permissions.some(
      (rp) => rp.permission.key === permissionKey,
    );
    if (hasPermission) return true;
  }

  // 3. Check legacy role permissions
  const rolePermissions = getRolePermissions(user.role);
  return rolePermissions.includes(permissionKey);
}

/**
 * Get all permission keys a user has
 *
 * Combines permissions from:
 * 1. Direct user permissions
 * 2. Custom roles
 * 3. Legacy UserRole enum
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

  // 2. Add permissions from custom roles
  user.customRoles.forEach((userRole) => {
    userRole.role.permissions.forEach((rp) => {
      // Only add if not explicitly denied
      const denied = user.userPermissions.find(
        (up) => up.permission.key === rp.permission.key && !up.granted,
      );
      if (!denied) {
        permissions.add(rp.permission.key as PermissionKey);
      }
    });
  });

  // 3. Add legacy role permissions (only if not explicitly denied)
  const rolePermissions = getRolePermissions(user.role);
  rolePermissions.forEach((perm) => {
    const denied = user.userPermissions.find(
      (up) => up.permission.key === perm && !up.granted,
    );
    if (!denied) {
      permissions.add(perm);
    }
  });

  return Array.from(permissions);
}
