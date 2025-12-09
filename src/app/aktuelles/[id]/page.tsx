import PostDetailView from "@/app/_components/posts/post-detail-view";
import { api } from "@/trpc/server";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
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

    return <PostDetailView post={post} relatedPosts={relatedPosts} />;
  } catch {
    notFound();
  }
}
