import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  adminProcedure,
  lpwProcedure,
} from "../trpc";
import { UserRole } from "~/generated/prisma/client";

/**
 * USERS ROUTER
 *
 * Handles comprehensive user management beyond just auth
 * Includes: profiles, roles, permissions, organization membership
 */

export const usersRouter = createTRPCRouter({
  // ============================================================================
  // PUBLIC QUERIES
  // ============================================================================

  /**
   * Get user by ID (public profile view)
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        include: {
          profileImage: true,
          obleuteBezirk: true,
          teamMember: {
            include: {
              user: {
                include: {
                  profileImage: true,
                },
              },
            },
          },
          posaunenratMember: {
            include: {
              image: true,
            },
          },
          vorstandMember: {
            include: {
              image: true,
            },
          },
          foerdervereinMember: {
            include: {
              image: true,
            },
          },
          posaunenwarteResponsibilities: {
            include: {
              bezirk: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),

  /**
   * Get user by username (public profile view)
   */
  getByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { username: input.username },
        include: {
          profileImage: true,
          obleuteBezirk: true,
          teamMember: true,
          posaunenratMember: true,
          vorstandMember: true,
          foerdervereinMember: true,
          posaunenwarteResponsibilities: {
            include: {
              bezirk: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),

  /**
   * Search users (public - for mentions, etc.)
   */
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(2),
        limit: z.number().min(1).max(50).default(10),
        role: z.nativeEnum(UserRole).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        where: {
          ...(input.role && { role: input.role }),
          OR: [
            { displayName: { contains: input.query, mode: "insensitive" } },
            { email: { contains: input.query, mode: "insensitive" } },
            { username: { contains: input.query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          displayName: true,
          username: true,
          email: true,
          role: true,
          profileImage: {
            select: {
              url: true,
              alt: true,
            },
          },
        },
        take: input.limit,
        orderBy: { displayName: "asc" },
      });

      return users;
    }),

  /**
   * Get users by role
   */
  getByRole: publicProcedure
    .input(
      z.object({
        role: z.nativeEnum(UserRole),
        includeBezirk: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        where: { role: input.role },
        include: {
          profileImage: true,
          ...(input.includeBezirk && {
            obleuteBezirk: true,
          }),
        },
        orderBy: [{ obleuteBezirk: { number: "asc" } }, { displayName: "asc" }],
      });

      return users;
    }),

  /**
   * Get all users with specific membership
   */
  getWithMembership: publicProcedure
    .input(
      z.object({
        membershipType: z.enum([
          "team",
          "vorstand",
          "posaunenrat",
          "foerderverein",
        ]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause =
        input.membershipType === "team"
          ? { teamMember: { isNot: null } }
          : input.membershipType === "vorstand"
            ? { vorstandMember: { isNot: null } }
            : input.membershipType === "posaunenrat"
              ? { posaunenratMember: { isNot: null } }
              : { foerdervereinMember: { isNot: null } };

      const users = await ctx.db.user.findMany({
        where: whereClause,
        include: {
          profileImage: true,
          teamMember: input.membershipType === "team",
          vorstandMember: input.membershipType === "vorstand",
          posaunenratMember: input.membershipType === "posaunenrat",
          foerdervereinMember: input.membershipType === "foerderverein",
        },
        orderBy: { displayName: "asc" },
      });

      return users;
    }),

  // ============================================================================
  // PROTECTED (USER OWN PROFILE)
  // ============================================================================

  /**
   * Get current user's full profile
   */
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        profileImage: true,
        obleuteBezirk: true,
        teamMember: true,
        posaunenratMember: {
          include: {
            image: true,
          },
        },
        vorstandMember: {
          include: {
            image: true,
          },
        },
        foerdervereinMember: {
          include: {
            image: true,
          },
        },
        posaunenwarteResponsibilities: {
          include: {
            bezirk: true,
          },
        },
      },
    });

    return user;
  }),

  /**
   * Update own profile
   */
  updateMyProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        username: z.string().min(3).max(30).optional(),
        bio: z.string().max(500).optional(),
        profileImageId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if username is already taken
      if (input.username) {
        const existing = await ctx.db.user.findFirst({
          where: {
            username: input.username,
            NOT: { id: ctx.session.user.id },
          },
        });

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Username already taken",
          });
        }
      }

      return await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
        include: {
          profileImage: true,
        },
      });
    }),

  /**
   * Update own preferences
   */
  updateMyPreferences: protectedProcedure
    .input(
      z.object({
        preferences: z.string(), // JSON string
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { preferences: input.preferences },
      });
    }),

  // ============================================================================
  // ADMIN: USER MANAGEMENT
  // ============================================================================

  /**
   * List all users with pagination and filters
   */
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        role: z.nativeEnum(UserRole).optional(),
        search: z.string().optional(),
        sortBy: z
          .enum(["name", "email", "role", "createdAt"])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.role && { role: input.role }),
        ...(input.search && {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            {
              email: { contains: input.search, mode: "insensitive" as const },
            },
            {
              username: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }),
      };

      const [users, total] = await Promise.all([
        ctx.db.user.findMany({
          where,
          include: {
            profileImage: true,
            obleuteBezirk: true,
            teamMember: true,
            posaunenratMember: true,
            vorstandMember: true,
            foerdervereinMember: true,
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { [input.sortBy]: input.sortOrder },
        }),
        ctx.db.user.count({ where }),
      ]);

      return {
        users,
        total,
        page: input.page,
        limit: input.limit,
        pages: Math.ceil(total / input.limit),
      };
    }),

  /**
   * Get user statistics
   */
  getStatistics: adminProcedure.query(async ({ ctx }) => {
    const [
      totalUsers,
      usersByRole,
      usersWithTeam,
      usersWithVorstand,
      usersWithPosaunenrat,
      usersWithFoerderverein,
      recentUsers,
    ] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.user.groupBy({
        by: ["role"],
        _count: true,
      }),
      ctx.db.user.count({ where: { teamMember: { isNot: null } } }),
      ctx.db.user.count({ where: { vorstandMember: { isNot: null } } }),
      ctx.db.user.count({ where: { posaunenratMember: { isNot: null } } }),
      ctx.db.user.count({ where: { foerdervereinMember: { isNot: null } } }),
      ctx.db.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
    ]);

    return {
      totalUsers,
      usersByRole: usersByRole.reduce(
        (acc, curr) => {
          acc[curr.role] = curr._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      membership: {
        team: usersWithTeam,
        vorstand: usersWithVorstand,
        posaunenrat: usersWithPosaunenrat,
        foerderverein: usersWithFoerderverein,
      },
      recentUsers,
    };
  }),

  /**
   * Create a new user (admin)
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        username: z.string().min(3).max(30).optional(),
        role: z.nativeEnum(UserRole).default("USER"),
        bio: z.string().optional(),
        obleuteBezirkId: z.string().optional(),
        obleuteRole: z.string().optional(),
        profileImageId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if email already exists
      const existingEmail = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existingEmail) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already exists",
        });
      }

      // Check if username already exists
      if (input.username) {
        const existingUsername = await ctx.db.user.findUnique({
          where: { username: input.username },
        });

        if (existingUsername) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Username already exists",
          });
        }
      }

      return await ctx.db.user.create({
        data: input,
        include: {
          profileImage: true,
          obleuteBezirk: true,
        },
      });
    }),

  /**
   * Update any user (admin)
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        username: z.string().min(3).max(30).optional(),
        role: z.nativeEnum(UserRole).optional(),
        bio: z.string().optional(),
        displayRole: z.string().optional(),
        obleuteBezirkId: z.string().optional().nullable(),
        obleuteRole: z.string().optional().nullable(),
        profileImageId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Check if email is being changed and already exists
      if (updateData.email) {
        const existing = await ctx.db.user.findFirst({
          where: {
            email: updateData.email,
            NOT: { id },
          },
        });

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already exists",
          });
        }
      }

      // Check if username is being changed and already exists
      if (updateData.username) {
        const existing = await ctx.db.user.findFirst({
          where: {
            username: updateData.username,
            NOT: { id },
          },
        });

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Username already exists",
          });
        }
      }

      return await ctx.db.user.update({
        where: { id },
        data: updateData,
        include: {
          profileImage: true,
          obleuteBezirk: true,
        },
      });
    }),

  /**
   * Delete a user (admin) - soft delete by archiving
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user has important relations
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        include: {
          createdEvents: { take: 1 },
          createdCourses: { take: 1 },
          createdPosts: { take: 1 },
          teamMember: true,
          vorstandMember: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Prevent deletion of users with important roles or content
      if (
        user.teamMember ||
        user.vorstandMember ||
        user.createdEvents.length > 0 ||
        user.createdCourses.length > 0 ||
        user.createdPosts.length > 0
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Cannot delete user with active memberships or created content. Remove memberships and reassign content first.",
        });
      }

      // Actually delete (or you could implement soft delete)
      await ctx.db.user.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // ============================================================================
  // LPW: ROLE MANAGEMENT
  // ============================================================================

  /**
   * Update user role and permissions
   */
  updateRole: lpwProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.nativeEnum(UserRole),
        obleuteBezirkId: z.string().optional().nullable(),
        obleuteRole: z.string().optional().nullable(),
        displayRole: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, ...updateData } = input;

      // Verify user exists
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return await ctx.db.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          obleuteBezirk: true,
        },
      });
    }),

  /**
   * Bulk update user roles
   */
  bulkUpdateRoles: lpwProcedure
    .input(
      z.object({
        updates: z.array(
          z.object({
            userId: z.string(),
            role: z.nativeEnum(UserRole),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.updates.map((update) =>
          ctx.db.user.update({
            where: { id: update.userId },
            data: { role: update.role },
          }),
        ),
      );

      return {
        success: true,
        updated: results.length,
      };
    }),

  // ============================================================================
  // UTILITY QUERIES
  // ============================================================================

  /**
   * Check if username is available
   */
  checkUsername: publicProcedure
    .input(z.object({ username: z.string().min(3).max(30) }))
    .query(async ({ ctx, input }) => {
      const existing = await ctx.db.user.findUnique({
        where: { username: input.username },
      });

      return {
        available: !existing,
      };
    }),

  /**
   * Get email from username for login
   */
  getEmailByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { username: input.username },
        select: { email: true },
      });

      return {
        email: user?.email ?? null,
      };
    }),

  /**
   * Check if email is available
   */
  checkEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      return {
        available: !existing,
      };
    }),

  /**
   * Get users for select dropdown (admin/protected)
   */
  getForSelect: protectedProcedure
    .input(
      z.object({
        role: z.nativeEnum(UserRole).optional(),
        excludeIds: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        where: {
          ...(input.role && { role: input.role }),
          ...(input.excludeIds && {
            id: { notIn: input.excludeIds },
          }),
        },
        select: {
          id: true,
          displayName: true,
          email: true,
          username: true,
          role: true,
        },
        orderBy: { displayName: "asc" },
      });

      return users;
    }),
});
