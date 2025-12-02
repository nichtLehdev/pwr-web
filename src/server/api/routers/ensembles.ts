import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  adminProcedure,
  createTRPCRouter,
  posaunenratProcedure,
  protectedProcedure,
  publicProcedure,
} from "../trpc";
import { UserRole } from "~/generated/prisma/client";

export const ensemblesRouter = createTRPCRouter({
  // Public: Get all active ensembles
  getAll: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(500).default(50),
        bezirkId: z.string().optional(),
        isActive: z.boolean().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.bezirkId && { bezirkId: input.bezirkId }),
        ...(input.search && {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            {
              description: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }),
      };

      const [ensembles, total] = await Promise.all([
        ctx.db.ensemble.findMany({
          where,
          include: {
            image: true,
            location: true,
            bezirk: true,
            conductor: {
              select: {
                id: true,
                displayName: true,
                profileImage: true,
              },
            },
            representative: {
              select: {
                id: true,
                displayName: true,
                email: true,
                profileImage: true,
              },
            },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { name: "asc" },
        }),
        ctx.db.ensemble.count({ where }),
      ]);

      return {
        ensembles,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  // Get single ensemble by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const ensemble = await ctx.db.ensemble.findUnique({
        where: { id: input.id },
        include: {
          image: true,
          location: true,
          bezirk: true,
          conductor: {
            select: {
              id: true,
              displayName: true,
              profileImage: true,
              bio: true,
            },
          },
          representative: {
            select: {
              id: true,
              displayName: true,
              email: true,
              profileImage: true,
            },
          },
          events: {
            where: {
              status: "APPROVED",
              eventDate: { gte: new Date() },
            },
            take: 5,
            orderBy: { eventDate: "asc" },
            include: {
              coverImage: true,
              location: true,
            },
          },
        },
      });

      if (!ensemble) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ensemble not found",
        });
      }

      return ensemble;
    }),

  // Create ensemble (protected)
  create: posaunenratProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        bezirkId: z.string().optional(),
        imageId: z.string().optional(),
        locationId: z.string().optional(),
        rehearsalDay: z.string().optional(),
        rehearsalTime: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        contactWebsite: z.string().url().optional(),
        conductorId: z.string().optional(),
        representativeId: z.string().optional(),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ensemble = await ctx.db.ensemble.create({
        data: input,
        include: {
          image: true,
          location: true,
          bezirk: true,
          conductor: true,
          representative: true,
        },
      });

      return ensemble;
    }),

  // Update ensemble
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        bezirkId: z.string().optional().nullable(),
        imageId: z.string().optional().nullable(),
        locationId: z.string().optional().nullable(),
        rehearsalDay: z.string().optional(),
        rehearsalTime: z.string().optional(),
        contactEmail: z.string().email().optional().nullable(),
        contactPhone: z.string().optional(),
        contactWebsite: z.string().url().optional().nullable(),
        conductorId: z.string().optional().nullable(),
        representativeId: z.string().optional().nullable(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const ensemble = await ctx.db.ensemble.findUnique({
        where: { id },
        select: { conductorId: true, representativeId: true },
      });

      if (!ensemble) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ensemble not found",
        });
      }

      // Check permissions: conductor, representative, or admin/LPW/RPW
      const canEdit =
        ensemble.conductorId === ctx.session.user.id ||
        ensemble.representativeId === ctx.session.user.id ||
        ctx.session.user.role === UserRole.ADMIN ||
        ctx.session.user.role === UserRole.LPW ||
        ctx.session.user.role === UserRole.RPW;

      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      return await ctx.db.ensemble.update({
        where: { id },
        data: updateData,
        include: {
          image: true,
          location: true,
          bezirk: true,
          conductor: true,
          representative: true,
        },
      });
    }),

  // Delete ensemble
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.ensemble.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Get ensembles by bezirk
  getByBezirk: publicProcedure
    .input(z.object({ bezirkId: z.string() }))
    .query(async ({ ctx, input }) => {
      const ensembles = await ctx.db.ensemble.findMany({
        where: {
          bezirkId: input.bezirkId,
          isActive: true,
        },
        include: {
          image: true,
          location: true,
          conductor: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      return ensembles;
    }),
});
