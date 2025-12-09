import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  reviewerProcedure,
} from "../trpc";
import {
  EventCategory,
  ContentStatus,
  UserRole,
  EventEnsembleType,
} from "~/generated/prisma/client";

export const eventsRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        category: z.enum(EventCategory).optional(),
        bezirkId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        status: ContentStatus.APPROVED,
        ...(input.category && { category: input.category }),
        ...(input.bezirkId && { bezirkId: input.bezirkId }),
        ...(input.startDate && { eventDate: { gte: input.startDate } }),
        ...(input.endDate && { eventDate: { lte: input.endDate } }),
        ...(input.search && {
          OR: [
            { title: { contains: input.search, mode: "insensitive" as const } },
            {
              description: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
            { motto: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [events, total] = await Promise.all([
        ctx.db.event.findMany({
          where,
          include: {
            coverImage: true,
            location: true,
            bezirk: true,
            ensemble: true,
            auswahlChor: true,
            createdBy: {
              select: {
                id: true,
                displayName: true,
                profileImage: true,
              },
            },
            priceOptions: true,
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { eventDate: "asc" },
        }),
        ctx.db.event.count({ where }),
      ]);

      return {
        events,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({
        where: { id: input.id },
        include: {
          coverImage: true,
          location: true,
          bezirk: true,
          ensemble: {
            include: {
              conductor: { select: { id: true, displayName: true } },
              image: true,
            },
          },
          auswahlChor: {
            include: {
              conductor: { select: { id: true, displayName: true } },
              image: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              displayName: true,
              profileImage: true,
              role: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              displayName: true,
              role: true,
            },
          },
          priceOptions: true,
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (event.status !== ContentStatus.APPROVED) {
        if (!ctx.session?.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Event not published",
          });
        }

        const userRole = ctx.session.user.role;
        const canView =
          event.createdById === ctx.session.user.id ||
          userRole === UserRole.ADMIN ||
          userRole === UserRole.LPW ||
          userRole === UserRole.RPW;

        if (!canView) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Event not published",
          });
        }
      }

      return event;
    }),

  getMine: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.nativeEnum(ContentStatus).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        createdById: ctx.session.user.id,
        ...(input.status && { status: input.status }),
      };

      const [events, total] = await Promise.all([
        ctx.db.event.findMany({
          where,
          include: {
            coverImage: true,
            location: true,
            bezirk: true,
            reviewer: { select: { id: true, displayName: true } },
            priceOptions: true,
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.event.count({ where }),
      ]);

      return {
        events,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  getDashboardEvents: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.nativeEnum(ContentStatus).optional(),
        sortBy: z
          .enum(["eventDate", "title", "createdAt", "status"])
          .default("eventDate"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userRole = ctx.session.user.role;
      const userId = ctx.session.user.id;

      let where: Record<string, unknown> = {};

      if (userRole === UserRole.ADMIN || userRole === UserRole.LPW) {
        if (input.status) {
          where.status = input.status;
        }
      } else if (userRole === UserRole.RPW) {
        if (input.status) {
          if (input.status === ContentStatus.DRAFT) {
            where = {
              status: ContentStatus.DRAFT,
              createdById: userId,
            };
          } else {
            where.status = input.status;
          }
        } else {
          where = {
            OR: [
              { status: { not: ContentStatus.DRAFT } },
              { createdById: userId },
            ],
          };
        }
      } else {
        where = {
          createdById: userId,
          ...(input.status && { status: input.status }),
        };
      }

      const [events, total] = await Promise.all([
        ctx.db.event.findMany({
          where,
          include: {
            coverImage: true,
            location: true,
            bezirk: true,
            createdBy: {
              select: {
                id: true,
                displayName: true,
              },
            },
            reviewer: { select: { id: true, displayName: true } },
            priceOptions: true,
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { [input.sortBy]: input.sortOrder },
        }),
        ctx.db.event.count({ where }),
      ]);

      return {
        events,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  getPendingReview: reviewerProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        status: ContentStatus;
        pendingReview: boolean;
        bezirkId?: string;
      } = {
        status: ContentStatus.PENDING,
        pendingReview: true,
      };

      if (ctx.session.user.role === UserRole.RPW && ctx.session.user.bezirkId) {
        where.bezirkId = ctx.session.user.bezirkId;
      }

      const [events, total] = await Promise.all([
        ctx.db.event.findMany({
          where,
          include: {
            coverImage: true,
            location: true,
            bezirk: true,
            createdBy: { select: { id: true, displayName: true, email: true } },
            priceOptions: true,
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "asc" },
        }),
        ctx.db.event.count({ where }),
      ]);

      return {
        events,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        motto: z.string().optional(),
        description: z.string().optional(),
        coverImageId: z.string().optional(),
        eventDate: z.date(),
        locationId: z.string().optional(),
        category: z.enum(EventCategory),
        bezirkId: z.string().optional(),
        districtName: z.string().optional(),
        performingEnsembleType: z.enum(EventEnsembleType).optional(),
        ensembleId: z.string().optional(),
        auswahlChorId: z.string().optional(),
        performingEnsembleName: z.string().optional(),
        leitung: z.string().optional(),
        openToParticipants: z.boolean().default(false),
        participationInfo: z.string().optional(),
        isFree: z.boolean().default(true),
        priceInfo: z.string().optional(),
        priceOptions: z
          .array(
            z.object({
              price: z.number(),
              label: z.string(),
              description: z.string().optional(),
            }),
          )
          .optional(),
        status: z.enum(ContentStatus).default(ContentStatus.PENDING),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { priceOptions, ...eventData } = input;

      const event = await ctx.db.event.create({
        data: {
          ...eventData,
          createdById: ctx.session.user.id,
          priceOptions: priceOptions
            ? {
                create: priceOptions,
              }
            : undefined,
        },
        include: {
          coverImage: true,
          location: true,
          priceOptions: true,
        },
      });

      return event;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        motto: z.string().optional(),
        description: z.string().optional(),
        coverImageId: z.string().optional().nullable(),
        eventDate: z.date().optional(),
        locationId: z.string().optional().nullable(),
        category: z.enum(EventCategory).optional(),
        bezirkId: z.string().optional().nullable(),
        districtName: z.string().optional(),
        performingEnsembleType: z.enum(EventEnsembleType).optional(),
        ensembleId: z.string().optional().nullable(),
        auswahlChorId: z.string().optional().nullable(),
        performingEnsembleName: z.string().optional(),
        leitung: z.string().optional(),
        openToParticipants: z.boolean().optional(),
        participationInfo: z.string().optional(),
        isFree: z.boolean().optional(),
        priceInfo: z.string().optional(),
        priceOptions: z
          .array(
            z.object({
              id: z.string().optional(),
              price: z.number(),
              label: z.string(),
              description: z.string().optional(),
            }),
          )
          .optional(),
        status: z.enum(ContentStatus).optional(),
        cancelled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, priceOptions, ...updateData } = input;

      const event = await ctx.db.event.findUnique({
        where: { id },
        select: { createdById: true },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      const userRole = ctx.session.user.role;
      const canEdit =
        event.createdById === ctx.session.user.id ||
        userRole === UserRole.ADMIN ||
        userRole === UserRole.LPW;

      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      if (priceOptions) {
        await ctx.db.eventPriceOption.deleteMany({
          where: { eventId: id },
        });

        await ctx.db.eventPriceOption.createMany({
          data: priceOptions.map((option) => ({
            eventId: id,
            price: option.price,
            label: option.label,
            description: option.description,
          })),
        });
      }

      return await ctx.db.event.update({
        where: { id },
        data: updateData,
        include: {
          coverImage: true,
          location: true,
          priceOptions: true,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({
        where: { id: input.id },
        select: { createdById: true },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      const userRole = ctx.session.user.role;
      const canDelete =
        event.createdById === ctx.session.user.id ||
        userRole === UserRole.ADMIN ||
        userRole === UserRole.LPW;

      if (!canDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      await ctx.db.event.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  approve: reviewerProcedure
    .input(
      z.object({
        id: z.string(),
        reviewNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const event = await ctx.db.event.findUnique({
        where: { id: input.id },
        select: { bezirkId: true },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (
        ctx.session.user.role === UserRole.RPW &&
        event.bezirkId !== ctx.session.user.bezirkId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Can only approve events in your district",
        });
      }

      return await ctx.db.event.update({
        where: { id: input.id },
        data: {
          status: ContentStatus.APPROVED,
          reviewerId: ctx.session.user.id,
          reviewDate: new Date(),
          reviewNotes: input.reviewNotes ?? null,
          publishedAt: new Date(),
        },
      });
    }),

  reject: reviewerProcedure
    .input(
      z.object({
        id: z.string(),
        reviewNotes: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.event.update({
        where: { id: input.id },
        data: {
          status: ContentStatus.REJECTED,
          reviewerId: ctx.session.user.id,
          reviewDate: new Date(),
          reviewNotes: input.reviewNotes,
        },
      });
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userRole = ctx.session.user.role;
      const userId = ctx.session.user.id;

      const events = await ctx.db.event.findMany({
        where: { id: { in: input.ids } },
        select: { id: true, createdById: true },
      });

      const canDeleteIds = events
        .filter(
          (event) =>
            event.createdById === userId ||
            userRole === UserRole.ADMIN ||
            userRole === UserRole.LPW,
        )
        .map((e) => e.id);

      if (canDeleteIds.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No permission to delete any of the selected events",
        });
      }

      await ctx.db.event.deleteMany({
        where: { id: { in: canDeleteIds } },
      });

      return { success: true, deletedCount: canDeleteIds.length };
    }),

  bulkCancel: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userRole = ctx.session.user.role;
      const userId = ctx.session.user.id;

      const events = await ctx.db.event.findMany({
        where: { id: { in: input.ids } },
        select: { id: true, createdById: true },
      });

      const canUpdateIds = events
        .filter(
          (event) =>
            event.createdById === userId ||
            userRole === UserRole.ADMIN ||
            userRole === UserRole.LPW,
        )
        .map((e) => e.id);

      if (canUpdateIds.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No permission to cancel any of the selected events",
        });
      }

      await ctx.db.event.updateMany({
        where: { id: { in: canUpdateIds } },
        data: { cancelled: true },
      });

      return { success: true, cancelledCount: canUpdateIds.length };
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.db.event.findUnique({
        where: { id: input.id },
        include: {
          priceOptions: true,
        },
      });

      if (!original) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      const newEvent = await ctx.db.event.create({
        data: {
          title: `${original.title} (Kopie)`,
          description: original.description,
          motto: original.motto,
          eventDate: original.eventDate,
          category: original.category,
          locationId: original.locationId,
          bezirkId: original.bezirkId,
          ensembleId: original.ensembleId,
          auswahlChorId: original.auswahlChorId,
          performingEnsembleType: original.performingEnsembleType,
          performingEnsembleName: original.performingEnsembleName,
          leitung: original.leitung,
          openToParticipants: original.openToParticipants,
          participationInfo: original.participationInfo,
          coverImageId: original.coverImageId,
          status: ContentStatus.DRAFT,
          createdById: ctx.session.user.id,
          cancelled: false,
          priceOptions: {
            create: original.priceOptions.map((po) => ({
              label: po.label,
              price: po.price,
              description: po.description,
            })),
          },
        },
      });

      return newEvent;
    }),

  bulkDuplicate: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const originals = await ctx.db.event.findMany({
        where: { id: { in: input.ids } },
        include: {
          priceOptions: true,
        },
      });

      if (originals.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No events found",
        });
      }

      const newEvents = await Promise.all(
        originals.map((original) =>
          ctx.db.event.create({
            data: {
              title: `[DUPLIKAT] ${original.title}`,
              description: original.description,
              motto: original.motto,
              eventDate: original.eventDate,
              category: original.category,
              locationId: original.locationId,
              bezirkId: original.bezirkId,
              ensembleId: original.ensembleId,
              auswahlChorId: original.auswahlChorId,
              performingEnsembleType: original.performingEnsembleType,
              performingEnsembleName: original.performingEnsembleName,
              leitung: original.leitung,
              openToParticipants: original.openToParticipants,
              participationInfo: original.participationInfo,
              coverImageId: original.coverImageId,
              status: ContentStatus.DRAFT,
              createdById: ctx.session.user.id,
              cancelled: false,
              priceOptions: {
                create: original.priceOptions.map((po) => ({
                  label: po.label,
                  price: po.price,
                  description: po.description,
                })),
              },
            },
          }),
        ),
      );

      return { success: true, duplicatedCount: newEvents.length };
    }),

  bulkStatusChange: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1),
        status: z.nativeEnum(ContentStatus),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userRole = ctx.session.user.role;
      const userId = ctx.session.user.id;

      const events = await ctx.db.event.findMany({
        where: { id: { in: input.ids } },
        select: { id: true, createdById: true },
      });

      const canUpdateIds = events
        .filter(
          (event) =>
            event.createdById === userId ||
            userRole === UserRole.ADMIN ||
            userRole === UserRole.LPW,
        )
        .map((e) => e.id);

      if (canUpdateIds.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No permission to update any of the selected events",
        });
      }

      const updateData: { status: ContentStatus; publishedAt?: Date | null } = {
        status: input.status,
      };

      if (input.status === ContentStatus.APPROVED) {
        updateData.publishedAt = new Date();
      } else if (input.status === ContentStatus.DRAFT) {
        updateData.publishedAt = null;
      }

      await ctx.db.event.updateMany({
        where: { id: { in: canUpdateIds } },
        data: updateData,
      });

      return { success: true, updatedCount: canUpdateIds.length };
    }),
});
