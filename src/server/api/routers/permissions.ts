import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

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
   * Get all permissions
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

    return await ctx.db.permission.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }),

  /**
   * Get permission by ID
   */
  getPermissionById: protectedProcedure
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

      const permission = await ctx.db.permission.findUnique({
        where: { id: input.id },
        include: {
          roles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
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

      if (!permission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Permission not found",
        });
      }

      return permission;
    }),

  /**
   * Create a new permission
   */
  createPermission: protectedProcedure
    .input(
      z.object({
        key: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
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

      // Check if permission key already exists
      const existing = await ctx.db.permission.findUnique({
        where: { key: input.key },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Permission with this key already exists",
        });
      }

      return await ctx.db.permission.create({
        data: input,
      });
    }),

  /**
   * Update a permission
   */
  updatePermission: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        category: z.string().optional().nullable(),
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

      const permission = await ctx.db.permission.findUnique({
        where: { id: input.id },
      });

      if (!permission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Permission not found",
        });
      }

      if (permission.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot modify system permissions",
        });
      }

      const { id, ...updateData } = input;
      return await ctx.db.permission.update({
        where: { id },
        data: updateData,
      });
    }),

  /**
   * Delete a permission
   */
  deletePermission: protectedProcedure
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

      const permission = await ctx.db.permission.findUnique({
        where: { id: input.id },
      });

      if (!permission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Permission not found",
        });
      }

      if (permission.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete system permissions",
        });
      }

      await ctx.db.permission.delete({
        where: { id: input.id },
      });

      return { success: true };
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
        permissions: {
          include: {
            permission: true,
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
          permissions: {
            include: {
              permission: true,
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
        permissionIds: z.array(z.string()).optional(),
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

      const { permissionIds, ...roleData } = input;

      const role = await ctx.db.role.create({
        data: roleData,
      });

      // Add permissions if provided
      if (permissionIds && permissionIds.length > 0) {
        await ctx.db.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }

      return await ctx.db.role.findUnique({
        where: { id: role.id },
        include: {
          permissions: {
            include: {
              permission: true,
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
        permissionIds: z.array(z.string()).optional(),
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

      const { id, permissionIds, ...updateData } = input;

      // Update role fields
      await ctx.db.role.update({
        where: { id },
        data: updateData,
      });

      // Update permissions if provided
      if (permissionIds !== undefined) {
        // Delete all existing permissions
        await ctx.db.rolePermission.deleteMany({
          where: { roleId: id },
        });

        // Add new permissions
        if (permissionIds.length > 0) {
          await ctx.db.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({
              roleId: id,
              permissionId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return await ctx.db.role.findUnique({
        where: { id },
        include: {
          permissions: {
            include: {
              permission: true,
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
        include: {
          permission: true,
        },
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
            permissionId: z.string(),
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
            permissionId: p.permissionId,
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
