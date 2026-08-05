import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../trpc";
import {
  resolveUserPermissionsCached,
  type PermissionKey,
} from "../helpers/permissions";

function getOrResolvePermissions(
  ctx: { permissionCache: Map<string, Promise<Set<PermissionKey>>> },
  userId: string,
): Promise<Set<PermissionKey>> {
  return resolveUserPermissionsCached(userId, ctx.permissionCache);
}

export function permissionProcedure(permission: PermissionKey) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const userPerms = await getOrResolvePermissions(ctx, ctx.session.user.id);

    if (!userPerms.has(permission)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Permission required: ${permission}`,
      });
    }

    return next({ ctx });
  });
}

export function permissionProcedureAny(permissions: PermissionKey[]) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const userPerms = await getOrResolvePermissions(ctx, ctx.session.user.id);
    const hasAny = permissions.some((perm) => userPerms.has(perm));

    if (!hasAny) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `One of these permissions required: ${permissions.join(", ")}`,
      });
    }

    return next({ ctx });
  });
}

export function permissionProcedureAll(permissions: PermissionKey[]) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const userPerms = await getOrResolvePermissions(ctx, ctx.session.user.id);
    const hasAll = permissions.every((perm) => userPerms.has(perm));

    if (!hasAll) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `All of these permissions required: ${permissions.join(", ")}`,
      });
    }

    return next({ ctx });
  });
}
