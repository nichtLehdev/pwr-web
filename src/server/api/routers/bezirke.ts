import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, adminProcedure } from "../trpc";

export const bezirkeRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const bezirke = await ctx.db.bezirk.findMany({
      include: {
        users: {
          where: {
            districtRoleName: { not: null },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            phone: true,
            email: true,
            profileImage: true,
            districtRoleName: true,
            street: true,
            zipCode: true,
            city: true,
          },
        },
        _count: {
          select: {
            ensembles: { where: { isActive: true } },
            events: {
              where: {
                status: "APPROVED",
                eventDate: { gte: new Date() },
              },
            },
            courses: {
              where: {
                status: "APPROVED",
                endDate: { gte: new Date() },
              },
            },
          },
        },
      },
      orderBy: { number: "asc" },
    });

    return bezirke.map((bezirk) => ({
      ...bezirk,
      users: bezirk.users.map((user) => ({
        ...user,
        displayName: user.displayName || `${user.firstName} ${user.lastName}`,
        firstName: undefined,
        lastName: undefined,
        address:
          user.street || user.zipCode || user.city
            ? `${user.street}, ${user.zipCode} ${user.city}`
            : undefined,
      })),
    }));
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const bezirk = await ctx.db.bezirk.findUnique({
        where: { id: input.id },
        include: {
          users: {
            where: {
              districtRoleName: { not: null },
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              email: true,
              profileImage: true,
              districtRoleName: true,
              bio: true,
              street: true,
              zipCode: true,
              city: true,
            },
          },
          ensembles: {
            where: { isActive: true },
            include: {
              image: true,
              conductor: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
            orderBy: { name: "asc" },
          },
          events: {
            where: {
              status: "APPROVED",
              eventDate: { gte: new Date() },
            },
            take: 10,
            orderBy: { eventDate: "asc" },
            include: {
              coverImage: true,
              location: true,
              downloads: {
                include: {
                  download: true,
                },
              },
            },
          },
          courses: {
            where: {
              status: "APPROVED",
              endDate: { gte: new Date() },
            },
            take: 5,
            orderBy: { startDate: "asc" },
            include: {
              location: true,
            },
          },
          posts: {
            where: {
              status: "APPROVED",
            },
            take: 5,
            orderBy: { publishedAt: "desc" },
            include: {
              coverImage: true,
              createdBy: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
          },
        },
      });

      if (!bezirk) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bezirk not found",
        });
      }

      return bezirk;
    }),

  getByNumber: publicProcedure
    .input(z.object({ number: z.number().min(1).max(13) }))
    .query(async ({ ctx, input }) => {
      const bezirk = await ctx.db.bezirk.findUnique({
        where: { number: input.number },
        include: {
          users: {
            where: {
              districtRoleName: { not: null },
            },
            select: {
              id: true,
              displayName: true,
              email: true,
              profileImage: true,
              districtRoleName: true,
            },
          },
          _count: {
            select: {
              ensembles: { where: { isActive: true } },
              events: { where: { status: "APPROVED" } },
              courses: { where: { status: "APPROVED" } },
            },
          },
        },
      });

      if (!bezirk) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bezirk not found",
        });
      }

      return bezirk;
    }),

  create: adminProcedure
    .input(
      z.object({
        number: z.number().min(1).max(13),
        name: z.string().min(1).max(100),
        shortName: z.string().min(1).max(50),
        color: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const bezirk = await ctx.db.bezirk.create({
        data: input,
      });

      return bezirk;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        number: z.number().min(1).max(13).optional(),
        name: z.string().min(1).max(100).optional(),
        shortName: z.string().min(1).max(50).optional(),
        color: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      return await ctx.db.bezirk.update({
        where: { id },
        data: updateData,
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.bezirk.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  getStatistics: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const bezirk = await ctx.db.bezirk.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              ensembles: { where: { isActive: true } },
              events: { where: { status: "APPROVED" } },
              courses: { where: { status: "APPROVED" } },
              posts: { where: { status: "APPROVED" } },
              users: { where: { districtRoleName: { not: null } } },
            },
          },
        },
      });

      if (!bezirk) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bezirk not found",
        });
      }

      const upcomingEvents = await ctx.db.event.count({
        where: {
          bezirkId: input.id,
          status: "APPROVED",
          eventDate: { gte: new Date() },
        },
      });

      const activeCourses = await ctx.db.course.count({
        where: {
          bezirkId: input.id,
          status: "APPROVED",
          endDate: { gte: new Date() },
        },
      });

      return {
        totalEnsembles: bezirk._count.ensembles,
        totalEvents: bezirk._count.events,
        upcomingEvents,
        totalCourses: bezirk._count.courses,
        activeCourses,
        totalPosts: bezirk._count.posts,
        totalObleute: bezirk._count.users,
      };
    }),

  /**
   * Get all users for dropdown selection
   */
  getUsersForDropdown: adminProcedure.query(async ({ ctx }) => {
    return await ctx.db.user.findMany({
      select: {
        id: true,
        displayName: true,
        email: true,
        username: true,
      },
      orderBy: [{ displayName: "asc" }, { email: "asc" }],
    });
  }),

  /**
   * Assign users to district with custom role names
   * Each user can have a custom role name (e.g., "Bezirksobmann", "Bezirksobfrau", "Obleute")
   */
  assignUsers: adminProcedure
    .input(
      z.object({
        bezirkId: z.string(),
        obleuteAssignments: z
          .array(
            z.object({
              userId: z.string(),
              roleName: z.string().min(1).max(100), // Custom role name for this user
            }),
          )
          .optional()
          .default([]),
        stellObleuteAssignments: z
          .array(
            z.object({
              userId: z.string(),
              roleName: z.string().min(1).max(100), // Custom role name for this user
            }),
          )
          .optional()
          .default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { bezirkId, obleuteAssignments, stellObleuteAssignments } = input;

      // Verify district exists
      const bezirk = await ctx.db.bezirk.findUnique({
        where: { id: bezirkId },
      });

      if (!bezirk) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bezirk not found",
        });
      }

      // Remove all existing users from this district
      await ctx.db.user.updateMany({
        where: { bezirkId },
        data: { bezirkId: null, districtRoleName: null },
      });

      // Assign all obleute users with their custom role names
      for (const assignment of obleuteAssignments) {
        await ctx.db.user.update({
          where: { id: assignment.userId },
          data: {
            bezirkId,
            districtRoleName: assignment.roleName,
          },
        });
      }

      // Assign all stell. obleute users with their custom role names
      for (const assignment of stellObleuteAssignments) {
        await ctx.db.user.update({
          where: { id: assignment.userId },
          data: {
            bezirkId,
            districtRoleName: assignment.roleName,
          },
        });
      }

      return { success: true };
    }),
});
