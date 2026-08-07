import type { Metadata } from "next";
import { cache } from "react";
import PostDetailView from "@/app/_components/posts/post-detail-view";
import { api } from "@/trpc/server";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { ContentStatus } from "~/generated/prisma/client";
import { buildPageMetadata, plainTextExcerpt } from "@/lib/seo";
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
const getPostForMetadata = cache(async (id: string) =>
  db.post.findFirst({
    where: { id, status: ContentStatus.APPROVED },
    select: {
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
    path: `/aktuelles/${id}`,
    image: post.coverImage,
    type: "article",
    publishedTime: post.publishedAt ?? post.createdAt,
    modifiedTime: post.updatedAt,
  });
}

export default async function NewsDetailPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const post = await api.posts.getById({ id });

    const relatedPostsData = await api.posts.getAll({
      page: 1,
      limit: 4,
      category: post.category,
      bezirkId: post.bezirk?.id,
    });

    const relatedPosts = relatedPostsData.posts
      .filter((p) => p.id !== post.id)
      .slice(0, 3);

    // Only approved posts are eligible for rich results; a draft previewed by
    // a reviewer must not advertise itself as published news.
    const isPublished = post.status === ContentStatus.APPROVED;

    return (
      <>
        {isPublished && (
          <JsonLd
            data={[
              newsArticleSchema({
                id: post.id,
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
  } catch {
    notFound();
  }
}
