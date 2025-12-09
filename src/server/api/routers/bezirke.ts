import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, adminProcedure } from "../trpc";

export const bezirkeRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const bezirke = await ctx.db.bezirk.findMany({
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            phone: true,
            email: true,
            profileImage: true,
            obleuteRole: true,
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
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              email: true,
              profileImage: true,
              obleuteRole: true,
              bio: true,
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
            select: {
              id: true,
              displayName: true,
              email: true,
              profileImage: true,
              obleuteRole: true,
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
        name: z.string().min(1),
        shortName: z.string().min(1),
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
        name: z.string().min(1).optional(),
        shortName: z.string().min(1).optional(),
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
              users: true,
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
});
