import { z } from "zod";
import { join } from "path";
import { unlink } from "fs/promises";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../trpc";
import { ContentStatus, type Prisma } from "~/generated/prisma/client";
import { userHasPermission } from "../helpers/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { permissionProcedure } from "../middleware/permissions";

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
      const userId = ctx.session.user.id;
      const canApproveMedia = await userHasPermission(
        userId,
        PERMISSIONS.MEDIA_APPROVE,
      );
      const canUploadMedia = await userHasPermission(
        userId,
        PERMISSIONS.MEDIA_UPLOAD,
      );

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
          { copyright: { contains: input.search, mode: "insensitive" } },
          { creator: { contains: input.search, mode: "insensitive" } },
        ];
      }

      if (input.includeAll) {
        if (canApproveMedia) {
          // Can see all media
        } else if (canUploadMedia) {
          // Can see approved + own pending
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
        copyright: z.string().max(500).optional(),
        creator: z.string().max(255).optional(),
        folder: z.string().optional(),
        tags: z.string().optional(),
        isPublic: z.boolean().default(true),
        focalPointX: z.number().min(0).max(100).optional().nullable(),
        focalPointY: z.number().min(0).max(100).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const canApproveMedia = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.MEDIA_APPROVE,
      );

      const media = await ctx.db.media.create({
        data: {
          ...input,
          uploadedById: ctx.session.user.id,
          status: canApproveMedia
            ? ContentStatus.APPROVED
            : ContentStatus.PENDING,
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
        copyright: z.string().max(500).optional(),
        creator: z.string().max(255).optional(),
        folder: z.string().optional(),
        tags: z.string().optional(),
        isPublic: z.boolean().optional(),
        focalPointX: z.number().min(0).max(100).optional().nullable(),
        focalPointY: z.number().min(0).max(100).optional().nullable(),
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

      const canEditMedia =
        (await userHasPermission(
          ctx.session.user.id,
          PERMISSIONS.MEDIA_EDIT,
        )) ||
        (await userHasPermission(
          ctx.session.user.id,
          PERMISSIONS.MEDIA_APPROVE,
        ));
      const canEdit =
        media.uploadedById === ctx.session.user.id || canEditMedia;

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

  replaceFile: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        url: z.string().max(500),
        path: z.string().max(500),
        filename: z.string().max(255),
        size: z.number().min(0).max(100000000),
        mimeType: z.string().max(100),
        extension: z.string().max(10),
        width: z.number().min(0).max(50000).optional(),
        height: z.number().min(0).max(50000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const media = await ctx.db.media.findUnique({
        where: { id: input.id },
        select: { path: true, filename: true, uploadedById: true },
      });

      if (!media) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Media not found",
        });
      }

      const canEditMedia =
        (await userHasPermission(
          ctx.session.user.id,
          PERMISSIONS.MEDIA_EDIT,
        )) ||
        (await userHasPermission(
          ctx.session.user.id,
          PERMISSIONS.MEDIA_APPROVE,
        ));
      const canEdit =
        media.uploadedById === ctx.session.user.id || canEditMedia;

      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      if (media.path.startsWith("/api/uploads/")) {
        const relativePath = media.path.replace("/api/uploads/", "");
        const fullPath = join(process.cwd(), "public", "uploads", relativePath);
        try {
          await unlink(fullPath);
        } catch (err) {
          console.warn("Could not delete old media file:", fullPath, err);
        }
      }

      return await ctx.db.media.update({
        where: { id: input.id },
        data: {
          url: input.url,
          path: input.path,
          filename: input.filename,
          size: input.size,
          mimeType: input.mimeType,
          extension: input.extension,
          width: input.width ?? null,
          height: input.height ?? null,
          focalPointX: null,
          focalPointY: null,
        },
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

      const canDeleteMedia = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.MEDIA_DELETE,
      );
      const canDelete =
        media.uploadedById === ctx.session.user.id || canDeleteMedia;

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

  review: permissionProcedure(PERMISSIONS.MEDIA_APPROVE)
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

  exportMedia: permissionProcedure(PERMISSIONS.DATA_EXPORT).query(
    async ({ ctx }) => {
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
    },
  ),

  importMedia: permissionProcedure(PERMISSIONS.DATA_IMPORT)
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
            copyright: z.string().optional().nullable(),
            creator: z.string().optional().nullable(),
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
