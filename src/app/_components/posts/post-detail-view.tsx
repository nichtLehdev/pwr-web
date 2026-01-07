"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import "@/styles/article-content.css";
import type { RouterOutputs } from "@/trpc/react";
import { getDistrictColor } from "@/lib/district-color";
import ImageLightbox from "./image-lightbox";
import PostCard from "./post-card";
import type { FileType } from "~/generated/prisma/enums";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { UserRole } from "~/generated/prisma/enums";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  DownloadIcon,
  PinIcon,
  EditIcon,
} from "lucide-react";

type PostWithRelations = RouterOutputs["posts"]["getById"];
type PostListItem = RouterOutputs["posts"]["getAll"]["posts"][number];

const fileTypeLabels: Record<FileType, string> = {
  PDF: "PDF",
  DOCX: "Word",
  XLSX: "Excel",
  ZIP: "ZIP",
  MP3: "Audio",
};

const fileTypeIcons: Record<FileType, string> = {
  PDF: "📄",
  DOCX: "📝",
  XLSX: "📊",
  ZIP: "📦",
  MP3: "🎵",
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface PostDetailViewProps {
  post: PostWithRelations;
  relatedPosts: PostListItem[];
}

export default function PostDetailView({
  post,
  relatedPosts,
}: PostDetailViewProps) {
  const [lightboxImage, setLightboxImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const { data: session } = useSession();
  const { data: profile } = api.users.getMyProfile.useQuery(undefined, {
    enabled: !!session?.user,
  });

  useEffect(() => {
    const container = document.querySelector(".article-content");
    if (!container) return;

    const handleContainerClick = (event: Event) => {
      const target = event.target as HTMLImageElement | null;
      if (target && target.tagName === "IMG") {
        setLightboxImage({
          src: target.getAttribute("src") || "",
          alt: target.getAttribute("alt") || "",
        });
      }
    };

    container.addEventListener("click", handleContainerClick);

    return () => {
      container.removeEventListener("click", handleContainerClick);
    };
  }, []);

  const districtColor = getDistrictColor(post.bezirk?.number);
  const publishDate = new Date(post.publishedAt || post.createdAt);

  // Check if user can edit this post
  const canEdit =
    session?.user &&
    profile &&
    (post.createdById === session.user.id ||
      post.createdBy?.id === session.user.id ||
      profile.role === UserRole.ADMIN ||
      profile.role === UserRole.LPW);

  return (
    <div className="bg-background dark:bg-dark-background min-h-screen">
      {/* Header with Image */}
      {post.coverImage?.url ? (
        <section className="relative h-[40vh] md:h-[50vh] lg:h-[60vh]">
          <Image
            src={post.coverImage.url}
            alt={post.coverImage.alt || post.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />

          {/* Breadcrumb & Meta */}
          <div className="absolute right-0 bottom-0 left-0 text-white">
            <div className="container mx-auto px-4 pb-6 md:pb-8">
              {/* Breadcrumb */}
              <nav className="mb-4 flex items-center gap-2 text-sm">
                <Link href="/" className="hover:text-primary transition-colors">
                  Start
                </Link>
                <span>/</span>
                <Link
                  href="/aktuelles"
                  className="hover:text-primary transition-colors"
                >
                  Aktuelles
                </Link>
                <span>/</span>
                <span className="opacity-80">Beitrag</span>
              </nav>

              {/* Meta Info */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: districtColor }}
                >
                  {post.category}
                </span>
                <span className="text-sm">
                  {publishDate.toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                {post.bezirk && (
                  <span
                    className="rounded-full border-2 px-3 py-1 text-xs font-semibold text-white"
                    style={{ borderColor: districtColor }}
                  >
                    Bezirk {post.bezirk.number} ({post.bezirk.shortName})
                  </span>
                )}
                {post.pinned && (
                  <span className="flex items-center gap-1 text-sm">
                    <PinIcon className="h-4 w-4" />
                    Angepinnt
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="max-w-4xl text-2xl font-bold wrap-break-word md:text-4xl lg:text-5xl">
                {post.title}
              </h1>
            </div>
          </div>
        </section>
      ) : (
        /* Header without Image */
        <section className="bg-primary py-8 text-white md:py-12 lg:py-16">
          <div className="container mx-auto px-4">
            {/* Breadcrumb */}
            <nav className="mb-4 flex items-center gap-2 text-sm opacity-90">
              <Link href="/" className="transition-colors hover:text-white">
                Start
              </Link>
              <span>/</span>
              <Link
                href="/aktuelles"
                className="transition-colors hover:text-white"
              >
                Aktuelles
              </Link>
              <span>/</span>
              <span>Beitrag</span>
            </nav>

            {/* Meta Info */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                {post.category}
              </span>
              <span className="text-sm">
                {publishDate.toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              {post.bezirk && (
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                  Bezirk {post.bezirk.number} ({post.bezirk.shortName})
                </span>
              )}
              {post.pinned && (
                <span className="flex items-center gap-1 text-sm">
                  <PinIcon className="h-4 w-4" />
                  Angepinnt
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="max-w-4xl text-2xl font-bold wrap-break-word md:text-4xl lg:text-5xl">
              {post.title}
            </h1>
          </div>
        </section>
      )}

      {/* Content */}
      <article className="py-8 md:py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            {/* Author Info */}
            {post.createdBy && (
              <div className="dark:border-dark-border mb-8 flex items-center gap-4 border-b border-gray-200 pb-8">
                {post.createdBy.profileImage?.url && (
                  <Image
                    src={post.createdBy.profileImage.url}
                    alt={
                      post.createdBy.profileImage.alt ||
                      post.createdBy.displayName ||
                      "Autor Bild"
                    }
                    width={200}
                    height={200}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="text-dark dark:text-dark-text font-semibold">
                    {post.createdBy.displayName}
                  </p>
                  {post.createdBy.bio && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {post.createdBy.bio}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Excerpt */}
            {post.excerpt && (
              <div className="dark:border-dark-border mb-8 border-b border-gray-200 pb-8 text-xl leading-relaxed font-medium text-gray-700 dark:text-gray-300">
                {post.excerpt}
              </div>
            )}

            {/* Main Content */}
            <div
              className="article-content"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />

            {/* Share & Back */}
            <div className="dark:border-dark-border mt-12 flex flex-col items-start justify-between gap-4 border-t border-gray-200 pt-8 sm:flex-row sm:items-center">
              <Link
                href="/aktuelles"
                className="text-primary hover:text-primary-dark inline-flex items-center font-semibold transition-colors"
              >
                <ArrowLeftIcon
                  className="mr-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                />
                Zurück zur Übersicht
              </Link>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Edit Link */}
                {canEdit && (
                  <Link
                    href={`/dashboard/posts/${post.id}/edit`}
                    className="text-primary hover:text-primary-dark border-primary hover:bg-primary/10 inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 font-semibold transition-colors"
                  >
                    <EditIcon className="h-4 w-4" />
                    Bearbeiten
                  </Link>
                )}

                {/* Share Buttons */}
                <span className="mr-2 text-sm text-gray-600 dark:text-gray-400">
                  Teilen:
                </span>
                <button
                  className="dark:hover:bg-dark-surface rounded-lg p-2 transition-colors hover:bg-gray-100"
                  aria-label="Auf Facebook teilen"
                >
                  <svg
                    className="h-5 w-5 text-gray-600 dark:text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </button>
                <button
                  className="dark:hover:bg-dark-surface rounded-lg p-2 transition-colors hover:bg-gray-100"
                  aria-label="Auf Twitter teilen"
                >
                  <svg
                    className="h-5 w-5 text-gray-600 dark:text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </button>
                <button
                  className="dark:hover:bg-dark-surface rounded-lg p-2 transition-colors hover:bg-gray-100"
                  aria-label="Per E-Mail teilen"
                >
                  <svg
                    className="h-5 w-5 text-gray-600 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Attached Downloads */}
      {post.attachedDownloads && post.attachedDownloads.length > 0 && (
        <section className="dark:border-dark-border border-t border-gray-200 py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-dark dark:text-dark-text mb-6 flex items-center gap-2 text-xl font-bold md:text-2xl">
                <DownloadIcon className="h-6 w-6" />
                Downloads
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {post.attachedDownloads.map((download) => (
                  <a
                    key={download.id}
                    href={download.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dark:bg-dark-surface dark:border-dark-border dark:hover:border-primary group hover:border-primary flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <span className="text-3xl">
                      {fileTypeIcons[download.fileType]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="dark:text-dark-text group-hover:text-primary truncate font-medium text-gray-900 transition-colors">
                        {download.title}
                      </p>
                      {download.description && (
                        <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                          {download.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {fileTypeLabels[download.fileType]}
                        {download.fileSize &&
                          ` • ${formatFileSize(download.fileSize)}`}
                      </p>
                    </div>
                    <ArrowUpRightIcon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Similar Posts */}
      {relatedPosts.length > 0 && (
        <section className="dark:bg-dark-background-secondary bg-gray-50 py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
              Ähnliche Beiträge
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <PostCard
                  key={relatedPost.id}
                  id={relatedPost.id}
                  category={relatedPost.category}
                  date={relatedPost.publishedAt || relatedPost.createdAt}
                  title={relatedPost.title}
                  excerpt={relatedPost.excerpt || ""}
                  image={relatedPost.coverImage?.url}
                  district={relatedPost.bezirk?.number}
                  content={relatedPost.content}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
}
