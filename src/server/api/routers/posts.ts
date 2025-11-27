import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  reviewerProcedure,
} from "../trpc";
import {
  PostCategory,
  ContentStatus,
  UserRole,
} from "~/generated/prisma/client";

export const postsRouter = createTRPCRouter({
  // Public: Get all approved posts
  getAll: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        category: z.enum(PostCategory).optional(),
        bezirkId: z.string().optional(),
        pinned: z.boolean().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        status: ContentStatus.APPROVED,
        ...(input.category && { category: input.category }),
        ...(input.bezirkId && { bezirkId: input.bezirkId }),
        ...(input.pinned !== undefined && { pinned: input.pinned }),
        ...(input.search && {
          OR: [
            { title: { contains: input.search, mode: "insensitive" as const } },
            {
              excerpt: { contains: input.search, mode: "insensitive" as const },
            },
            {
              content: { contains: input.search, mode: "insensitive" as const },
            },
          ],
        }),
      };

      const [posts, total] = await Promise.all([
        ctx.db.post.findMany({
          where,
          include: {
            coverImage: true,
            bezirk: true,
            createdBy: {
              select: {
                id: true,
                displayName: true,
                profileImage: true,
              },
            },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
        }),
        ctx.db.post.count({ where }),
      ]);

      return {
        posts,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  // Get single post by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.id },
        include: {
          coverImage: true,
          bezirk: true,
          createdBy: {
            select: {
              id: true,
              displayName: true,
              profileImage: true,
              bio: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      // Only show non-approved posts to authorized users
      if (post.status !== ContentStatus.APPROVED) {
        if (!ctx.session?.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Post not published",
          });
        }

        const canView =
          post.createdById === ctx.session.user.id ||
          ctx.session.user.role === UserRole.ADMIN ||
          ctx.session.user.role === UserRole.LPW ||
          ctx.session.user.role === UserRole.RPW ||
          (ctx.session.user.role === UserRole.OBLEUTE &&
            post.bezirkId === ctx.session.user.obleuteBezirkId);

        if (!canView) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Post not published",
          });
        }
      }

      return post;
    }),

  // Get posts created by current user
  getMine: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.enum(ContentStatus).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        createdById: ctx.session.user.id,
        ...(input.status && { status: input.status }),
      };

      const [posts, total] = await Promise.all([
        ctx.db.post.findMany({
          where,
          include: {
            coverImage: true,
            bezirk: true,
            reviewer: { select: { id: true, displayName: true } },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.post.count({ where }),
      ]);

      return {
        posts,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  // Get posts pending review
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

      if (
        ctx.session.user.role === UserRole.RPW &&
        ctx.session.user.obleuteBezirkId
      ) {
        where.bezirkId = ctx.session.user.obleuteBezirkId;
      }

      const [posts, total] = await Promise.all([
        ctx.db.post.findMany({
          where,
          include: {
            coverImage: true,
            bezirk: true,
            createdBy: { select: { id: true, displayName: true, email: true } },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "asc" },
        }),
        ctx.db.post.count({ where }),
      ]);

      return {
        posts,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  // Create post
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        excerpt: z.string().optional(),
        content: z.string().min(1),
        coverImageId: z.string().optional(),
        category: z.enum(PostCategory),
        bezirkId: z.string().optional(),
        pinned: z.boolean().default(false),
        status: z.enum(ContentStatus).default(ContentStatus.PENDING),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Only admins and LPW can pin posts
      if (
        input.pinned &&
        ctx.session.user.role !== UserRole.ADMIN &&
        ctx.session.user.role !== UserRole.LPW
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to pin posts",
        });
      }

      const post = await ctx.db.post.create({
        data: {
          ...input,
          createdById: ctx.session.user.id,
        },
        include: {
          coverImage: true,
          bezirk: true,
        },
      });

      return post;
    }),

  // Update post
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        excerpt: z.string().optional(),
        content: z.string().optional(),
        coverImageId: z.string().optional().nullable(),
        category: z.enum(PostCategory).optional(),
        bezirkId: z.string().optional().nullable(),
        pinned: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const post = await ctx.db.post.findUnique({
        where: { id },
        select: { createdById: true },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      const canEdit =
        post.createdById === ctx.session.user.id ||
        ctx.session.user.role === UserRole.ADMIN ||
        ctx.session.user.role === UserRole.LPW ||
        ctx.session.user.role === UserRole.RPW;

      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      // Only admins and LPW can pin/unpin posts
      if (
        updateData.pinned !== undefined &&
        ctx.session.user.role !== UserRole.ADMIN &&
        ctx.session.user.role !== UserRole.LPW
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to pin posts",
        });
      }

      return await ctx.db.post.update({
        where: { id },
        data: updateData,
        include: {
          coverImage: true,
          bezirk: true,
        },
      });
    }),

  // Delete post
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.id },
        select: { createdById: true },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      const canDelete =
        post.createdById === ctx.session.user.id ||
        ctx.session.user.role === UserRole.ADMIN ||
        ctx.session.user.role === UserRole.LPW ||
        ctx.session.user.role === UserRole.RPW;

      if (!canDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      await ctx.db.post.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Approve post
  approve: reviewerProcedure
    .input(
      z.object({
        id: z.string(),
        reviewNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.id },
        select: { bezirkId: true },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      return await ctx.db.post.update({
        where: { id: input.id },
        data: {
          status: ContentStatus.APPROVED,
          reviewerId: ctx.session.user.id,
          reviewDate: new Date(),
          reviewNotes: input.reviewNotes,
          publishedAt: new Date(),
        },
      });
    }),

  // Reject post
  reject: reviewerProcedure
    .input(
      z.object({
        id: z.string(),
        reviewNotes: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.post.update({
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
