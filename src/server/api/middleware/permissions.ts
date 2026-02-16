import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../trpc";
import { userHasPermission, type PermissionKey } from "../helpers/permissions";
import type { PERMISSIONS } from "@/lib/permissions";

/**
 * Create a procedure that requires a specific permission
 *
 * @example
 * ```ts
 * export const eventsRouter = createTRPCRouter({
 *   create: permissionProcedure(PERMISSIONS.EVENTS_CREATE)
 *     .input(z.object({ title: z.string() }))
 *     .mutation(async ({ ctx, input }) => {
 *       // User is guaranteed to have EVENTS_CREATE permission
 *       return await ctx.db.event.create({ data: input });
 *     }),
 * });
 * ```
 */
export function permissionProcedure(permission: PermissionKey) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const hasPermission = await userHasPermission(
      ctx.session.user.id,
      permission,
    );

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Permission required: ${permission}`,
      });
    }

    return next({ ctx });
  });
}

/**
 * Create a procedure that requires any of the specified permissions
 *
 * @example
 * ```ts
 * export const eventsRouter = createTRPCRouter({
 *   edit: permissionProcedureAny([
 *     PERMISSIONS.EVENTS_EDIT,
 *     PERMISSIONS.EVENTS_APPROVE,
 *   ])
 *     .input(z.object({ id: z.string() }))
 *     .mutation(async ({ ctx, input }) => {
 *       // User has at least one of the permissions
 *     }),
 * });
 * ```
 */
export function permissionProcedureAny(permissions: PermissionKey[]) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const userPermissions = await Promise.all(
      permissions.map((perm) => userHasPermission(ctx.session.user.id, perm)),
    );

    const hasAnyPermission = userPermissions.some((has) => has);

    if (!hasAnyPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `One of these permissions required: ${permissions.join(", ")}`,
      });
    }

    return next({ ctx });
  });
}

/**
 * Create a procedure that requires all of the specified permissions
 *
 * @example
 * ```ts
 * export const eventsRouter = createTRPCRouter({
 *   delete: permissionProcedureAll([
 *     PERMISSIONS.EVENTS_DELETE,
 *     PERMISSIONS.EVENTS_APPROVE,
 *   ])
 *     .input(z.object({ id: z.string() }))
 *     .mutation(async ({ ctx, input }) => {
 *       // User has all permissions
 *     }),
 * });
 * ```
 */
export function permissionProcedureAll(permissions: PermissionKey[]) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const userPermissions = await Promise.all(
      permissions.map((perm) => userHasPermission(ctx.session.user.id, perm)),
    );

    const hasAllPermissions = userPermissions.every((has) => has);

    if (!hasAllPermissions) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `All of these permissions required: ${permissions.join(", ")}`,
      });
    }

    return next({ ctx });
  });
}
