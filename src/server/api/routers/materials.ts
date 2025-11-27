import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  lpwProcedure,
  publicProcedure,
  reviewerProcedure,
} from "../trpc";
import { DownloadCategory, FileType } from "~/generated/prisma/client";

export const materialsRouter = createTRPCRouter({
  // ============================================================================
  // DOWNLOADS
  // ============================================================================

  // Public: Get all public downloads
  getDownloads: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        category: z.nativeEnum(DownloadCategory).optional(),
        fileType: z.nativeEnum(FileType).optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        isPublic: true,
        ...(input.category && { category: input.category }),
        ...(input.fileType && { fileType: input.fileType }),
        ...(input.search && {
          OR: [
            { title: { contains: input.search, mode: "insensitive" as const } },
            {
              description: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }),
      };

      const [downloads, total] = await Promise.all([
        ctx.db.download.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
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

  // Get single download by ID
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

  // Get downloads by category
  getDownloadsByCategory: publicProcedure
    .input(z.object({ category: z.nativeEnum(DownloadCategory) }))
    .query(async ({ ctx, input }) => {
      const downloads = await ctx.db.download.findMany({
        where: {
          category: input.category,
          isPublic: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return downloads;
    }),

  // Create download
  createDownload: reviewerProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.enum(DownloadCategory),
        fileUrl: z.string().url(),
        fileType: z.enum(FileType),
        fileSize: z.int(),
        tags: z.string().optional(),
        isPublic: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.download.create({
        data: input,
      });
    }),

  // Update download
  updateDownload: reviewerProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.enum(DownloadCategory).optional(),
        fileUrl: z.string().url().optional(),
        fileType: z.enum(FileType).optional(),
        fileSize: z.int().optional(),
        tags: z.string().optional(),
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

  // Delete download
  deleteDownload: lpwProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.download.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // ============================================================================
  // BLÄSERHEFTE
  // ============================================================================

  // Public: Get all Bläserhefte
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

  // Get single Bläserheft by ID
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

  // Get Bläserhefte by year
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

  // Create Bläserheft
  createBlaserheft: lpwProcedure
    .input(
      z.object({
        title: z.string().min(1),
        subtitle: z.string().min(1),
        year: z.number(),
        description: z.string().min(1),
        chapters: z.string().optional(),
        highlights: z.string().optional(),
        imageId: z.string(),
        audioSample: z.url().optional(),
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

  // Update Bläserheft
  updateBlaserheft: lpwProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        subtitle: z.string().optional(),
        year: z.number().optional(),
        description: z.string().optional(),
        chapters: z.string().optional(),
        highlights: z.string().optional(),
        imageId: z.string().optional(),
        audioSample: z.url().optional().nullable(),
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

  // Delete Bläserheft
  deleteBlaserheft: lpwProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.blaeserheft.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
