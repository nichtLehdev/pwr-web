import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  lpwProcedure,
  posaunenratProcedure,
  publicProcedure,
} from "../trpc";

export const locationsRouter = createTRPCRouter({
  // Public: Get all locations
  getAll: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        city: z.string().optional(),
        zipCode: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.city && {
          city: { contains: input.city, mode: "insensitive" as const },
        }),
        ...(input.zipCode && { zipCode: input.zipCode }),
        ...(input.search && {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            { city: { contains: input.search, mode: "insensitive" as const } },
            {
              street: { contains: input.search, mode: "insensitive" as const },
            },
          ],
        }),
      };

      const [locations, total] = await Promise.all([
        ctx.db.location.findMany({
          where,
          include: {
            _count: {
              select: {
                events: true,
                courses: true,
                ensembles: true,
              },
            },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { city: "asc" },
        }),
        ctx.db.location.count({ where }),
      ]);

      return {
        locations,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  // Get single location by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const location = await ctx.db.location.findUnique({
        where: { id: input.id },
        include: {
          events: {
            where: {
              status: "APPROVED",
              eventDate: { gte: new Date() },
            },
            take: 10,
            orderBy: { eventDate: "asc" },
            include: {
              coverImage: true,
            },
          },
          courses: {
            where: {
              status: "APPROVED",
              endDate: { gte: new Date() },
            },
            take: 5,
            orderBy: { startDate: "asc" },
          },
          ensembles: {
            where: { isActive: true },
            include: {
              image: true,
            },
          },
        },
      });

      if (!location) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Location not found",
        });
      }

      return location;
    }),

  // Create location
  create: posaunenratProcedure
    .input(
      z.object({
        name: z.string().optional(),
        street: z.string().optional(),
        zipCode: z.string().optional(),
        city: z.string().min(1),
        additionalInfo: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.location.create({
        data: input,
      });
    }),

  // Update location
  update: lpwProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        street: z.string().optional(),
        zipCode: z.string().optional(),
        city: z.string().optional(),
        additionalInfo: z.string().optional(),
        latitude: z.number().optional().nullable(),
        longitude: z.number().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      return await ctx.db.location.update({
        where: { id },
        data: updateData,
      });
    }),

  // Delete location
  delete: lpwProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if location is in use
      const location = await ctx.db.location.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              events: true,
              courses: true,
              ensembles: true,
            },
          },
        },
      });

      if (!location) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Location not found",
        });
      }

      if (
        location._count.events > 0 ||
        location._count.courses > 0 ||
        location._count.ensembles > 0
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete location that is in use",
        });
      }

      await ctx.db.location.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Get locations by city
  getByCity: publicProcedure
    .input(z.object({ city: z.string() }))
    .query(async ({ ctx, input }) => {
      const locations = await ctx.db.location.findMany({
        where: {
          city: { contains: input.city, mode: "insensitive" },
        },
        orderBy: { name: "asc" },
      });

      return locations;
    }),
});

export const newsletterRouter = createTRPCRouter({
  // Public: Subscribe to newsletter
  subscribe: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if already subscribed
      const existing = await ctx.db.newsletterSubscriber.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        if (existing.isActive) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already subscribed",
          });
        }

        // Reactivate subscription
        return await ctx.db.newsletterSubscriber.update({
          where: { email: input.email },
          data: {
            isActive: true,
            name: input.name,
            subscribedAt: new Date(),
            unsubscribedAt: null,
          },
        });
      }

      return await ctx.db.newsletterSubscriber.create({
        data: input,
      });
    }),

  // Public: Unsubscribe from newsletter
  unsubscribe: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const subscriber = await ctx.db.newsletterSubscriber.findUnique({
        where: { email: input.email },
      });

      if (!subscriber) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email not found",
        });
      }

      return await ctx.db.newsletterSubscriber.update({
        where: { email: input.email },
        data: {
          isActive: false,
          unsubscribedAt: new Date(),
        },
      });
    }),

  // Admin: Get all subscribers
  getSubscribers: lpwProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        isActive: z.boolean().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.search && {
          OR: [
            { email: { contains: input.search, mode: "insensitive" as const } },
            { name: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [subscribers, total] = await Promise.all([
        ctx.db.newsletterSubscriber.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { subscribedAt: "desc" },
        }),
        ctx.db.newsletterSubscriber.count({ where }),
      ]);

      return {
        subscribers,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  // Admin: Get subscriber statistics
  getStatistics: lpwProcedure.query(async ({ ctx }) => {
    const [total, active, inactive] = await Promise.all([
      ctx.db.newsletterSubscriber.count(),
      ctx.db.newsletterSubscriber.count({ where: { isActive: true } }),
      ctx.db.newsletterSubscriber.count({ where: { isActive: false } }),
    ]);

    return {
      total,
      active,
      inactive,
    };
  }),

  // Admin: Delete subscriber
  deleteSubscriber: lpwProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.newsletterSubscriber.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
