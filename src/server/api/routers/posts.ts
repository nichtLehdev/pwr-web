import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { marked } from "marked";
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

marked.use({
  gfm: true,
  breaks: true,
});

/**
 * Converts markdown content to HTML.
 * The database stores markdown, but we return HTML to the client.
 */
async function markdownToHtml(markdown: string): Promise<string> {
  return await marked.parse(markdown);
}

/**
 * Adds contentHtml field to a post by converting markdown content to HTML.
 */
async function addContentHtml<T extends { content: string }>(
  post: T,
): Promise<T & { contentHtml: string }> {
  return {
    ...post,
    contentHtml: await markdownToHtml(post.content),
  };
}

/**
 * Adds contentHtml field to an array of posts.
 */
async function addContentHtmlToMany<T extends { content: string }>(
  posts: T[],
): Promise<(T & { contentHtml: string })[]> {
  return await Promise.all(posts.map(addContentHtml));
}

export const postsRouter = createTRPCRouter({
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

      const [rawPosts, total] = await Promise.all([
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

      const posts = await addContentHtmlToMany(rawPosts);

      return {
        posts,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rawPost = await ctx.db.post.findUnique({
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

      if (!rawPost) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      if (rawPost.status !== ContentStatus.APPROVED) {
        if (!ctx.session?.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Post not published",
          });
        }

        const canView =
          rawPost.createdById === ctx.session.user.id ||
          ctx.session.user.role === UserRole.ADMIN ||
          ctx.session.user.role === UserRole.LPW ||
          ctx.session.user.role === UserRole.RPW ||
          (ctx.session.user.role === UserRole.OBLEUTE &&
            rawPost.bezirkId === ctx.session.user.bezirkId);

        if (!canView) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Post not published",
          });
        }
      }

      const downloadUrlPattern =
        /\/(?:api\/)?uploads\/downloads\/[^\s"'<>)\]]+/g;
      const downloadUrls = [
        ...new Set(rawPost.content.match(downloadUrlPattern) ?? []),
      ];

      const attachedDownloads =
        downloadUrls.length > 0
          ? await ctx.db.download.findMany({
              where: {
                fileUrl: { in: downloadUrls },
                status: ContentStatus.APPROVED,
              },
              select: {
                id: true,
                title: true,
                description: true,
                fileUrl: true,
                fileType: true,
                fileSize: true,
                category: true,
              },
            })
          : [];

      const postWithHtml = await addContentHtml(rawPost);
      return {
        ...postWithHtml,
        attachedDownloads,
      };
    }),

  getAttachedContent: reviewerProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.postId },
        select: { content: true },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      const allUrlsPattern = /\/(?:api\/)?uploads\/downloads\/[^\s"'<>)\]]+/g;
      const downloadUrls = [
        ...new Set(post.content.match(allUrlsPattern) ?? []),
      ];

      const allMediaPattern =
        /\/(?:api\/)?uploads\/(?:media|profiles)\/[^\s"'<>)\]]+/g;
      const mediaUrls = [...new Set(post.content.match(allMediaPattern) ?? [])];

      const downloads =
        downloadUrls.length > 0
          ? await ctx.db.download.findMany({
              where: { fileUrl: { in: downloadUrls } },
              select: {
                id: true,
                title: true,
                fileUrl: true,
                fileType: true,
                status: true,
                uploadedBy: { select: { id: true, displayName: true } },
              },
            })
          : [];

      const media =
        mediaUrls.length > 0
          ? await ctx.db.media.findMany({
              where: { url: { in: mediaUrls } },
              select: {
                id: true,
                name: true,
                url: true,
                mimeType: true,
                status: true,
              },
            })
          : [];

      return { downloads, media };
    }),

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

      const [rawPosts, total] = await Promise.all([
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

      const posts = await addContentHtmlToMany(rawPosts);

      return {
        posts,
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

      const [rawPosts, total] = await Promise.all([
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

      const posts = await addContentHtmlToMany(rawPosts);

      return {
        posts,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

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

      if (
        input.status === ContentStatus.APPROVED &&
        ctx.session.user.role !== UserRole.ADMIN &&
        ctx.session.user.role !== UserRole.LPW &&
        ctx.session.user.role !== UserRole.RPW
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to approve posts",
        });
      }

      const post = await ctx.db.post.create({
        data: {
          ...input,
          createdById: ctx.session.user.id,
          publishedAt:
            input.status === ContentStatus.APPROVED ? new Date() : null,
        },
        include: {
          coverImage: true,
          bezirk: true,
        },
      });

      return post;
    }),

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
        status: z.enum(ContentStatus).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const post = await ctx.db.post.findUnique({
        where: { id },
        select: { createdById: true, status: true, coverImageId: true },
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

      if (
        updateData.status === ContentStatus.APPROVED &&
        ctx.session.user.role !== UserRole.ADMIN &&
        ctx.session.user.role !== UserRole.LPW &&
        ctx.session.user.role !== UserRole.RPW
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to approve posts",
        });
      }

      if (updateData.status === ContentStatus.APPROVED) {
        const coverImageId = updateData.coverImageId ?? post.coverImageId;
        if (coverImageId) {
          const coverImage = await ctx.db.media.findUnique({
            where: { id: coverImageId },
            select: { status: true },
          });
          if (coverImage && coverImage.status !== ContentStatus.APPROVED) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Das Titelbild muss zuerst freigegeben werden, bevor der Beitrag veröffentlicht werden kann.",
            });
          }
        }
      }

      const finalData: Record<string, unknown> = { ...updateData };
      if (
        updateData.status === ContentStatus.APPROVED &&
        post.status !== ContentStatus.APPROVED
      ) {
        finalData.publishedAt = new Date();
      } else if (updateData.status === ContentStatus.DRAFT) {
        finalData.publishedAt = null;
      }

      return await ctx.db.post.update({
        where: { id },
        data: finalData,
        include: {
          coverImage: true,
          bezirk: true,
        },
      });
    }),

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
        select: { bezirkId: true, coverImageId: true, content: true },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      if (post.coverImageId) {
        const coverImage = await ctx.db.media.findUnique({
          where: { id: post.coverImageId },
          select: { status: true },
        });
        if (coverImage && coverImage.status !== ContentStatus.APPROVED) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Das Titelbild muss zuerst freigegeben werden, bevor der Beitrag veröffentlicht werden kann.",
          });
        }
      }

      const downloadUrlPattern =
        /\/(?:api\/)?uploads\/downloads\/[^\s"'<>)\]]+/g;
      const downloadUrls = [
        ...new Set(post.content.match(downloadUrlPattern) ?? []),
      ];

      if (downloadUrls.length > 0) {
        const pendingDownloads = await ctx.db.download.findMany({
          where: {
            fileUrl: { in: downloadUrls },
            status: { not: ContentStatus.APPROVED },
          },
          select: { title: true },
        });

        if (pendingDownloads.length > 0) {
          const titles = pendingDownloads.map((d) => d.title).join(", ");
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Folgende Downloads müssen zuerst freigegeben werden: ${titles}`,
          });
        }
      }

      const mediaUrlPattern =
        /\/(?:api\/)?uploads\/(?:media|profiles)\/[^\s"'<>)\]]+/g;
      const mediaUrls = [...new Set(post.content.match(mediaUrlPattern) ?? [])];

      if (mediaUrls.length > 0) {
        const pendingMedia = await ctx.db.media.findMany({
          where: {
            url: { in: mediaUrls },
            status: { not: ContentStatus.APPROVED },
          },
          select: { name: true },
        });

        if (pendingMedia.length > 0) {
          const names = pendingMedia.map((m) => m.name).join(", ");
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Folgende Medien müssen zuerst freigegeben werden: ${names}`,
          });
        }
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

  getDashboardPosts: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.enum(ContentStatus).optional(),
        category: z.enum(PostCategory).optional(),
        sortBy: z
          .enum(["publishedAt", "title", "createdAt", "status"])
          .default("createdAt"),
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
        if (input.category) {
          where.category = input.category;
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
        if (input.category) {
          where.category = input.category;
        }
      } else {
        where = {
          createdById: userId,
          ...(input.status && { status: input.status }),
          ...(input.category && { category: input.category }),
        };
      }

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
              },
            },
            reviewer: { select: { id: true, displayName: true } },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { [input.sortBy]: input.sortOrder },
        }),
        ctx.db.post.count({ where }),
      ]);

      return {
        posts,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userRole = ctx.session.user.role;
      const userId = ctx.session.user.id;

      const posts = await ctx.db.post.findMany({
        where: { id: { in: input.ids } },
        select: { id: true, createdById: true },
      });

      const canDeleteIds = posts
        .filter(
          (post) =>
            post.createdById === userId ||
            userRole === UserRole.ADMIN ||
            userRole === UserRole.LPW,
        )
        .map((p) => p.id);

      if (canDeleteIds.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No permission to delete any of the selected posts",
        });
      }

      await ctx.db.post.deleteMany({
        where: { id: { in: canDeleteIds } },
      });

      return { success: true, deletedCount: canDeleteIds.length };
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.db.post.findUnique({
        where: { id: input.id },
      });

      if (!original) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      const newPost = await ctx.db.post.create({
        data: {
          title: `${original.title} (Kopie)`,
          excerpt: original.excerpt,
          content: original.content,
          coverImageId: original.coverImageId,
          category: original.category,
          bezirkId: original.bezirkId,
          pinned: false,
          status: ContentStatus.DRAFT,
          createdById: ctx.session.user.id,
        },
      });

      return newPost;
    }),

  bulkDuplicate: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const originals = await ctx.db.post.findMany({
        where: { id: { in: input.ids } },
      });

      if (originals.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No posts found",
        });
      }

      const newPosts = await Promise.all(
        originals.map((original) =>
          ctx.db.post.create({
            data: {
              title: `[DUPLIKAT] ${original.title}`,
              excerpt: original.excerpt,
              content: original.content,
              coverImageId: original.coverImageId,
              category: original.category,
              bezirkId: original.bezirkId,
              pinned: false,
              status: ContentStatus.DRAFT,
              createdById: ctx.session.user.id,
            },
          }),
        ),
      );

      return { success: true, duplicatedCount: newPosts.length };
    }),

  bulkStatusChange: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1),
        status: z.enum(ContentStatus),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userRole = ctx.session.user.role;
      const userId = ctx.session.user.id;

      const posts = await ctx.db.post.findMany({
        where: { id: { in: input.ids } },
        select: { id: true, createdById: true, coverImageId: true },
      });

      const canUpdateIds = posts
        .filter(
          (post) =>
            post.createdById === userId ||
            userRole === UserRole.ADMIN ||
            userRole === UserRole.LPW,
        )
        .map((p) => p.id);

      if (canUpdateIds.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No permission to update any of the selected posts",
        });
      }

      if (input.status === ContentStatus.APPROVED) {
        const coverImageIds = posts
          .filter((p) => canUpdateIds.includes(p.id) && p.coverImageId)
          .map((p) => p.coverImageId as string);

        if (coverImageIds.length > 0) {
          const unapprovedImages = await ctx.db.media.count({
            where: {
              id: { in: coverImageIds },
              status: { not: ContentStatus.APPROVED },
            },
          });

          if (unapprovedImages > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `${unapprovedImages} Beitrag(e) haben nicht freigegebene Titelbilder. Bitte geben Sie die Bilder zuerst frei.`,
            });
          }
        }
      }

      const updateData: {
        status: typeof input.status;
        publishedAt?: Date | null;
      } = {
        status: input.status,
      };

      if (input.status === ContentStatus.APPROVED) {
        updateData.publishedAt = new Date();
      } else if (input.status === ContentStatus.DRAFT) {
        updateData.publishedAt = null;
      }

      await ctx.db.post.updateMany({
        where: { id: { in: canUpdateIds } },
        data: updateData,
      });

      return { success: true, updatedCount: canUpdateIds.length };
    }),
});
