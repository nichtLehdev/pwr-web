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
  // Public: Get all approved events
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

  // Get single event by ID
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

      // Only show non-approved events to creators, reviewers, and admins
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

  // Get events created by current user
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

  // Get events for dashboard based on user role
  getDashboardEvents: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.nativeEnum(ContentStatus).optional(),
        sortBy: z.enum(["eventDate", "title", "createdAt", "status"]).default("eventDate"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userRole = ctx.session.user.role;
      const userId = ctx.session.user.id;

      // Build where clause based on role
      let where: Record<string, unknown> = {};

      if (userRole === UserRole.ADMIN || userRole === UserRole.LPW) {
        // Admin and LPW can see all events
        if (input.status) {
          where.status = input.status;
        }
      } else if (userRole === UserRole.RPW) {
        // RPW can see all events except DRAFT status (unless they created it)
        if (input.status) {
          if (input.status === ContentStatus.DRAFT) {
            // For DRAFT, only show their own
            where = {
              status: ContentStatus.DRAFT,
              createdById: userId,
            };
          } else {
            where.status = input.status;
          }
        } else {
          // No status filter: show all non-draft OR own drafts
          where = {
            OR: [
              { status: { not: ContentStatus.DRAFT } },
              { createdById: userId },
            ],
          };
        }
      } else {
        // OBLEUTE, regular users, vorstand, posaunenrat members - only their own events
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

  // Get events pending review (for reviewers)
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

      // RPW can only review events in their district
      if (
        ctx.session.user.role === UserRole.RPW &&
        ctx.session.user.obleuteBezirkId
      ) {
        where.bezirkId = ctx.session.user.obleuteBezirkId;
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

  // Create event
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

  // Update event
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, priceOptions, ...updateData } = input;

      // Check permissions
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

      // Update price options if provided
      if (priceOptions) {
        // Delete existing price options
        await ctx.db.eventPriceOption.deleteMany({
          where: { eventId: id },
        });

        // Create new price options
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

  // Delete event
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

  // Approve event (for reviewers)
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

      // RPW can only approve events in their district
      if (
        ctx.session.user.role === UserRole.RPW &&
        event.bezirkId !== ctx.session.user.obleuteBezirkId
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
          reviewNotes: input.reviewNotes ?? null, // Clear old rejection notes if no new notes provided
          publishedAt: new Date(),
        },
      });
    }),

  // Reject event (for reviewers)
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
});
