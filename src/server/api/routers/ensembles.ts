import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  adminProcedure,
  createTRPCRouter,
  posaunenratProcedure,
  protectedProcedure,
  publicProcedure,
} from "../trpc";
import { userHasPermission } from "../helpers/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { permissionProcedure } from "../middleware/permissions";

export const ensemblesRouter = createTRPCRouter({
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
            rehearsalSchedules: {
              orderBy: { day: "asc" },
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
              downloads: {
                include: {
                  download: true,
                },
              },
            },
          },
          rehearsalSchedules: {
            orderBy: { day: "asc" },
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

  create: posaunenratProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(5000).optional(),
        bezirkId: z.string().optional(),
        imageId: z.string().optional(),
        locationId: z.string().optional(),
        rehearsalDay: z.string().max(50).optional(),
        rehearsalTime: z.string().max(50).optional(),
        rehearsalSchedules: z
          .array(
            z.object({
              day: z.string().min(1).max(50),
              time: z.string().min(1).max(50),
            }),
          )
          .optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z
          .string()
          .max(50)
          .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
          .optional(),
        contactWebsite: z.string().url().optional(),
        conductorId: z.string().optional(),
        conductorName: z.string().max(200).optional(),
        representativeId: z.string().optional(),
        representativeName: z.string().max(200).optional(),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { rehearsalSchedules, ...ensembleData } = input;
      const ensemble = await ctx.db.ensemble.create({
        data: {
          ...ensembleData,
          rehearsalSchedules: rehearsalSchedules
            ? {
                create: rehearsalSchedules,
              }
            : undefined,
        },
        include: {
          image: true,
          location: true,
          bezirk: true,
          conductor: true,
          representative: true,
          rehearsalSchedules: true,
        },
      });

      return ensemble;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(5000).optional(),
        bezirkId: z.string().optional().nullable(),
        imageId: z.string().optional().nullable(),
        locationId: z.string().optional().nullable(),
        rehearsalDay: z.string().max(50).optional(),
        rehearsalTime: z.string().max(50).optional(),
        rehearsalSchedules: z
          .array(
            z.object({
              day: z.string().min(1).max(50),
              time: z.string().min(1).max(50),
            }),
          )
          .optional(),
        contactEmail: z.string().email().optional().nullable(),
        contactPhone: z
          .string()
          .max(50)
          .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
          .optional(),
        contactWebsite: z.string().url().optional().nullable(),
        conductorId: z.string().optional().nullable(),
        conductorName: z.string().max(200).optional().nullable(),
        representativeId: z.string().optional().nullable(),
        representativeName: z.string().max(200).optional().nullable(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, rehearsalSchedules, ...updateData } = input;

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

      const canManageEnsembles = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.ORGANIZATION_MANAGE_ENSEMBLES,
      );
      const canEdit =
        ensemble.conductorId === ctx.session.user.id ||
        ensemble.representativeId === ctx.session.user.id ||
        canManageEnsembles;

      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      if (rehearsalSchedules !== undefined) {
        await ctx.db.rehearsalSchedule.deleteMany({
          where: { ensembleId: id },
        });
      }

      return await ctx.db.ensemble.update({
        where: { id },
        data: {
          ...updateData,
          ...(rehearsalSchedules !== undefined && {
            rehearsalSchedules: {
              create: rehearsalSchedules,
            },
          }),
        },
        include: {
          image: true,
          location: true,
          bezirk: true,
          conductor: true,
          representative: true,
          rehearsalSchedules: true,
        },
      });
    }),

  delete: permissionProcedure(PERMISSIONS.ENSEMBLES_DELETE)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.ensemble.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

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
          rehearsalSchedules: {
            orderBy: { day: "asc" },
          },
        },
        orderBy: { name: "asc" },
      });

      return ensembles;
    }),

  exportEnsembles: permissionProcedure(PERMISSIONS.DATA_EXPORT).query(async ({ ctx }) => {
    const ensembles = await ctx.db.ensemble.findMany({
      include: {
        image: true,
        location: true,
        bezirk: true,
        conductor: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        representative: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return {
      ensembles: ensembles.map((ensemble) => ({
        ...ensemble,
        imageUrl: ensemble.image?.url,
        locationName: ensemble.location?.name,
        bezirkName: ensemble.bezirk?.name,
        conductorEmail: ensemble.conductor?.email,
        representativeEmail: ensemble.representative?.email,
      })),
      exportedAt: new Date().toISOString(),
      count: ensembles.length,
    };
  }),

  importEnsembles: permissionProcedure(PERMISSIONS.DATA_IMPORT)
    .input(
      z.object({
        ensembles: z.array(
          z.object({
            name: z.string(),
            description: z.string().optional().nullable(),
            bezirkId: z.string().optional().nullable(),
            imageId: z.string().optional().nullable(),
            locationId: z.string().optional().nullable(),
            rehearsalDay: z.string().optional().nullable(),
            rehearsalTime: z.string().optional().nullable(),
            contactEmail: z.string().email().optional().nullable(),
            contactPhone: z.string().optional().nullable(),
            contactWebsite: z.string().url().optional().nullable(),
            conductorId: z.string().optional().nullable(),
            conductorName: z.string().optional().nullable(),
            representativeId: z.string().optional().nullable(),
            representativeName: z.string().optional().nullable(),
            isActive: z.boolean().optional(),
            originalId: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.ensembles.map(async (ensembleData) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { originalId, ...data } = ensembleData;
          return await ctx.db.ensemble.create({
            data: {
              ...data,
              isActive: data.isActive ?? true,
            },
          });
        }),
      );

      return {
        success: true,
        importedCount: results.length,
        ensembles: results,
      };
    }),
});
