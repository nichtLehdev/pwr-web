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
  UserRole,
  ContentStatus,
  type Prisma,
} from "~/generated/prisma/client";

export const mediaRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const media = await ctx.db.media.findUnique({
        where: { id: input.id },
        include: {
          uploadedBy: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      });

      if (!media) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Media not found",
        });
      }

      if (!media.isPublic && !ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Media is private",
        });
      }

      return media;
    }),

  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        mimeType: z.string().optional(),
        folder: z.string().optional(),
        search: z.string().optional(),
        uploadedById: z.string().optional(),
        includeAll: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userRole = ctx.session.user.role as UserRole;
      const userId = ctx.session.user.id;
      const isReviewer =
        userRole === UserRole.RPW ||
        userRole === UserRole.LPW ||
        userRole === UserRole.ADMIN;

      const where: Prisma.MediaWhereInput = {
        ...(input.mimeType && { mimeType: { contains: input.mimeType } }),
        ...(input.folder && { folder: input.folder }),
        ...(input.uploadedById && { uploadedById: input.uploadedById }),
      };

      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { alt: { contains: input.search, mode: "insensitive" } },
          { caption: { contains: input.search, mode: "insensitive" } },
          { title: { contains: input.search, mode: "insensitive" } },
        ];
      }

      if (input.includeAll) {
        if (isReviewer) {
        } else if (userRole === UserRole.OBLEUTE) {
          where.AND = [
            {
              OR: [
                { status: ContentStatus.APPROVED },
                { status: ContentStatus.PENDING, uploadedById: userId },
              ],
            },
          ];
        } else {
          where.status = ContentStatus.APPROVED;
        }
      } else {
        where.AND = [
          {
            OR: [{ status: ContentStatus.APPROVED }, { uploadedById: userId }],
          },
        ];
      }

      const [media, total] = await Promise.all([
        ctx.db.media.findMany({
          where,
          include: {
            uploadedBy: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.media.count({ where }),
      ]);

      return {
        media,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  getMine: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = { uploadedById: ctx.session.user.id };

      const [media, total] = await Promise.all([
        ctx.db.media.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.media.count({ where }),
      ]);

      return {
        media,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().max(255),
        filename: z.string().max(255),
        url: z.string().max(500),
        path: z.string().max(500),
        mimeType: z.string().max(100),
        size: z.number().min(0).max(100000000),
        extension: z.string().max(10),
        width: z.number().min(0).max(50000).optional(),
        height: z.number().min(0).max(50000).optional(),
        alt: z.string().max(500).optional(),
        caption: z.string().max(1000).optional(),
        title: z.string().max(200).optional(),
        folder: z.string().optional(),
        tags: z.string().optional(),
        isPublic: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userRole = ctx.session.user.role as UserRole;

      const isReviewer =
        userRole === UserRole.RPW ||
        userRole === UserRole.LPW ||
        userRole === UserRole.ADMIN;

      const media = await ctx.db.media.create({
        data: {
          ...input,
          uploadedById: ctx.session.user.id,
          status: isReviewer ? ContentStatus.APPROVED : ContentStatus.PENDING,
        },
      });

      return media;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        alt: z.string().max(500).optional(),
        caption: z.string().max(1000).optional(),
        title: z.string().max(200).optional(),
        folder: z.string().optional(),
        tags: z.string().optional(),
        isPublic: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const media = await ctx.db.media.findUnique({
        where: { id },
        select: { uploadedById: true },
      });

      if (!media) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Media not found",
        });
      }

      const canEdit =
        media.uploadedById === ctx.session.user.id ||
        ctx.session.user.role === UserRole.ADMIN ||
        ctx.session.user.role === UserRole.LPW;

      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      return await ctx.db.media.update({
        where: { id },
        data: updateData,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const media = await ctx.db.media.findUnique({
        where: { id: input.id },
        select: { uploadedById: true },
      });

      if (!media) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Media not found",
        });
      }

      const canDelete =
        media.uploadedById === ctx.session.user.id ||
        ctx.session.user.role === UserRole.ADMIN ||
        ctx.session.user.role === UserRole.LPW;

      if (!canDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      await ctx.db.media.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  review: reviewerProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum([ContentStatus.APPROVED, ContentStatus.REJECTED]),
        reviewNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const media = await ctx.db.media.findUnique({
        where: { id: input.id },
      });

      if (!media) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Media not found",
        });
      }

      return await ctx.db.media.update({
        where: { id: input.id },
        data: {
          status: input.status,
          reviewNotes: input.reviewNotes,
        },
      });
    }),

  getByFolder: protectedProcedure
    .input(
      z.object({
        folder: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = { folder: input.folder };

      const [media, total] = await Promise.all([
        ctx.db.media.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.media.count({ where }),
      ]);

      return {
        media,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  getFolders: protectedProcedure.query(async ({ ctx }) => {
    const folders = await ctx.db.media.findMany({
      where: {
        folder: { not: null },
      },
      select: {
        folder: true,
      },
      distinct: ["folder"],
      orderBy: { folder: "asc" },
    });

    return folders.map((f) => f.folder).filter((f): f is string => f !== null);
  }),

  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    const [
      totalMedia,
      totalSize,
      imageCount,
      documentCount,
      videoCount,
      userUploads,
    ] = await Promise.all([
      ctx.db.media.count(),
      ctx.db.media.aggregate({
        _sum: { size: true },
      }),
      ctx.db.media.count({
        where: { mimeType: { startsWith: "image/" } },
      }),
      ctx.db.media.count({
        where: {
          OR: [
            { mimeType: { startsWith: "application/" } },
            { mimeType: { startsWith: "text/" } },
          ],
        },
      }),
      ctx.db.media.count({
        where: { mimeType: { startsWith: "video/" } },
      }),
      ctx.db.media.count({
        where: { uploadedById: ctx.session.user.id },
      }),
    ]);

    return {
      totalMedia,
      totalSize: totalSize._sum.size ?? 0,
      imageCount,
      documentCount,
      videoCount,
      userUploads,
    };
  }),

  exportMedia: adminProcedure.query(async ({ ctx }) => {
    const media = await ctx.db.media.findMany({
      include: {
        uploadedBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      media: media.map((item) => ({
        ...item,
        uploadedByEmail: item.uploadedBy?.email,
      })),
      exportedAt: new Date().toISOString(),
      count: media.length,
    };
  }),

  importMedia: adminProcedure
    .input(
      z.object({
        media: z.array(
          z.object({
            name: z.string(),
            filename: z.string(),
            url: z.string(),
            path: z.string(),
            mimeType: z.string(),
            size: z.number(),
            extension: z.string(),
            width: z.number().optional().nullable(),
            height: z.number().optional().nullable(),
            alt: z.string().optional().nullable(),
            caption: z.string().optional().nullable(),
            title: z.string().optional().nullable(),
            folder: z.string().optional().nullable(),
            tags: z.any().optional(),
            isPublic: z.boolean().optional(),
            status: z.enum(ContentStatus).optional(),
            originalId: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.media.map(async (mediaData) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { originalId, ...data } = mediaData;
          return await ctx.db.media.create({
            data: {
              ...data,
              status: data.status ?? ContentStatus.APPROVED,
              isPublic: data.isPublic ?? true,
              uploadedById: ctx.session.user.id,
            },
          });
        }),
      );

      return {
        success: true,
        importedCount: results.length,
        media: results,
      };
    }),
});
