import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { userHasPermission } from "../helpers/permissions";
import { PERMISSIONS } from "@/lib/permissions";

export const homepageRouter = createTRPCRouter({
  /**
   * Get all active carousel items for public homepage display
   */
  getCarouselItems: publicProcedure.query(async ({ ctx }) => {
    const items = await ctx.db.homepageCarouselItem.findMany({
      where: {
        isActive: true,
      },
      include: {
        media: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
      take: 5, // Maximum 5 items
    });

    return items;
  }),

  /**
   * Get all carousel items for dashboard management
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const canManageHomepage = await userHasPermission(
      ctx.session.user.id,
      PERMISSIONS.HOMEPAGE_MANAGE,
    );

    if (!canManageHomepage) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only administrators can manage homepage carousel",
      });
    }

    const items = await ctx.db.homepageCarouselItem.findMany({
      include: {
        media: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    return items;
  }),

  /**
   * Create a new carousel item
   */
  create: protectedProcedure
    .input(
      z.object({
        mediaId: z.string(),
        title: z.string().max(200).optional(),
        subtitle: z.string().max(500).optional(),
        isActive: z.boolean().default(true),
        sortOrder: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const canManageHomepage = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.HOMEPAGE_MANAGE,
      );

      if (!canManageHomepage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can manage homepage carousel",
        });
      }

      // Check if media exists
      const media = await ctx.db.media.findUnique({
        where: { id: input.mediaId },
      });

      if (!media) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Media not found",
        });
      }

      // Check if we already have 5 items
      const count = await ctx.db.homepageCarouselItem.count();
      if (count >= 5) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Maximum of 5 carousel items allowed",
        });
      }

      const item = await ctx.db.homepageCarouselItem.create({
        data: {
          mediaId: input.mediaId,
          title: input.title,
          subtitle: input.subtitle,
          isActive: input.isActive,
          sortOrder: input.sortOrder,
        },
        include: {
          media: true,
        },
      });

      return item;
    }),

  /**
   * Update a carousel item
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        mediaId: z.string().optional(),
        title: z.string().max(200).optional().nullable(),
        subtitle: z.string().max(500).optional().nullable(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const canManageHomepage = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.HOMEPAGE_MANAGE,
      );

      if (!canManageHomepage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can manage homepage carousel",
        });
      }

      const existingItem = await ctx.db.homepageCarouselItem.findUnique({
        where: { id: input.id },
      });

      if (!existingItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Carousel item not found",
        });
      }

      // If mediaId is being updated, verify it exists
      if (input.mediaId) {
        const media = await ctx.db.media.findUnique({
          where: { id: input.mediaId },
        });

        if (!media) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Media not found",
          });
        }
      }

      const updateData: {
        mediaId?: string;
        title?: string | null;
        subtitle?: string | null;
        isActive?: boolean;
        sortOrder?: number;
      } = {};

      if (input.mediaId !== undefined) {
        updateData.mediaId = input.mediaId;
      }
      if (input.title !== undefined) {
        updateData.title = input.title;
      }
      if (input.subtitle !== undefined) {
        updateData.subtitle = input.subtitle;
      }
      if (input.isActive !== undefined) {
        updateData.isActive = input.isActive;
      }
      if (input.sortOrder !== undefined) {
        updateData.sortOrder = input.sortOrder;
      }

      const item = await ctx.db.homepageCarouselItem.update({
        where: { id: input.id },
        data: updateData,
        include: {
          media: true,
        },
      });

      return item;
    }),

  /**
   * Delete a carousel item
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const canManageHomepage = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.HOMEPAGE_MANAGE,
      );

      if (!canManageHomepage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can manage homepage carousel",
        });
      }

      const item = await ctx.db.homepageCarouselItem.findUnique({
        where: { id: input.id },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Carousel item not found",
        });
      }

      await ctx.db.homepageCarouselItem.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Reorder carousel items
   */
  reorder: protectedProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            sortOrder: z.number().int(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const canManageHomepage = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.HOMEPAGE_MANAGE,
      );

      if (!canManageHomepage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can manage homepage carousel",
        });
      }

      // Update all items in a transaction
      await Promise.all(
        input.items.map((item) =>
          ctx.db.homepageCarouselItem.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
          }),
        ),
      );

      return { success: true };
    }),
});
