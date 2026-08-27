import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { marked } from "marked";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { PostCategory, ContentStatus } from "~/generated/prisma/client";
import { userHasPermission } from "../helpers/permissions";
import { authorMayChangeStatus } from "../helpers/content-status";
import {
  assertDistrictAllowed,
  assertDistrictChangeAllowed,
  districtAllowed,
  districtScopeFilter,
  resolveDistrictScope,
} from "../helpers/district-scope";
import {
  notifyCreatorOfReviewResult,
  notifySubmittedForReview,
} from "../helpers/review-notifications";
import { PERMISSIONS } from "@/lib/permissions";
import { permissionProcedure } from "../middleware/permissions";
import { createPostSlug, updatePostSlug } from "../helpers/content-slug";
import { isUuid, MAX_SLUG_LENGTH } from "@/lib/slug";

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

const MEDIA_URL_PATTERN = /\/api\/uploads\/(?:media|profiles)\/[^\s"'<>)\]]+/;

/**
 * Enriches post content HTML with media credits: finds img tags whose src
 * points to our media, looks up copyright/creator, and wraps them in figure
 * with a figcaption credit (and adds data-copyright, data-creator for the lightbox).
 */
async function enrichContentHtmlWithMediaCredits(
  html: string,
  db: {
    media: {
      findMany: (args: {
        where: { url: { in: string[] } };
        select: { url: true; copyright: true; creator: true };
      }) => Promise<
        { url: string; copyright: string | null; creator: string | null }[]
      >;
    };
  },
): Promise<string> {
  const imgTagRegex = /<img\s+([^>]*?)>/gi;
  const srcRegex = /src=["']([^"']+)["']/i;
  const urlsFromHtml: string[] = [];
  let match: RegExpExecArray | null;
  const imgTags: { full: string; src: string }[] = [];
  while ((match = imgTagRegex.exec(html)) !== null) {
    const full = match[0];
    const attrs = match[1] ?? "";
    const srcMatch = attrs.match(srcRegex);
    const src = srcMatch?.[1] ?? "";
    if (src && MEDIA_URL_PATTERN.test(src)) {
      urlsFromHtml.push(src);
      imgTags.push({ full, src });
    }
  }
  const uniqueUrls = [...new Set(urlsFromHtml)];
  if (uniqueUrls.length === 0) return html;

  const mediaList = await db.media.findMany({
    where: { url: { in: uniqueUrls } },
    select: { url: true, copyright: true, creator: true },
  });
  const mediaByUrl = new Map(
    mediaList.map((m) => [
      m.url,
      { copyright: m.copyright, creator: m.creator },
    ]),
  );

  const escapeAttr = (s: string | null) =>
    (s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let result = html;
  for (const { full, src } of imgTags) {
    const meta = mediaByUrl.get(src);
    const hasCredit = meta && (meta.copyright || meta.creator);
    if (!hasCredit) continue;

    const creditParts = [meta!.copyright, meta!.creator].filter(Boolean);
    const creditText = (meta!.creator ? "📷 " : "") + creditParts.join(" • ");
    const newImg = full.replace(
      /\s*\/?\s*>$/,
      ` data-copyright="${escapeAttr(meta!.copyright)}" data-creator="${escapeAttr(meta!.creator)}">`,
    );
    const figure = `<figure class="article-content-figure">${newImg}<figcaption class="article-content-figcaption">${escapeHtml(creditText)}</figcaption></figure>`;
    result = result.replace(full, figure);
  }
  return result;
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
            author: {
              select: {
                id: true,
                displayName: true,
                profileImage: true,
              },
            },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          // Sort by the date the UI displays (publishedAt), not createdAt —
          // otherwise early-drafted, late-published posts sink below older ones.
          orderBy: [
            { pinned: "desc" },
            { publishedAt: { sort: "desc", nulls: "last" } },
            { createdAt: "desc" },
          ],
        }),
        ctx.db.post.count({ where }),
      ]);

      // No markdown->HTML conversion for lists: only detail views (getById)
      // render contentHtml; parsing every full article per list request was
      // pure overhead.
      const posts = rawPosts;

      return {
        posts,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  /**
   * Accepts either the UUID or the slug. Public links use the slug; the
   * dashboard and links shared before slugs existed still pass a UUID.
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rawPost = await ctx.db.post.findFirst({
        where: isUuid(input.id) ? { id: input.id } : { slug: input.id },
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
          author: {
            select: {
              id: true,
              displayName: true,
              email: true,
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

        const canViewPost = await userHasPermission(
          ctx.session.user.id,
          PERMISSIONS.POSTS_VIEW,
          ctx.permissionCache,
        );
        const scope = await resolveDistrictScope(
          ctx.db,
          ctx.session.user.id,
          "posts",
          ctx.permissionCache,
        );
        const canView =
          rawPost.createdById === ctx.session.user.id ||
          scope.unrestricted ||
          (canViewPost && districtAllowed(scope, rawPost.bezirkId));

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
      const contentHtml = await enrichContentHtmlWithMediaCredits(
        postWithHtml.contentHtml,
        ctx.db,
      );
      return {
        ...postWithHtml,
        contentHtml,
        attachedDownloads,
      };
    }),

  getAttachedContent: permissionProcedure(PERMISSIONS.POSTS_APPROVE)
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

      // No markdown->HTML conversion for lists: only detail views (getById)
      // render contentHtml; parsing every full article per list request was
      // pure overhead.
      const posts = rawPosts;

      return {
        posts,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  getPendingReview: permissionProcedure(PERMISSIONS.POSTS_APPROVE)
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      // PENDING is the review marker itself — a separate pendingReview
      // column never existed in the schema.
      // Freigeben ist bewusst nicht bezirksgebunden: wer POSTS_APPROVE hat
      // (Admin, LPW, RPW), prüft für das ganze Werk.
      const where: { status: ContentStatus } = {
        status: ContentStatus.PENDING,
      };

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

      // No markdown->HTML conversion for lists: only detail views (getById)
      // render contentHtml; parsing every full article per list request was
      // pure overhead.
      const posts = rawPosts;

      return {
        posts,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        /** Empty means "derive it from the title"; see createPostSlug. */
        slug: z.string().max(MAX_SLUG_LENGTH).optional(),
        excerpt: z.string().max(500).optional(),
        content: z.string().min(1).max(50000),
        coverImageId: z.string().optional(),
        coverImagePositionX: z.number().min(0).max(100).optional().nullable(),
        coverImagePositionY: z.number().min(0).max(100).optional().nullable(),
        category: z.enum(PostCategory),
        bezirkId: z.string().optional(),
        pinned: z.boolean().default(false),
        status: z.enum(ContentStatus).default(ContentStatus.PENDING),
        authorId: z.string().optional().nullable(),
        authorName: z.string().max(200).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const canCreate = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.POSTS_CREATE,
        ctx.permissionCache,
      );
      if (!canCreate) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Keine Berechtigung, Beiträge anzulegen",
        });
      }

      const scope = await resolveDistrictScope(
        ctx.db,
        ctx.session.user.id,
        "posts",
        ctx.permissionCache,
      );
      assertDistrictAllowed(scope, input.bezirkId);

      const canPinPosts = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.HOMEPAGE_MANAGE,
        ctx.permissionCache,
      );
      if (input.pinned && !canPinPosts) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to pin posts",
        });
      }

      const canApprovePosts = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.POSTS_APPROVE,
        ctx.permissionCache,
      );
      if (input.status === ContentStatus.APPROVED && !canApprovePosts) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to approve posts",
        });
      }

      const post = await ctx.db.post.create({
        data: {
          ...input,
          slug: await createPostSlug(ctx.db, input.title, input.slug),
          createdById: ctx.session.user.id,
          publishedAt:
            input.status === ContentStatus.APPROVED ? new Date() : null,
          authorId: input.authorId ?? null,
          authorName: input.authorName ?? null,
        },
        include: {
          coverImage: true,
          bezirk: true,
        },
      });

      if (post.status === ContentStatus.PENDING) {
        await notifySubmittedForReview({
          db: ctx.db,
          contentType: "post",
          contentId: post.id,
          title: post.title,
          actorId: ctx.session.user.id,
        });
      }

      return post;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        /** Only sent when the author deliberately renamed it; empty = leave as is. */
        slug: z.string().max(MAX_SLUG_LENGTH).optional(),
        excerpt: z.string().max(500).optional(),
        content: z.string().max(50000).optional(),
        coverImageId: z.string().optional().nullable(),
        coverImagePositionX: z.number().min(0).max(100).optional().nullable(),
        coverImagePositionY: z.number().min(0).max(100).optional().nullable(),
        category: z.enum(PostCategory).optional(),
        bezirkId: z.string().optional().nullable(),
        pinned: z.boolean().optional(),
        status: z.enum(ContentStatus).optional(),
        authorId: z.string().optional().nullable(),
        authorName: z.string().max(200).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, slug: requestedSlug, ...updateData } = input;

      const post = await ctx.db.post.findUnique({
        where: { id },
        select: {
          createdById: true,
          status: true,
          coverImageId: true,
          bezirkId: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      const canEditPost = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.POSTS_EDIT,
        ctx.permissionCache,
      );
      const canEdit = post.createdById === ctx.session.user.id || canEditPost;

      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      const scope = await resolveDistrictScope(
        ctx.db,
        ctx.session.user.id,
        "posts",
        ctx.permissionCache,
      );
      assertDistrictChangeAllowed(scope, updateData.bezirkId, post.bezirkId);

      const canPinPosts = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.HOMEPAGE_MANAGE,
        ctx.permissionCache,
      );
      if (updateData.pinned !== undefined && !canPinPosts) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to pin posts",
        });
      }

      const canApprovePosts = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.POSTS_APPROVE,
        ctx.permissionCache,
      );
      if (updateData.status === ContentStatus.APPROVED && !canApprovePosts) {
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

      // A blank field is "keep the current slug", not "clear it".
      if (requestedSlug?.trim()) {
        finalData.slug = await updatePostSlug(ctx.db, id, requestedSlug);
      }
      if (
        updateData.status === ContentStatus.APPROVED &&
        post.status !== ContentStatus.APPROVED
      ) {
        finalData.publishedAt = new Date();
      } else if (updateData.status === ContentStatus.DRAFT) {
        finalData.publishedAt = null;
      }

      if (updateData.authorId !== undefined) {
        finalData.authorId = updateData.authorId;
      }
      if (updateData.authorName !== undefined) {
        finalData.authorName = updateData.authorName;
      }

      const updated = await ctx.db.post.update({
        where: { id },
        data: finalData,
        include: {
          coverImage: true,
          bezirk: true,
        },
      });

      if (
        updateData.status === ContentStatus.PENDING &&
        post.status !== ContentStatus.PENDING
      ) {
        await notifySubmittedForReview({
          db: ctx.db,
          contentType: "post",
          contentId: updated.id,
          title: updated.title,
          actorId: ctx.session.user.id,
        });
      }

      return updated;
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

      const canDeletePost = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.POSTS_DELETE,
        ctx.permissionCache,
      );
      const canDelete =
        post.createdById === ctx.session.user.id || canDeletePost;

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

  approve: permissionProcedure(PERMISSIONS.POSTS_APPROVE)
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

      const approved = await ctx.db.post.update({
        where: { id: input.id },
        data: {
          status: ContentStatus.APPROVED,
          reviewerId: ctx.session.user.id,
          reviewDate: new Date(),
          reviewNotes: input.reviewNotes,
          publishedAt: new Date(),
        },
      });

      await notifyCreatorOfReviewResult({
        db: ctx.db,
        contentType: "post",
        contentId: approved.id,
        title: approved.title,
        createdById: approved.createdById,
        reviewerId: ctx.session.user.id,
        approved: true,
        reviewNotes: input.reviewNotes,
      });

      return approved;
    }),

  reject: permissionProcedure(PERMISSIONS.POSTS_APPROVE)
    .input(
      z.object({
        id: z.string(),
        reviewNotes: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rejected = await ctx.db.post.update({
        where: { id: input.id },
        data: {
          status: ContentStatus.REJECTED,
          reviewerId: ctx.session.user.id,
          reviewDate: new Date(),
          reviewNotes: input.reviewNotes,
        },
      });

      await notifyCreatorOfReviewResult({
        db: ctx.db,
        contentType: "post",
        contentId: rejected.id,
        title: rejected.title,
        createdById: rejected.createdById,
        reviewerId: ctx.session.user.id,
        approved: false,
        reviewNotes: input.reviewNotes,
      });

      return rejected;
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
      const userId = ctx.session.user.id;
      const canApproveAll = await userHasPermission(
        userId,
        PERMISSIONS.POSTS_APPROVE,
        ctx.permissionCache,
      );
      const canApproveOwn = await userHasPermission(
        userId,
        PERMISSIONS.POSTS_CREATE,
        ctx.permissionCache,
      );

      let where: Record<string, unknown> = {};

      if (canApproveAll) {
        if (input.status) {
          where.status = input.status;
        }
        if (input.category) {
          where.category = input.category;
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

      // Obleute sehen die Liste ihres eigenen Bezirks, nicht die aller 13.
      const scope = await resolveDistrictScope(
        ctx.db,
        userId,
        "posts",
        ctx.permissionCache,
      );
      const scopeFilter = districtScopeFilter(scope, userId);
      if (scopeFilter) {
        where = { AND: [{ ...where }, scopeFilter] };
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
            author: {
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
      const userId = ctx.session.user.id;
      const canDeleteAny = await userHasPermission(
        userId,
        PERMISSIONS.POSTS_DELETE,
        ctx.permissionCache,
      );

      const posts = await ctx.db.post.findMany({
        where: { id: { in: input.ids } },
        select: { id: true, createdById: true },
      });

      const canDeleteIds = posts
        .filter((post) => post.createdById === userId || canDeleteAny)
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

      const canCreate = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.POSTS_CREATE,
        ctx.permissionCache,
      );
      if (!canCreate) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Keine Berechtigung, Beiträge anzulegen",
        });
      }

      const scope = await resolveDistrictScope(
        ctx.db,
        ctx.session.user.id,
        "posts",
        ctx.permissionCache,
      );
      assertDistrictAllowed(scope, original.bezirkId);

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
          authorId: original.authorId,
          authorName: original.authorName,
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

      const canCreate = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.POSTS_CREATE,
        ctx.permissionCache,
      );
      if (!canCreate) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Keine Berechtigung, Beiträge anzulegen",
        });
      }

      const scope = await resolveDistrictScope(
        ctx.db,
        ctx.session.user.id,
        "posts",
        ctx.permissionCache,
      );
      for (const original of originals) {
        assertDistrictAllowed(scope, original.bezirkId);
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
              authorId: original.authorId,
              authorName: original.authorName,
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
      const userId = ctx.session.user.id;
      const canApprove = await userHasPermission(
        userId,
        PERMISSIONS.POSTS_APPROVE,
        ctx.permissionCache,
      );

      const posts = await ctx.db.post.findMany({
        where: { id: { in: input.ids } },
        select: {
          id: true,
          createdById: true,
          coverImageId: true,
          status: true,
        },
      });

      const canUpdateIds = posts
        .filter(
          (post) =>
            canApprove ||
            (post.createdById === userId &&
              authorMayChangeStatus(post.status, input.status)),
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

  exportPosts: permissionProcedure(PERMISSIONS.DATA_EXPORT).query(
    async ({ ctx }) => {
      const posts = await ctx.db.post.findMany({
        include: {
          coverImage: true,
          bezirk: true,
          createdBy: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          author: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          reviewer: {
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
        posts: posts.map((post) => ({
          ...post,
          coverImageUrl: post.coverImage?.url,
          bezirkName: post.bezirk?.name,
          createdByEmail: post.createdBy?.email,
          authorEmail: post.author?.email,
          reviewerEmail: post.reviewer?.email,
        })),
        exportedAt: new Date().toISOString(),
        count: posts.length,
      };
    },
  ),

  importPosts: permissionProcedure(PERMISSIONS.DATA_IMPORT)
    .input(
      z.object({
        posts: z.array(
          z.object({
            title: z.string(),
            excerpt: z.string().optional().nullable(),
            content: z.string(),
            category: z.enum(PostCategory),
            bezirkId: z.string().optional().nullable(),
            pinned: z.boolean().optional(),
            status: z.enum(ContentStatus).optional(),
            coverImageId: z.string().optional().nullable(),
            originalId: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.posts.map(async (postData) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { originalId, ...data } = postData;
          return await ctx.db.post.create({
            data: {
              ...data,
              status: data.status ?? ContentStatus.DRAFT,
              pinned: data.pinned ?? false,
              createdById: ctx.session.user.id,
            },
          });
        }),
      );

      return {
        success: true,
        importedCount: results.length,
        posts: results,
      };
    }),
});
