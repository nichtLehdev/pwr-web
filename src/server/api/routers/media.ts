import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { UserRole } from "~/generated/prisma/client";

export const mediaRouter = createTRPCRouter({
  // Public: Get media by ID
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

      // Check if media is public or user has access
      if (!media.isPublic && !ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Media is private",
        });
      }

      return media;
    }),

  // Get all media with filters
  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        mimeType: z.string().optional(),
        folder: z.string().optional(),
        search: z.string().optional(),
        uploadedById: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.mimeType && { mimeType: { contains: input.mimeType } }),
        ...(input.folder && { folder: input.folder }),
        ...(input.uploadedById && { uploadedById: input.uploadedById }),
        ...(input.search && {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            { alt: { contains: input.search, mode: "insensitive" as const } },
            {
              caption: { contains: input.search, mode: "insensitive" as const },
            },
            { title: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

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

  // Get media uploaded by current user
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

  // Create media record (after file upload)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        filename: z.string(),
        url: z.string(),
        path: z.string(),
        mimeType: z.string(),
        size: z.number(),
        extension: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
        alt: z.string().optional(),
        caption: z.string().optional(),
        title: z.string().optional(),
        folder: z.string().optional(),
        tags: z.string().optional(),
        isPublic: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const media = await ctx.db.media.create({
        data: {
          ...input,
          uploadedById: ctx.session.user.id,
        },
      });

      return media;
    }),

  // Update media metadata
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        alt: z.string().optional(),
        caption: z.string().optional(),
        title: z.string().optional(),
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

      // Check permissions
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

  // Delete media
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

      // Check permissions
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

      // TODO: Also delete the actual file from storage

      await ctx.db.media.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Get media by folder
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

  // Get all folders
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

  // Get media statistics
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
});
