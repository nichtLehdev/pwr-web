import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { PERMISSION_DEFINITIONS, PERMISSIONS, permissionKeySchema } from "@/lib/permissions";
import { permissionProcedure } from "../middleware/permissions";
import { wouldCreateCircularReference } from "../helpers/role-permissions";
import { resolveUserPermissions, getUserPermissions } from "../helpers/permissions";

const manageProcedure = permissionProcedure(PERMISSIONS.PERMISSIONS_MANAGE);

export const permissionsRouter = createTRPCRouter({
  canManage: protectedProcedure.query(async ({ ctx }) => {
    const perms = await resolveUserPermissions(ctx.session.user.id);
    return perms.has(PERMISSIONS.PERMISSIONS_MANAGE);
  }),

  getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
    return await getUserPermissions(ctx.session.user.id);
  }),

  // ========== PERMISSIONS ==========

  getAllPermissions: manageProcedure.query(() => {
    return PERMISSION_DEFINITIONS.sort((a, b) => {
      if (a.category !== b.category) {
        return (a.category || "").localeCompare(b.category || "");
      }
      return a.name.localeCompare(b.name);
    });
  }),

  getPermissionByKey: manageProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const permission = PERMISSION_DEFINITIONS.find(
        (p) => p.key === input.key,
      );

      if (!permission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Permission not found",
        });
      }

      const roles = await ctx.db.role.findMany({
        where: {
          permissions: {
            some: { permissionKey: input.key },
          },
        },
        select: { id: true, name: true },
      });

      const users = await ctx.db.userPermission.findMany({
        where: { permissionKey: input.key },
        include: {
          user: {
            select: { id: true, displayName: true, email: true },
          },
        },
      });

      return {
        ...permission,
        roles: roles.map((r) => ({ role: r })),
        users: users.map((u) => ({ user: u.user })),
      };
    }),

  // ========== ROLES ==========

  getAllRoles: manageProcedure.query(async ({ ctx }) => {
    return await ctx.db.role.findMany({
      include: {
        permissions: true,
        parentRole: {
          select: { id: true, name: true, description: true },
        },
        users: {
          include: {
            user: {
              select: { id: true, displayName: true, email: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }),

  getRoleById: manageProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const role = await ctx.db.role.findUnique({
        where: { id: input.id },
        include: {
          permissions: true,
          parentRole: {
            select: { id: true, name: true, description: true },
          },
          users: {
            include: {
              user: {
                select: { id: true, displayName: true, email: true },
              },
            },
          },
        },
      });

      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
      }

      return role;
    }),

  createRole: manageProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        parentRoleId: z.string().optional().nullable(),
        permissionKeys: z.array(permissionKeySchema).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.role.findUnique({
        where: { name: input.name },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Role with this name already exists",
        });
      }

      if (input.parentRoleId) {
        const parentRole = await ctx.db.role.findUnique({
          where: { id: input.parentRoleId },
        });
        if (!parentRole) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Parent role not found",
          });
        }
      }

      const { permissionKeys, ...roleData } = input;

      const role = await ctx.db.role.create({ data: roleData });

      if (permissionKeys && permissionKeys.length > 0) {
        await ctx.db.rolePermission.createMany({
          data: permissionKeys.map((permissionKey) => ({
            roleId: role.id,
            permissionKey,
          })),
          skipDuplicates: true,
        });
      }

      return await ctx.db.role.findUnique({
        where: { id: role.id },
        include: {
          permissions: true,
          parentRole: {
            select: { id: true, name: true, description: true },
          },
        },
      });
    }),

  updateRole: manageProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        parentRoleId: z.string().optional().nullable(),
        permissionKeys: z.array(permissionKeySchema).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const role = await ctx.db.role.findUnique({
        where: { id: input.id },
      });

      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
      }

      if (role.isSystem) {
        const roleName = role.name.toLowerCase();
        if (roleName === "administrator" || roleName === "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot modify the Admin role",
          });
        }
        if (input.name !== undefined || input.description !== undefined || input.parentRoleId !== undefined) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot modify system role name, description, or hierarchy",
          });
        }
      }

      if (input.parentRoleId !== undefined) {
        if (input.parentRoleId) {
          const parentRole = await ctx.db.role.findUnique({
            where: { id: input.parentRoleId },
          });
          if (!parentRole) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Parent role not found",
            });
          }

          if (await wouldCreateCircularReference(input.id, input.parentRoleId)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot set parent role: would create circular reference",
            });
          }
        }
      }

      const { id: roleId, permissionKeys, ...updateData } = input;

      if (Object.keys(updateData).length > 0) {
        await ctx.db.role.update({
          where: { id: roleId },
          data: updateData,
        });
      }

      if (permissionKeys !== undefined) {
        await ctx.db.rolePermission.deleteMany({
          where: { roleId },
        });

        if (permissionKeys.length > 0) {
          await ctx.db.rolePermission.createMany({
            data: permissionKeys.map((permissionKey) => ({
              roleId,
              permissionKey,
            })),
            skipDuplicates: true,
          });
        }
      }

      return await ctx.db.role.findUnique({
        where: { id: roleId },
        include: {
          permissions: true,
          parentRole: {
            select: { id: true, name: true, description: true },
          },
        },
      });
    }),

  deleteRole: manageProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const role = await ctx.db.role.findUnique({
        where: { id: input.id },
      });

      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
      }

      if (role.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete system roles",
        });
      }

      await ctx.db.role.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // ========== USER ROLE ASSIGNMENTS ==========

  assignRolesToUser: manageProcedure
    .input(
      z.object({
        userId: z.string(),
        roleIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const targetUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });
      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      await ctx.db.userRoleAssignment.deleteMany({
        where: { userId: input.userId },
      });

      if (input.roleIds.length > 0) {
        await ctx.db.userRoleAssignment.createMany({
          data: input.roleIds.map((roleId) => ({
            userId: input.userId,
            roleId,
          })),
          skipDuplicates: true,
        });
      }

      return { success: true };
    }),

  getUserPermissions: manageProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userRoleAssignments = await ctx.db.userRoleAssignment.findMany({
        where: { userId: input.userId },
        include: { role: true },
      });

      const userPermissions = await ctx.db.userPermission.findMany({
        where: { userId: input.userId },
      });

      return {
        customRoles: userRoleAssignments,
        userPermissions: userPermissions,
      };
    }),

  // ========== USER PERMISSIONS (DIRECT) ==========

  assignPermissionsToUser: manageProcedure
    .input(
      z.object({
        userId: z.string(),
        permissions: z.array(
          z.object({
            permissionKey: permissionKeySchema,
            granted: z.boolean().default(true),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const targetUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });
      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      await ctx.db.userPermission.deleteMany({
        where: { userId: input.userId },
      });

      if (input.permissions.length > 0) {
        await ctx.db.userPermission.createMany({
          data: input.permissions.map((p) => ({
            userId: input.userId,
            permissionKey: p.permissionKey,
            granted: p.granted,
          })),
          skipDuplicates: true,
        });
      }

      return { success: true };
    }),

  getAllUsers: manageProcedure.query(async ({ ctx }) => {
    return await ctx.db.user.findMany({
      select: {
        id: true,
        displayName: true,
        email: true,
        username: true,
        districtRoleName: true,
      },
      orderBy: [{ displayName: "asc" }, { email: "asc" }],
    });
  }),

  // ========== EFFECTIVE PERMISSION PREVIEW ==========

  previewEffectivePermissions: manageProcedure
    .input(
      z.object({
        userId: z.string(),
        roleIds: z.array(z.string()),
        directPermissions: z.array(
          z.object({
            permissionKey: permissionKeySchema,
            granted: z.boolean(),
          }),
        ),
      }),
    )
    .query(async ({ ctx, input }) => {
      const allPermissionValues = Object.values(PERMISSIONS);

      // Check if admin role is being assigned
      const roles = await ctx.db.role.findMany({
        where: { id: { in: input.roleIds } },
        include: { permissions: true },
      });

      const isAdmin = roles.some((r) => {
        const name = r.name.toLowerCase();
        return name === "administrator" || name === "admin";
      });

      if (isAdmin) {
        return {
          effectivePermissions: allPermissionValues,
          permissionSources: Object.fromEntries(
            allPermissionValues.map((key) => [
              key,
              { sources: ["Admin-Rolle (alle Berechtigungen)"], granted: true },
            ]),
          ),
        };
      }

      // Build deny set from proposed direct permissions
      const deniedKeys = new Set(
        input.directPermissions
          .filter((p) => !p.granted)
          .map((p) => p.permissionKey),
      );

      const permissionSources: Record<
        string,
        { sources: string[]; granted: boolean }
      > = {};

      // Track direct permissions
      for (const dp of input.directPermissions) {
        if (!dp.granted) {
          permissionSources[dp.permissionKey] = {
            sources: ["Direkt (verweigert)"],
            granted: false,
          };
        } else if (!deniedKeys.has(dp.permissionKey)) {
          permissionSources[dp.permissionKey] = {
            sources: ["Direkt (gewährt)"],
            granted: true,
          };
        }
      }

      // Resolve role permissions (including hierarchy) using in-memory batch approach
      // We already have the roles loaded, but need hierarchy resolution
      const { batchResolveRolePermissions } = await import("../helpers/permissions");
      const rolePermMap = await batchResolveRolePermissions(input.roleIds);

      for (const role of roles) {
        const rolePerms = rolePermMap.get(role.id);
        if (!rolePerms) continue;
        for (const perm of rolePerms) {
          if (deniedKeys.has(perm)) continue;
          if (!permissionSources[perm]) {
            permissionSources[perm] = { sources: [], granted: true };
          }
          if (permissionSources[perm].granted) {
            permissionSources[perm].sources.push(`Rolle: ${role.name}`);
          }
        }
      }

      const effectivePermissions = Object.entries(permissionSources)
        .filter(([, v]) => v.granted)
        .map(([k]) => k);

      return { effectivePermissions, permissionSources };
    }),
});
