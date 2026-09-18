import type { PermissionKey } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissions";

export type { PermissionKey };
import { db } from "@/server/db";

/** Effective permissions of a user; explicit denies override both direct and role grants. */
export async function resolveUserPermissions(
  userId: string,
): Promise<Set<PermissionKey>> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      customRoles: {
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      },
      userPermissions: true,
    },
  });

  if (!user) return new Set();

  // Check for admin role — implicitly grants all permissions
  const allPermissionValues = Object.values(PERMISSIONS) as PermissionKey[];
  for (const ura of user.customRoles) {
    const roleName = ura.role.name.toLowerCase();
    if (roleName === "administrator" || roleName === "admin") {
      return new Set(allPermissionValues);
    }
  }

  const deniedKeys = new Set<string>(
    user.userPermissions
      .filter((up) => !up.granted)
      .map((up) => up.permissionKey),
  );

  const permissions = new Set<PermissionKey>();

  for (const up of user.userPermissions) {
    if (up.granted && !deniedKeys.has(up.permissionKey)) {
      permissions.add(up.permissionKey as PermissionKey);
    }
  }

  const roleIds = user.customRoles.map((ura) => ura.role.id);
  const allRolePermissions = await batchResolveRolePermissions(roleIds);

  for (const roleId of roleIds) {
    const rolePerms = allRolePermissions.get(roleId);
    if (!rolePerms) continue;
    for (const permissionKey of rolePerms) {
      if (!deniedKeys.has(permissionKey)) {
        permissions.add(permissionKey);
      }
    }
  }

  return permissions;
}

/** Role permissions incl. inherited ones; loads the hierarchy level by level, not one query per ancestor. */
export async function batchResolveRolePermissions(
  roleIds: string[],
): Promise<Map<string, Set<PermissionKey>>> {
  if (roleIds.length === 0) return new Map();

  const allRoles = new Map<
    string,
    { id: string; parentRoleId: string | null; permissionKeys: string[] }
  >();
  let toFetch = [...roleIds];

  while (toFetch.length > 0) {
    const roles = await db.role.findMany({
      where: { id: { in: toFetch } },
      include: { permissions: true },
    });

    const nextFetch: string[] = [];
    for (const role of roles) {
      if (allRoles.has(role.id)) continue;
      allRoles.set(role.id, {
        id: role.id,
        parentRoleId: role.parentRoleId,
        permissionKeys: role.permissions.map((rp) => rp.permissionKey),
      });
      if (role.parentRoleId && !allRoles.has(role.parentRoleId)) {
        nextFetch.push(role.parentRoleId);
      }
    }
    toFetch = nextFetch;
  }

  const result = new Map<string, Set<PermissionKey>>();

  function resolveForRole(
    roleId: string,
    visited: Set<string>,
  ): Set<PermissionKey> {
    if (result.has(roleId)) return result.get(roleId)!;
    if (visited.has(roleId)) return new Set(); // circular reference guard

    visited.add(roleId);
    const role = allRoles.get(roleId);
    if (!role) return new Set();

    const perms = new Set<PermissionKey>();

    if (role.parentRoleId) {
      const parentPerms = resolveForRole(role.parentRoleId, visited);
      for (const p of parentPerms) perms.add(p);
    }

    for (const key of role.permissionKeys) {
      perms.add(key as PermissionKey);
    }

    result.set(roleId, perms);
    return perms;
  }

  for (const roleId of roleIds) {
    resolveForRole(roleId, new Set());
  }

  return result;
}

/** Per-request memo of resolved permission sets, keyed by user id. */
export type PermissionCache = Map<string, Promise<Set<PermissionKey>>>;

/** Resolution costs several queries, so every caller inside a tRPC procedure should pass `ctx.permissionCache`. */
export function resolveUserPermissionsCached(
  userId: string,
  cache?: PermissionCache,
): Promise<Set<PermissionKey>> {
  if (!cache) return resolveUserPermissions(userId);
  let cached = cache.get(userId);
  if (!cached) {
    cached = resolveUserPermissions(userId);
    cache.set(userId, cached);
  }
  return cached;
}

/** Pass `ctx.permissionCache` so repeated checks in one request resolve once. */
export async function userHasPermission(
  userId: string,
  permissionKey: PermissionKey,
  cache?: PermissionCache,
): Promise<boolean> {
  const perms = await resolveUserPermissionsCached(userId, cache);
  return perms.has(permissionKey);
}

/** Pass `ctx.permissionCache` so repeated checks in one request resolve once. */
export async function getUserPermissions(
  userId: string,
  cache?: PermissionCache,
): Promise<PermissionKey[]> {
  const perms = await resolveUserPermissionsCached(userId, cache);
  return Array.from(perms);
}
