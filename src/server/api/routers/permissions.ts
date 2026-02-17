import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { PERMISSION_DEFINITIONS } from "@/lib/permissions";

/**
 * Hardcoded list of usernames or emails allowed to manage permissions.
 */
const ALLOWED_PERMISSION_MANAGERS: string[] = [
  "lars.lehmann",
  // Add more emails/usernames here as needed
];

function canManagePermissions(identifier: string): boolean {
  if (!identifier) return false;
  const normalized = identifier.trim().toLowerCase();
  return ALLOWED_PERMISSION_MANAGERS.some(
    (allowed) => allowed.trim().toLowerCase() === normalized,
  );
}

/**
 * PERMISSIONS ROUTER
 *
 * Handles custom roles and permissions management
 * Only accessible to hardcoded users
 */
export const permissionsRouter = createTRPCRouter({
  /**
   * Check if current user can manage permissions
   */
  canManage: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { email: true, username: true },
    });
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return (
      canManagePermissions(user.email) ||
      (user.username ? canManagePermissions(user.username) : false)
    );
  }),

  // ========== PERMISSIONS ==========

  /**
   * Get all permissions (hardcoded definitions)
   */
  getAllPermissions: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { email: true, username: true },
    });
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    const allowed =
      canManagePermissions(user.email) ||
      (user.username ? canManagePermissions(user.username) : false);
    if (!allowed) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not allowed to manage permissions",
      });
    }

    // Return hardcoded permission definitions
    return PERMISSION_DEFINITIONS.sort((a, b) => {
      if (a.category !== b.category) {
        return (a.category || "").localeCompare(b.category || "");
      }
      return a.name.localeCompare(b.name);
    });
  }),

  /**
   * Get permission by key
   */
  getPermissionByKey: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true, username: true },
      });
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const allowed =
        canManagePermissions(user.email) ||
        (user.username ? canManagePermissions(user.username) : false);
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not allowed to manage permissions",
        });
      }

      const permission = PERMISSION_DEFINITIONS.find(
        (p) => p.key === input.key,
      );

      if (!permission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Permission not found",
        });
      }

      // Get roles and users that have this permission
      const roles = await ctx.db.role.findMany({
        where: {
          permissions: {
            some: {
              permissionKey: input.key,
            },
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      const users = await ctx.db.userPermission.findMany({
        where: {
          permissionKey: input.key,
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
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

  /**
   * Get all roles
   */
  getAllRoles: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { email: true, username: true },
    });
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    const allowed =
      canManagePermissions(user.email) ||
      (user.username ? canManagePermissions(user.username) : false);
    if (!allowed) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not allowed to manage permissions",
      });
    }

    return await ctx.db.role.findMany({
      include: {
        permissions: true,
        parentRole: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        users: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }),

  /**
   * Get role by ID
   */
  getRoleById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true, username: true },
      });
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const allowed =
        canManagePermissions(user.email) ||
        (user.username ? canManagePermissions(user.username) : false);
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not allowed to manage permissions",
        });
      }

      const role = await ctx.db.role.findUnique({
        where: { id: input.id },
        include: {
          permissions: true,
          parentRole: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          users: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      return role;
    }),

  /**
   * Create a new role
   */
  createRole: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        parentRoleId: z.string().optional().nullable(),
        permissionKeys: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true, username: true },
      });
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const allowed =
        canManagePermissions(user.email) ||
        (user.username ? canManagePermissions(user.username) : false);
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not allowed to manage permissions",
        });
      }

      // Check if role name already exists
      const existing = await ctx.db.role.findUnique({
        where: { name: input.name },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Role with this name already exists",
        });
      }

      // Validate parent role exists if provided
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

        // Note: We can't check circular reference for a new role, but we validate parent exists
      }

      const { permissionKeys, ...roleData } = input;

      const role = await ctx.db.role.create({
        data: roleData,
      });

      // Add permissions if provided
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
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });
    }),

  /**
   * Update a role
   */
  updateRole: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        parentRoleId: z.string().optional().nullable(),
        permissionKeys: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true, username: true },
      });
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const allowed =
        canManagePermissions(user.email) ||
        (user.username ? canManagePermissions(user.username) : false);
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not allowed to manage permissions",
        });
      }

      const role = await ctx.db.role.findUnique({
        where: { id: input.id },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      if (role.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot modify system roles",
        });
      }

      // Validate parent role if provided
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

          // Check for circular reference
          const { wouldCreateCircularReference } =
            await import("../helpers/role-permissions");
          if (
            await wouldCreateCircularReference(input.id, input.parentRoleId)
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Cannot set parent role: would create circular reference",
            });
          }
        }
      }

      const { id: roleId, permissionKeys, ...updateData } = input;

      // Update role fields
      await ctx.db.role.update({
        where: { id: roleId },
        data: updateData,
      });

      // Update permissions if provided
      if (permissionKeys !== undefined) {
        // Delete all existing permissions
        await ctx.db.rolePermission.deleteMany({
          where: { roleId },
        });

        // Add new permissions
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
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });
    }),

  /**
   * Delete a role
   */
  deleteRole: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true, username: true },
      });
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const allowed =
        canManagePermissions(user.email) ||
        (user.username ? canManagePermissions(user.username) : false);
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not allowed to manage permissions",
        });
      }

      const role = await ctx.db.role.findUnique({
        where: { id: input.id },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      if (role.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete system roles",
        });
      }

      await ctx.db.role.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // ========== USER ROLE ASSIGNMENTS ==========

  /**
   * Assign roles to a user
   */
  assignRolesToUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        roleIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true, username: true },
      });
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const allowed =
        canManagePermissions(user.email) ||
        (user.username ? canManagePermissions(user.username) : false);
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not allowed to manage permissions",
        });
      }

      // Verify target user exists
      const targetUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });
      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Delete all existing role assignments
      await ctx.db.userRoleAssignment.deleteMany({
        where: { userId: input.userId },
      });

      // Create new role assignments
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

  /**
   * Get current user's own permissions (for UI checks)
   */
  getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
    const { getUserPermissions: getUserPermissionsHelper } =
      await import("../helpers/permissions");
    const permissionKeys = await getUserPermissionsHelper(ctx.session.user.id);
    return permissionKeys;
  }),

  /**
   * Get user's roles and permissions (requires permission management access)
   */
  getUserPermissions: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true, username: true },
      });
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const allowed =
        canManagePermissions(user.email) ||
        (user.username ? canManagePermissions(user.username) : false);
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not allowed to manage permissions",
        });
      }

      // Return user's roles and permissions
      const userRoleAssignments = await ctx.db.userRoleAssignment.findMany({
        where: { userId: input.userId },
        include: {
          role: true,
        },
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

  /**
   * Assign direct permissions to a user
   */
  assignPermissionsToUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        permissions: z.array(
          z.object({
            permissionKey: z.string(),
            granted: z.boolean().default(true),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true, username: true },
      });
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const allowed =
        canManagePermissions(user.email) ||
        (user.username ? canManagePermissions(user.username) : false);
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not allowed to manage permissions",
        });
      }

      // Verify target user exists
      const targetUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });
      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Delete all existing direct permissions
      await ctx.db.userPermission.deleteMany({
        where: { userId: input.userId },
      });

      // Create new direct permissions
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

  /**
   * Get all users (for assignment dropdowns)
   */
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { email: true, username: true },
    });
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    const allowed =
      canManagePermissions(user.email) ||
      (user.username ? canManagePermissions(user.username) : false);
    if (!allowed) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not allowed to manage permissions",
      });
    }

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
});
