import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  reviewerProcedure,
  adminProcedure,
} from "../trpc";
import {
  EventCategory,
  ContentStatus,
  EventEnsembleType,
} from "~/generated/prisma/client";
import { userHasPermission } from "../helpers/permissions";
import { PERMISSIONS } from "@/lib/permissions";

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
            downloads: {
              include: {
                download: true,
              },
            },
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
            },
          },
          reviewer: {
            select: {
              id: true,
              displayName: true,
            },
          },
          priceOptions: true,
          downloads: {
            include: {
              download: true,
            },
          },
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

        const canView =
          event.createdById === ctx.session.user.id ||
          (await userHasPermission(
            ctx.session.user.id,
            PERMISSIONS.EVENTS_VIEW,
          )) ||
          (await userHasPermission(
            ctx.session.user.id,
            PERMISSIONS.EVENTS_APPROVE,
          ));

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
            downloads: {
              include: {
                download: true,
              },
            },
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
        upcomingOnly: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const canApproveAll = await userHasPermission(
        userId,
        PERMISSIONS.EVENTS_APPROVE,
      );
      const canApproveOwn = await userHasPermission(
        userId,
        PERMISSIONS.EVENTS_CREATE,
      );

      let where: Record<string, unknown> = {};

      if (canApproveAll) {
        if (input.status) {
          where.status = input.status;
        }
      } else if (canApproveOwn) {
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

      if (input.upcomingOnly) {
        where.eventDate = { gte: new Date() };
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
            downloads: {
              include: {
                download: true,
              },
            },
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

      // Check if user can only approve for their district
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { bezirkId: true },
      });
      const canApproveAll = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.EVENTS_APPROVE,
      );
      // If user can't approve all but has a district, limit to their district
      if (!canApproveAll && user?.bezirkId) {
        where.bezirkId = user.bezirkId;
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
            downloads: {
              include: {
                download: true,
              },
            },
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
        title: z.string().min(1).max(200),
        motto: z.string().max(500).optional(),
        description: z.string().max(5000).optional(),
        coverImageId: z.string().optional(),
        downloadIds: z.array(z.string()).optional(),
        eventDate: z.date(),
        duration: z.number().int().min(0).optional(),
        locationId: z.string().optional(),
        category: z.enum(EventCategory),
        bezirkId: z.string().optional(),
        districtName: z.string().optional(),
        performingEnsembleType: z.enum(EventEnsembleType).optional(),
        ensembleId: z.string().optional(),
        auswahlChorId: z.string().optional(),
        performingEnsembleName: z.string().max(200).optional(),
        leitung: z.string().max(200).optional(),
        openToParticipants: z.boolean().default(false),
        participationInfo: z.string().max(1000).optional(),
        isFree: z.boolean().default(true),
        priceInfo: z.string().max(500).optional(),
        priceOptions: z
          .array(
            z.object({
              price: z.number().min(0),
              label: z.string().min(1).max(100),
              description: z.string().max(500).optional(),
            }),
          )
          .optional(),
        status: z.enum(ContentStatus).default(ContentStatus.PENDING),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { priceOptions, downloadIds, ...eventData } = input;

      const event = await ctx.db.event.create({
        data: {
          ...eventData,
          createdById: ctx.session.user.id,
          priceOptions: priceOptions
            ? {
                create: priceOptions,
              }
            : undefined,
          downloads: downloadIds
            ? {
                create: downloadIds.map((downloadId) => ({
                  downloadId,
                })),
              }
            : undefined,
        },
        include: {
          coverImage: true,
          location: true,
          priceOptions: true,
          downloads: {
            include: {
              download: true,
            },
          },
        },
      });

      return event;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        motto: z.string().max(500).optional(),
        description: z.string().max(5000).optional(),
        coverImageId: z.string().optional().nullable(),
        downloadIds: z.array(z.string()).optional(),
        eventDate: z.date().optional(),
        duration: z.number().int().min(0).optional().nullable(),
        locationId: z.string().optional().nullable(),
        category: z.enum(EventCategory).optional(),
        bezirkId: z.string().optional().nullable(),
        districtName: z.string().optional(),
        performingEnsembleType: z.enum(EventEnsembleType).optional(),
        ensembleId: z.string().optional().nullable(),
        auswahlChorId: z.string().optional().nullable(),
        performingEnsembleName: z.string().max(200).optional(),
        leitung: z.string().max(200).optional(),
        openToParticipants: z.boolean().optional(),
        participationInfo: z.string().max(1000).optional(),
        isFree: z.boolean().optional(),
        priceInfo: z.string().max(500).optional(),
        priceOptions: z
          .array(
            z.object({
              id: z.string().optional(),
              price: z.number().min(0),
              label: z.string().min(1).max(100),
              description: z.string().max(500).optional(),
            }),
          )
          .optional(),
        status: z.enum(ContentStatus).optional(),
        cancelled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, priceOptions, downloadIds, ...updateData } = input;

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

      const canEditCourse = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.EVENTS_EDIT,
      );
      const canEdit =
        event.createdById === ctx.session.user.id || canEditCourse;

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

      if (downloadIds !== undefined) {
        await ctx.db.eventDownload.deleteMany({
          where: { eventId: id },
        });

        if (downloadIds.length > 0) {
          await ctx.db.eventDownload.createMany({
            data: downloadIds.map((downloadId) => ({
              eventId: id,
              downloadId,
            })),
          });
        }
      }

      return await ctx.db.event.update({
        where: { id },
        data: updateData,
        include: {
          coverImage: true,
          location: true,
          priceOptions: true,
          downloads: {
            include: {
              download: true,
            },
          },
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

      const canDeleteEvent = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.EVENTS_DELETE,
      );
      const canDelete =
        event.createdById === ctx.session.user.id || canDeleteEvent;

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
        include: {
          coverImage: {
            select: { id: true, status: true },
          },
          downloads: {
            include: {
              download: {
                select: { id: true, status: true, title: true },
              },
            },
          },
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // Check if user can only approve for their district
      const userForApproval = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { bezirkId: true },
      });
      const canApproveAllEvents = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.EVENTS_APPROVE,
      );
      // If user can't approve all but has a district, check district match
      if (
        !canApproveAllEvents &&
        userForApproval?.bezirkId &&
        event.bezirkId !== userForApproval.bezirkId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Can only approve events in your district",
        });
      }

      if (event.coverImageId && event.coverImage) {
        if (event.coverImage.status !== ContentStatus.APPROVED) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Das Titelbild muss zuerst freigegeben werden, bevor das Event veröffentlicht werden kann.",
          });
        }
      }

      const pendingDownloads = event.downloads.filter(
        (ed) => ed.download.status !== ContentStatus.APPROVED,
      );
      if (pendingDownloads.length > 0) {
        const titles = pendingDownloads
          .map((ed) => ed.download.title)
          .join(", ");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Folgende Downloads müssen zuerst freigegeben werden: ${titles}`,
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
      const userId = ctx.session.user.id;
      const canDeleteAny = await userHasPermission(
        userId,
        PERMISSIONS.EVENTS_DELETE,
      );

      const events = await ctx.db.event.findMany({
        where: { id: { in: input.ids } },
        select: { id: true, createdById: true },
      });

      const canDeleteIds = events
        .filter((event) => event.createdById === userId || canDeleteAny)
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
      const userId = ctx.session.user.id;
      const canEditAny = await userHasPermission(
        userId,
        PERMISSIONS.EVENTS_EDIT,
      );

      const events = await ctx.db.event.findMany({
        where: { id: { in: input.ids } },
        select: { id: true, createdById: true },
      });

      const canUpdateIds = events
        .filter((event) => event.createdById === userId || canEditAny)
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
          downloads: {
            include: {
              download: {
                select: { id: true },
              },
            },
          },
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
          downloads:
            original.downloads.length > 0
              ? {
                  create: original.downloads.map((ed) => ({
                    downloadId: ed.download.id,
                  })),
                }
              : undefined,
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
          downloads: {
            include: {
              download: {
                select: { id: true },
              },
            },
          },
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
              downloads:
                original.downloads.length > 0
                  ? {
                      create: original.downloads.map((ed) => ({
                        downloadId: ed.download.id,
                      })),
                    }
                  : undefined,
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
      const userId = ctx.session.user.id;
      const canApprove = await userHasPermission(
        userId,
        PERMISSIONS.EVENTS_APPROVE,
      );

      const events = await ctx.db.event.findMany({
        where: { id: { in: input.ids } },
        select: { id: true, createdById: true },
      });

      const canUpdateIds = events
        .filter((event) => event.createdById === userId || canApprove)
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

  getEventsByMonth: protectedProcedure
    .input(
      z.object({
        year: z.number().min(2000).max(2100),
        month: z.number().min(1).max(12),
      }),
    )
    .query(async ({ ctx, input }) => {
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59, 999);

      const events = await ctx.db.event.findMany({
        where: {
          status: ContentStatus.APPROVED,
          eventDate: {
            gte: startDate,
            lte: endDate,
          },
        },
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
        },
        orderBy: { eventDate: "asc" },
      });

      return events;
    }),

  exportEvents: adminProcedure.query(async ({ ctx }) => {
    const events = await ctx.db.event.findMany({
      include: {
        coverImage: true,
        location: true,
        bezirk: true,
        ensemble: {
          include: {
            conductor: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
            image: true,
          },
        },
        auswahlChor: {
          include: {
            conductor: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
            image: true,
          },
        },
      },
      orderBy: { eventDate: "desc" },
    });

    return {
      events: events.map((event) => ({
        ...event,
        coverImageUrl: event.coverImage?.url,
        locationName: event.location?.name,
        bezirkName: event.bezirk?.name,
        ensembleName: event.ensemble?.name,
        auswahlChorName: event.auswahlChor?.name,
      })),
      exportedAt: new Date().toISOString(),
      count: events.length,
    };
  }),

  importEvents: adminProcedure
    .input(
      z.object({
        events: z.array(
          z.object({
            title: z.string(),
            motto: z.string().optional().nullable(),
            description: z.string().optional().nullable(),
            eventDate: z.date(),
            cancelled: z.boolean().optional(),
            category: z.enum(EventCategory),
            bezirkId: z.string().optional().nullable(),
            locationId: z.string().optional().nullable(),
            ensembleId: z.string().optional().nullable(),
            auswahlChorId: z.string().optional().nullable(),
            ensembleType: z.enum(EventEnsembleType).optional().nullable(),
            coverImageId: z.string().optional().nullable(),
            status: z.enum(ContentStatus).optional(),
            originalId: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.events.map(async (eventData) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { originalId, ...data } = eventData;
          return await ctx.db.event.create({
            data: {
              ...data,
              status: data.status ?? ContentStatus.DRAFT,
              cancelled: data.cancelled ?? false,
            },
          });
        }),
      );

      return {
        success: true,
        importedCount: results.length,
        events: results,
      };
    }),
});
