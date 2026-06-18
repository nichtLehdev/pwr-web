import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../trpc";
import {
  DownloadCategory,
  FileType,
  ContentStatus,
  type Prisma,
} from "~/generated/prisma/client";
import { userHasPermission } from "../helpers/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { permissionProcedure } from "../middleware/permissions";

export const materialsRouter = createTRPCRouter({
  getDownloads: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        category: z.nativeEnum(DownloadCategory).optional(),
        fileType: z.nativeEnum(FileType).optional(),
        search: z.string().optional(),
        includeAll: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      const canApproveDownloads = userId
        ? await userHasPermission(userId, PERMISSIONS.DOWNLOADS_APPROVE)
        : false;

      const where: Prisma.DownloadWhereInput = {
        isPublic: true,
        ...(input.category && { category: input.category }),
        ...(input.fileType && { fileType: input.fileType }),
      };

      if (input.search) {
        where.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
        ];
      }

      if (input.includeAll && ctx.session?.user && userId) {
        if (canApproveDownloads) {
          // Can see all downloads
        } else {
          const canUploadDownloads = await userHasPermission(
            userId,
            PERMISSIONS.DOWNLOADS_UPLOAD,
          );
          if (canUploadDownloads) {
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
        }
      } else {
        where.status = ContentStatus.APPROVED;
      }

      const [downloads, total] = await Promise.all([
        ctx.db.download.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          include: {
            uploadedBy: {
              select: {
                id: true,
                displayName: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        ctx.db.download.count({ where }),
      ]);

      return {
        downloads: downloads.map((download) => ({
          ...download,
          tags: (download.tags as string[]) || [],
        })),
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  getDownloadById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const download = await ctx.db.download.findUnique({
        where: { id: input.id },
      });

      if (!download) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Download not found",
        });
      }

      if (!download.isPublic && !ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Download is private",
        });
      }

      return download;
    }),

  getDownloadsByCategory: publicProcedure
    .input(z.object({ category: z.nativeEnum(DownloadCategory) }))
    .query(async ({ ctx, input }) => {
      const downloads = await ctx.db.download.findMany({
        where: {
          category: input.category,
          isPublic: true,
          status: ContentStatus.APPROVED,
        },
        orderBy: { createdAt: "desc" },
      });

      return downloads.map((download) => ({
        ...download,
        tags: (download.tags as string[]) || [],
      }));
    }),

  getBlechblattEditions: publicProcedure.query(async ({ ctx }) => {
    const downloads = await ctx.db.download.findMany({
      where: {
        category: DownloadCategory.BLECHBLATT,
        isPublic: true,
        status: ContentStatus.APPROVED,
      },
      orderBy: { title: "desc" },
    });

    return downloads.map((download) => ({
      ...download,
      tags: (download.tags as string[]) || [],
    }));
  }),

  createDownload: permissionProcedure(PERMISSIONS.DOWNLOADS_UPLOAD)
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        category: z.enum(DownloadCategory),
        fileUrl: z.string().min(1).max(500),
        fileType: z.enum(FileType),
        fileSize: z.int().min(0).max(100000000),
        tags: z.array(z.string()).optional(),
        isPublic: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const canApproveDownloads = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.DOWNLOADS_APPROVE,
      );

      return await ctx.db.download.create({
        data: {
          ...input,
          status: canApproveDownloads
            ? ContentStatus.APPROVED
            : ContentStatus.PENDING,
          uploadedById: ctx.session.user.id,
        },
      });
    }),

  updateDownload: permissionProcedure(PERMISSIONS.DOWNLOADS_EDIT)
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
        category: z.enum(DownloadCategory).optional(),
        fileUrl: z.string().min(1).max(500).optional(),
        fileType: z.enum(FileType).optional(),
        fileSize: z.int().min(0).max(100000000).optional(),
        tags: z.array(z.string()).optional(),
        isPublic: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      return await ctx.db.download.update({
        where: { id },
        data: updateData,
      });
    }),

  deleteDownload: permissionProcedure(PERMISSIONS.DOWNLOADS_DELETE)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.download.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  reviewDownload: permissionProcedure(PERMISSIONS.DOWNLOADS_APPROVE)
    .input(
      z.object({
        id: z.string(),
        status: z.enum([ContentStatus.APPROVED, ContentStatus.REJECTED]),
        reviewNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const download = await ctx.db.download.findUnique({
        where: { id: input.id },
      });

      if (!download) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Download not found",
        });
      }

      return await ctx.db.download.update({
        where: { id: input.id },
        data: {
          status: input.status,
          reviewNotes: input.reviewNotes,
        },
      });
    }),

  getBlaserhefte: publicProcedure.query(async ({ ctx }) => {
    const blaserhefte = await ctx.db.blaeserheft.findMany({
      include: {
        image: true,
      },
      orderBy: [{ year: "desc" }, { sortOrder: "asc" }],
    });

    return blaserhefte.map((heft) => ({
      ...heft,
      image: heft.image || null,
      highlights: heft.highlights ? (heft.highlights as string[]) : [],
      chapters: heft.chapters ? (heft.chapters as string[]) : [],
    }));
  }),

  getBlaserheftById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const blaserheft = await ctx.db.blaeserheft.findUnique({
        where: { id: input.id },
        include: {
          image: true,
        },
      });

      if (!blaserheft) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bläserheft not found",
        });
      }

      return blaserheft;
    }),

  getBlaserhefteByYear: publicProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ ctx, input }) => {
      const blaserhefte = await ctx.db.blaeserheft.findMany({
        where: { year: input.year },
        include: {
          image: true,
        },
        orderBy: { sortOrder: "asc" },
      });

      return blaserhefte;
    }),

  createBlaserheft: permissionProcedure(PERMISSIONS.DOWNLOADS_MANAGE_BLAESERHEFTE)
    .input(
      z.object({
        title: z.string().min(1).max(200),
        subtitle: z.string().min(1).max(200),
        year: z.number().min(1900).max(2100),
        description: z.string().min(1).max(5000),
        chapters: z.string().optional(),
        highlights: z.string().optional(),
        imageId: z.string(),
        audioSample: z.string().optional(),
        priceBlaeserheft: z.number().optional(),
        priceBeiheft: z.number().optional(),
        priceTrompeten: z.number().optional(),
        priceCd: z.number().optional(),
        availableBlaeserheft: z.boolean().default(true),
        availableBeiheft: z.boolean().default(true),
        availableTrompeten: z.boolean().default(false),
        availableCd: z.boolean().default(true),
        sortOrder: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.blaeserheft.create({
        data: input,
        include: {
          image: true,
        },
      });
    }),

  updateBlaserheft: permissionProcedure(PERMISSIONS.DOWNLOADS_MANAGE_BLAESERHEFTE)
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        subtitle: z.string().max(200).optional(),
        year: z.number().min(1900).max(2100).optional(),
        description: z.string().max(5000).optional(),
        chapters: z.string().optional(),
        highlights: z.string().optional(),
        imageId: z.string().optional(),
        audioSample: z.string().optional().nullable(),
        priceBlaeserheft: z.number().optional(),
        priceBeiheft: z.number().optional(),
        priceTrompeten: z.number().optional(),
        priceCd: z.number().optional(),
        availableBlaeserheft: z.boolean().optional(),
        availableBeiheft: z.boolean().optional(),
        availableTrompeten: z.boolean().optional(),
        availableCd: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      return await ctx.db.blaeserheft.update({
        where: { id },
        data: updateData,
        include: {
          image: true,
        },
      });
    }),

  deleteBlaserheft: permissionProcedure(PERMISSIONS.DOWNLOADS_MANAGE_BLAESERHEFTE)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.blaeserheft.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  exportDownloads: permissionProcedure(PERMISSIONS.DATA_EXPORT).query(
    async ({ ctx }) => {
      const downloads = await ctx.db.download.findMany({
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
        downloads: downloads.map((download) => ({
          ...download,
          tags: (download.tags as string[]) || [],
          uploadedByEmail: download.uploadedBy?.email,
        })),
        exportedAt: new Date().toISOString(),
        count: downloads.length,
      };
    },
  ),

  importDownloads: permissionProcedure(PERMISSIONS.DATA_IMPORT)
    .input(
      z.object({
        downloads: z.array(
          z.object({
            title: z.string(),
            description: z.string().optional().nullable(),
            category: z.enum(DownloadCategory),
            fileUrl: z.string(),
            fileType: z.enum(FileType),
            fileSize: z.number().optional().nullable(),
            tags: z.array(z.string()).optional(),
            isPublic: z.boolean().optional(),
            status: z.enum(ContentStatus).optional(),
            originalId: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.downloads.map(async (downloadData) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { originalId, ...data } = downloadData;
          return await ctx.db.download.create({
            data: {
              ...data,
              status: data.status ?? ContentStatus.DRAFT,
              isPublic: data.isPublic ?? true,
              uploadedById: ctx.session.user.id,
            },
          });
        }),
      );

      return {
        success: true,
        importedCount: results.length,
        downloads: results,
      };
    }),

  exportBlaeserhefte: permissionProcedure(PERMISSIONS.DATA_EXPORT).query(
    async ({ ctx }) => {
      const blaeserhefte = await ctx.db.blaeserheft.findMany({
        include: {
          image: true,
        },
        orderBy: [{ year: "desc" }, { sortOrder: "asc" }],
      });

      return {
        blaeserhefte: blaeserhefte.map((heft) => ({
          ...heft,
          imageUrl: heft.image?.url,
          highlights: heft.highlights ? (heft.highlights as string[]) : [],
          chapters: heft.chapters ? (heft.chapters as string[]) : [],
        })),
        exportedAt: new Date().toISOString(),
        count: blaeserhefte.length,
      };
    },
  ),

  importBlaeserhefte: permissionProcedure(PERMISSIONS.DATA_IMPORT)
    .input(
      z.object({
        blaeserhefte: z.array(
          z.object({
            title: z.string(),
            subtitle: z.string(),
            year: z.number(),
            description: z.string(),
            chapters: z.any().optional(),
            highlights: z.any().optional(),
            imageId: z.string(),
            audioSample: z.string().optional().nullable(),
            priceBlaeserheft: z.number().optional().nullable(),
            priceBeiheft: z.number().optional().nullable(),
            priceTrompeten: z.number().optional().nullable(),
            priceCd: z.number().optional().nullable(),
            availableBlaeserheft: z.boolean().optional(),
            availableBeiheft: z.boolean().optional(),
            availableTrompeten: z.boolean().optional(),
            availableCd: z.boolean().optional(),
            sortOrder: z.number().optional(),
            originalId: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.blaeserhefte.map(async (heftData) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { originalId, ...data } = heftData;
          return await ctx.db.blaeserheft.create({
            data: {
              ...data,
              availableBlaeserheft: data.availableBlaeserheft ?? true,
              availableBeiheft: data.availableBeiheft ?? true,
              availableTrompeten: data.availableTrompeten ?? false,
              availableCd: data.availableCd ?? true,
              sortOrder: data.sortOrder ?? 0,
            },
          });
        }),
      );

      return {
        success: true,
        importedCount: results.length,
        blaeserhefte: results,
      };
    }),
});
