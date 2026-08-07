import type { Metadata } from "next";
import { cache } from "react";
import PostDetailView from "@/app/_components/posts/post-detail-view";
import { api } from "@/trpc/server";
import { notFound, permanentRedirect } from "next/navigation";
import { db } from "@/server/db";
import { ContentStatus } from "~/generated/prisma/client";
import { buildPageMetadata, plainTextExcerpt } from "@/lib/seo";
import { isUuid, postPath } from "@/lib/slug";
import JsonLd from "@/app/_components/seo/json-ld";
import { breadcrumbSchema, newsArticleSchema } from "@/lib/structured-data";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Metadata reads the post directly instead of going through `posts.getById`:
 * that procedure resolves permissions and renders markdown, none of which a
 * `<meta>` tag needs. Restricted to APPROVED so drafts previewed by reviewers
 * never leak their title into a link preview.
 */
const getPostForMetadata = cache(async (identifier: string) =>
  db.post.findFirst({
    where: {
      ...(isUuid(identifier) ? { id: identifier } : { slug: identifier }),
      status: ContentStatus.APPROVED,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      coverImage: {
        select: { url: true, width: true, height: true, alt: true },
      },
    },
  }),
);

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostForMetadata(id);

  if (!post) {
    return { title: "Beitrag", robots: { index: false, follow: false } };
  }

  return buildPageMetadata({
    title: post.title,
    description: plainTextExcerpt(post.excerpt ?? post.content),
    // Always the slug form, so a crawler that reached the UUID URL is pointed
    // at the canonical one even before it follows the redirect.
    path: postPath(post),
    image: post.coverImage,
    type: "article",
    publishedTime: post.publishedAt ?? post.createdAt,
    modifiedTime: post.updatedAt,
  });
}

/**
 * Wraps the fetch so the redirect below can live outside a try/catch.
 * `permanentRedirect` signals by throwing, and a `catch { notFound() }` around
 * it would turn every canonical redirect into a 404.
 */
async function loadPost(identifier: string) {
  try {
    const post = await api.posts.getById({ id: identifier });

    const relatedPostsData = await api.posts.getAll({
      page: 1,
      limit: 4,
      category: post.category,
      bezirkId: post.bezirk?.id,
    });

    return {
      post,
      relatedPosts: relatedPostsData.posts
        .filter((p) => p.id !== post.id)
        .slice(0, 3),
    };
  } catch {
    return null;
  }
}

export default async function NewsDetailPage({ params }: PageProps) {
  const { id } = await params;

  const data = await loadPost(id);
  if (!data) notFound();

  const { post, relatedPosts } = data;

  // Old UUID links keep working but hand their ranking to the slug URL.
  if (isUuid(id) && post.slug) {
    permanentRedirect(postPath(post));
  }

  // Only approved posts are eligible for rich results; a draft previewed by
  // a reviewer must not advertise itself as published news.
  const isPublished = post.status === ContentStatus.APPROVED;

  return (
    <>
      {isPublished && (
        <JsonLd
          data={[
            newsArticleSchema({
              path: postPath(post),
              title: post.title,
              description: plainTextExcerpt(post.excerpt ?? post.content),
              imageUrl: post.coverImage?.url,
              publishedAt: post.publishedAt ?? post.createdAt,
              updatedAt: post.updatedAt,
              authorName:
                post.authorName ??
                post.author?.displayName ??
                post.createdBy?.displayName,
            }),
            breadcrumbSchema([
              { name: "Start", path: "/" },
              { name: "Aktuelles", path: "/aktuelles" },
              { name: post.title },
            ]),
          ]}
        />
      )}
      <PostDetailView post={post} relatedPosts={relatedPosts} />
    </>
  );
}
