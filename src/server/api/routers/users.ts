import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  adminProcedure,
  lpwProcedure,
} from "../trpc";
// UserRole enum removed - using permissions system instead

/**
 * USERS ROUTER
 *
 * Handles comprehensive user management beyond just auth
 * Includes: profiles, roles, permissions, organization membership
 */

export const usersRouter = createTRPCRouter({
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
          bezirk: true,
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
          bezirk: true,
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
        // role filter removed - use permissions system instead
      }),
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        where: {
          // role filter removed
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
   * Get users by role (deprecated - use permissions system instead)
   * Returns all users since role filtering is no longer available
   */
  getByRole: publicProcedure
    .input(
      z.object({
        // role parameter removed - use permissions system instead
        includeBezirk: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        where: {}, // role filter removed - use permissions system instead
        include: {
          profileImage: true,
          ...(input.includeBezirk && {
            bezirk: true,
          }),
        },
        orderBy: [{ bezirk: { number: "asc" } }, { displayName: "asc" }],
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

  /**
   * Get current user's full profile
   */
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        profileImage: true,
        bezirk: true,
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
        name: z.string().min(1).max(100).optional(),
        username: z
          .string()
          .min(3)
          .max(30)
          .regex(/^[a-zA-Z0-9_.-]+$/)
          .optional(),
        bio: z.string().max(2000).optional(),
        profileImageId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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
   * Update own profile with all fields
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().max(100).optional(),
        lastName: z.string().max(100).optional(),
        displayName: z.string().max(100).optional(),
        username: z
          .string()
          .min(3)
          .max(30)
          .regex(/^[a-zA-Z0-9_.-]+$/)
          .optional(),
        phone: z
          .string()
          .max(50)
          .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
          .optional(),
        street: z.string().max(200).optional(),
        zipCode: z.string().max(20).optional(),
        city: z.string().max(100).optional(),
        birthDate: z
          .string()
          .refine((date) => !date || new Date(date) < new Date(), {
            message: "Geburtsdatum muss in der Vergangenheit liegen",
          })
          .optional(),
        bio: z.string().max(2000).optional(),
        profileImageId: z.string().optional().nullable(),
        preferences: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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
            message: "Benutzername bereits vergeben",
          });
        }
      }

      return await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          displayName: input.displayName,
          username: input.username,
          phone: input.phone,
          street: input.street,
          birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
          zipCode: input.zipCode,
          city: input.city,
          bio: input.bio,
          profileImageId: input.profileImageId,
          preferences: input.preferences,
        },
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
        preferences: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { preferences: input.preferences },
      });
    }),

  /**
   * List all users with pagination and filters
   */
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        // role filter removed - use permissions system instead
        search: z.string().optional(),
        sortBy: z
          .enum(["displayName", "email", "createdAt"])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        // role filter removed
        ...(input.search && {
          OR: [
            {
              displayName: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
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
            bezirk: true,
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
      Promise.resolve([]), // Role grouping no longer available
      ctx.db.user.count({ where: { teamMember: { isNot: null } } }),
      ctx.db.user.count({ where: { vorstandMember: { isNot: null } } }),
      ctx.db.user.count({ where: { posaunenratMember: { isNot: null } } }),
      ctx.db.user.count({ where: { foerdervereinMember: { isNot: null } } }),
      ctx.db.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      totalUsers,
      usersByRole: usersByRole.reduce(
        (acc) => {
          // role-based grouping removed
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
        firstName: z.string().min(1, "Vorname ist erforderlich").max(100),
        lastName: z.string().min(1, "Nachname ist erforderlich").max(100),
        displayName: z.string().max(100).optional(),
        email: z.string().email("Bitte gib eine gültige E-Mail-Adresse ein"),
        username: z
          .string()
          .min(3, "Benutzername muss mindestens 3 Zeichen haben")
          .max(30, "Benutzername darf maximal 30 Zeichen haben")
          .regex(
            /^[a-zA-Z0-9_.-]+$/,
            "Benutzername darf nur Buchstaben, Zahlen, Unterstrich, Bindestrich und Punkt enthalten",
          )
          .optional(),
        districtRoleName: z.string().max(100).optional(),
        bio: z.string().max(2000).optional(),
        bezirkId: z.string().optional().nullable(),
        profileImageId: z.string().optional(),
        street: z.string().max(200).optional(),
        zipCode: z.string().max(20).optional(),
        city: z.string().max(100).optional(),
        phone: z
          .string()
          .max(50)
          .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingEmail = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existingEmail) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Diese E-Mail-Adresse ist bereits registriert",
        });
      }

      if (input.username) {
        const existingUsername = await ctx.db.user.findUnique({
          where: { username: input.username },
        });

        if (existingUsername) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Dieser Benutzername ist bereits vergeben",
          });
        }
      }

      return await ctx.db.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          displayName:
            input.displayName || `${input.firstName} ${input.lastName}`,
          email: input.email,
          username: input.username,
          districtRoleName: input.districtRoleName,
          bio: input.bio,
          bezirkId: input.bezirkId,
          profileImageId: input.profileImageId,
          street: input.street,
          zipCode: input.zipCode,
          city: input.city,
          phone: input.phone,
        },
        include: {
          profileImage: true,
          bezirk: true,
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
        displayName: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
        username: z
          .string()
          .min(3, "Benutzername muss mindestens 3 Zeichen haben")
          .max(30, "Benutzername darf maximal 30 Zeichen haben")
          .regex(
            /^[a-zA-Z0-9_.-]+$/,
            "Benutzername darf nur Buchstaben, Zahlen, Unterstrich, Bindestrich und Punkt enthalten",
          )
          .optional(),
        // role filter removed - use permissions system instead
        bio: z.string().max(2000).optional(),
        districtRoleName: z.string().max(100).optional(),
        bezirkId: z.string().optional().nullable(),
        profileImageId: z.string().optional().nullable(),
        street: z.string().max(200).optional(),
        zipCode: z.string().max(20).optional(),
        city: z.string().max(100).optional(),
        phone: z
          .string()
          .max(50)
          .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

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
          bezirk: true,
        },
      });
    }),

  /**
   * Delete a user (admin) - soft delete by archiving
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
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

      await ctx.db.user.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Update user role and permissions
   */
  updateRole: lpwProcedure
    .input(
      z.object({
        userId: z.string(),
        districtRoleName: z.string().max(100).optional().nullable(),
        bezirkId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, ...updateData } = input;

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
          bezirk: true,
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
            // role removed - use permissions system instead
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.updates.map((update) =>
          ctx.db.user.update({
            where: { id: update.userId },
            data: {}, // role removed - use permissions system instead
          }),
        ),
      );

      return {
        success: true,
        updated: results.length,
      };
    }),

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
    .input(
      z.object({
        email: z.string().email("Bitte gib eine gültige E-Mail-Adresse ein"),
      }),
    )
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
        // role filter removed - use permissions system instead
        excludeIds: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.user.findMany({
        where: {
          // role filter removed
          ...(input.excludeIds && {
            id: { notIn: input.excludeIds },
          }),
        },
        select: {
          id: true,
          displayName: true,
          email: true,
          username: true,
        },
        orderBy: { displayName: "asc" },
      });

      return users;
    }),

  /**
   * Export all user data for GDPR compliance (Art. 20 DSGVO)
   * Users can export their own data, admins can export any user's data
   */
  exportData: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(), // If not provided, exports current user's data
      }),
    )
    .query(async ({ ctx, input }) => {
      const targetUserId = input.userId ?? ctx.session.user.id;
      const isAdmin = await (async () => {
        const { userHasPermission } = await import(
          "@/server/api/helpers/permissions"
        );
        const { PERMISSIONS } = await import("@/lib/permissions");
        return await userHasPermission(
          ctx.session.user.id,
          PERMISSIONS.USERS_MANAGE,
        );
      })();

      // Users can only export their own data unless they're admin
      if (!isAdmin && targetUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only export your own data",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: targetUserId },
        include: {
          profileImage: true,
          bezirk: true,
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

      // Get course registrations
      const registrations = await ctx.db.courseRegistration.findMany({
        where: {
          OR: [
            { registrantId: targetUserId },
            { registrantEmail: user.email },
          ],
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
            },
          },
          participants: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Get saved participants
      const savedParticipants = await ctx.db.savedParticipant.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: "desc" },
      });

      // Get newsletter subscription status
      const newsletterSubscriber =
        await ctx.db.newsletterSubscriber.findUnique({
          where: { email: user.email },
        });

      // Get sessions (only if admin or user themselves)
      const sessions = await ctx.db.session.findMany({
        where: { userId: targetUserId },
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
          ipAddress: true,
          userAgent: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100, // Limit to last 100 sessions
      });

      // Get page view stats (if user consented)
      const pageViews = await ctx.db.pageView.findMany({
        where: { userId: targetUserId },
        select: {
          id: true,
        path: true,
        section: true,
        createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1000, // Limit to last 1000 views
      });

      // Get created content counts (without full data for privacy)
      const [createdEventsCount, createdCoursesCount, createdPostsCount] =
        await Promise.all([
          ctx.db.event.count({ where: { createdById: targetUserId } }),
          ctx.db.course.count({ where: { createdById: targetUserId } }),
          ctx.db.post.count({ where: { createdById: targetUserId } }),
        ]);

      return {
        exportedAt: new Date().toISOString(),
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          street: user.street,
          zipCode: user.zipCode,
          city: user.city,
          birthDate: user.birthDate,
          bio: user.bio,
          preferences: user.preferences,
          districtRoleName: user.districtRoleName,
          bezirk: user.bezirk
            ? {
                id: user.bezirk.id,
                name: user.bezirk.name,
              }
            : null,
          profileImage: user.profileImage
            ? {
                id: user.profileImage.id,
                url: user.profileImage.url,
                filename: user.profileImage.filename,
              }
            : null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        memberships: {
          teamMember: user.teamMember ? true : false,
          posaunenratMember: user.posaunenratMember ? true : false,
          vorstandMember: user.vorstandMember ? true : false,
          foerdervereinMember: user.foerdervereinMember ? true : false,
          posaunenwarteResponsibilities:
            user.posaunenwarteResponsibilities.map((pw) => ({
              bezirkId: pw.bezirkId,
              bezirkName: pw.bezirk?.name,
            })),
        },
        courseRegistrations: registrations.map((reg) => ({
          id: reg.id,
          course: {
            id: reg.course.id,
            title: reg.course.title,
            startDate: reg.course.startDate,
            endDate: reg.course.endDate,
          },
          registrantFirstName: reg.registrantFirstName,
          registrantLastName: reg.registrantLastName,
          registrantEmail: reg.registrantEmail,
          registrantPhone: reg.registrantPhone,
          registrantStreet: reg.registrantStreet,
          registrantZipCode: reg.registrantZipCode,
          registrantCity: reg.registrantCity,
          useSeparateBilling: reg.useSeparateBilling,
          billingCompany: reg.billingCompany,
          billingFirstName: reg.billingFirstName,
          billingLastName: reg.billingLastName,
          billingStreet: reg.billingStreet,
          billingZipCode: reg.billingZipCode,
          billingCity: reg.billingCity,
          billingEmail: reg.billingEmail,
          totalPrice: reg.totalPrice,
          paymentStatus: reg.paymentStatus,
          registrationStatus: reg.registrationStatus,
          siblingDiscountApplied: reg.siblingDiscountApplied,
          invoiceGenerated: reg.invoiceGenerated,
          invoiceId: reg.invoiceId,
          invoiceDate: reg.invoiceDate,
          participants: reg.participants.map((p) => ({
            firstName: p.firstName,
            lastName: p.lastName,
            birthDate: p.birthDate,
            city: p.city,
            instrument: p.instrument,
            customFields: p.customFields,
          })),
          createdAt: reg.createdAt,
          updatedAt: reg.updatedAt,
        })),
        savedParticipants: savedParticipants.map((sp) => ({
          id: sp.id,
          firstName: sp.firstName,
          lastName: sp.lastName,
          birthDate: sp.birthDate,
          city: sp.city,
          instrument: sp.instrument,
          customFields: sp.customFields,
          createdAt: sp.createdAt,
          updatedAt: sp.updatedAt,
        })),
        newsletterSubscription: newsletterSubscriber
          ? {
              email: newsletterSubscriber.email,
              name: newsletterSubscriber.name,
              isActive: newsletterSubscriber.isActive,
              subscribedAt: newsletterSubscriber.subscribedAt,
              unsubscribedAt: newsletterSubscriber.unsubscribedAt,
            }
          : null,
        sessions: sessions,
        pageViews: pageViews,
        contentCounts: {
          createdEvents: createdEventsCount,
          createdCourses: createdCoursesCount,
          createdPosts: createdPostsCount,
        },
      };
    }),

  /**
   * Delete own account (Art. 17 DSGVO - Right to erasure)
   * Users can delete their own account, but must handle dependencies first
   */
  deleteMyAccount: protectedProcedure
    .input(
      z.object({
        confirmEmail: z.string().email(), // User must confirm with their email
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        include: {
          createdEvents: { take: 1 },
          createdCourses: { take: 1 },
          createdPosts: { take: 1 },
          teamMember: true,
          vorstandMember: true,
          posaunenratMember: true,
          foerdervereinMember: true,
          courseRegistrations: {
            where: {
              // Only count registrations that might have legal retention requirements
              invoiceGenerated: true,
            },
            take: 1,
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Verify email matches
      if (user.email !== input.confirmEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email confirmation does not match",
        });
      }

      // Check for blocking dependencies
      const blockingIssues: string[] = [];

      if (user.teamMember) {
        blockingIssues.push("active team membership");
      }
      if (user.vorstandMember) {
        blockingIssues.push("active Vorstand membership");
      }
      if (user.posaunenratMember) {
        blockingIssues.push("active Posaunenrat membership");
      }
      if (user.foerdervereinMember) {
        blockingIssues.push("active Förderverein membership");
      }
      if (user.createdEvents.length > 0) {
        blockingIssues.push("created events (must be reassigned or deleted)");
      }
      if (user.createdCourses.length > 0) {
        blockingIssues.push("created courses (must be reassigned or deleted)");
      }
      if (user.createdPosts.length > 0) {
        blockingIssues.push("created posts (must be reassigned or deleted)");
      }
      if (user.courseRegistrations.length > 0) {
        blockingIssues.push(
          "course registrations with invoices (legal retention requirement - contact admin for anonymization)",
        );
      }

      if (blockingIssues.length > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot delete account due to: ${blockingIssues.join(", ")}. Please contact support for assistance.`,
        });
      }

      // Delete saved participants first (cascade should handle this, but explicit is better)
      await ctx.db.savedParticipant.deleteMany({
        where: { userId: user.id },
      });

      // Delete sessions
      await ctx.db.session.deleteMany({
        where: { userId: user.id },
      });

      // Delete page views
      await ctx.db.pageView.deleteMany({
        where: { userId: user.id },
      });

      // Delete accounts (auth system)
      await ctx.db.account.deleteMany({
        where: { userId: user.id },
      });

      // Finally delete the user
      await ctx.db.user.delete({
        where: { id: user.id },
      });

      return { success: true };
    }),
});
