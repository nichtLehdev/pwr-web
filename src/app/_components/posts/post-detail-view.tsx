"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import "@/styles/article-content.css";
import type { RouterOutputs } from "@/trpc/react";
import { getDistrictColor } from "@/lib/district-color";
import ImageLightbox from "./image-lightbox";
import PostCard from "./post-card";
import MediaCredit from "@/app/_components/general/media-credit";
import PublicShareButton from "@/app/_components/general/public-share-button";
import type { FileType } from "~/generated/prisma/enums";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import type { PermissionKey } from "@/lib/permissions";
import { sanitizeHtml } from "@/lib/sanitize";
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
    copyright?: string | null;
    creator?: string | null;
  } | null>(null);
  const { data: session } = useSession();
  const { data: profile } = api.users.getMyProfile.useQuery(undefined, {
    enabled: !!session?.user,
  });

  useEffect(() => {
    const container = document.querySelector(".article-content");
    if (!container) return;

    const handleContainerClick = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const img =
        target?.tagName === "IMG"
          ? (target as HTMLImageElement)
          : target?.closest("figure")?.querySelector("img");
      if (img && img.tagName === "IMG") {
        setLightboxImage({
          src: img.getAttribute("src") || "",
          alt: img.getAttribute("alt") || "",
          copyright: img.getAttribute("data-copyright") ?? undefined,
          creator: img.getAttribute("data-creator") ?? undefined,
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

  const displayUser = post.author || post.createdBy;
  const displayName =
    post.authorName || displayUser?.displayName || "Unbekannt";
  const displayBio = post.author?.bio || post.createdBy?.bio;
  const displayImage =
    post.author?.profileImage || post.createdBy?.profileImage;
  const userId = displayUser?.id;

  const { hasDashboardAccess: hasAnyPermission, hasAnyPermission: hasAnyPerm } =
    usePermissions();

  const hasEditPermission = hasAnyPerm([
    "posts.edit" as PermissionKey,
    "posts.approve" as PermissionKey,
  ]);

  const canViewUserProfile = session?.user && profile && hasAnyPermission;

  const canEdit =
    session?.user &&
    profile &&
    (post.createdById === session.user.id ||
      post.createdBy?.id === session.user.id ||
      hasEditPermission);

  return (
    <div className="bg-background dark:bg-dark-background min-h-screen">
      {/* Header with Image */}
      <section className="relative h-[40vh] md:h-[50vh] lg:h-[60vh]">
        {post.coverImage?.url ? (
          <>
            <Image
              src={post.coverImage.url}
              alt={post.coverImage.alt || post.title}
              fill
              className="object-cover"
              priority
              style={{
                objectPosition:
                  post.coverImagePositionX !== null &&
                  post.coverImagePositionY !== null
                    ? `${post.coverImagePositionX}% ${post.coverImagePositionY}%`
                    : undefined,
              }}
            />
            {/* Stronger scrim so titles stay readable on busy cover images */}
            <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/40 to-black/10" />
            {(post.coverImage.copyright || post.coverImage.creator) && (
              <div className="absolute right-4 bottom-4 z-10 flex justify-end">
                <MediaCredit
                  copyright={post.coverImage.copyright}
                  creator={post.coverImage.creator}
                  variant="light"
                  showCreatorIcon
                  className="text-right"
                />
              </div>
            )}
          </>
        ) : (
          <div className="relative flex h-full items-center justify-center bg-gray-100 px-4 dark:bg-gray-800">
            <Image
              src="/images/logo-horizontal.svg"
              alt="Posaunenwerk Rheinland"
              width={300}
              height={84}
              className="h-auto w-auto max-w-[70%] md:max-w-[60%] lg:max-w-[50%] dark:hidden"
              style={{
                mixBlendMode: "multiply",
                filter: "brightness(1.1)",
              }}
              unoptimized
            />
            <Image
              src="/images/logo-horizontal-dark.svg"
              alt="Posaunenwerk Rheinland"
              width={300}
              height={84}
              className="hidden h-auto w-auto max-w-[70%] md:max-w-[60%] lg:max-w-[50%] dark:block"
              unoptimized
            />
          </div>
        )}

        {/* Breadcrumb & Meta */}
        <div
          className={`absolute right-0 bottom-0 left-0 ${post.coverImage?.url ? "text-white" : "text-dark dark:text-dark-text"}`}
        >
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
                  className={`rounded-full border-2 px-3 py-1 text-xs font-semibold ${post.coverImage?.url ? "text-white" : "text-dark dark:text-dark-text"}`}
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

      {/* Content */}
      <article className="py-8 md:py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            {/* Author Info */}
            {(post.author || post.authorName || post.createdBy) && (
              <div className="dark:border-dark-border mb-8 flex items-center gap-4 border-b border-gray-200 pb-8">
                {displayImage?.url && (
                  <Image
                    src={displayImage.url}
                    alt={displayImage.alt || displayName || "Autor Bild"}
                    width={200}
                    height={200}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  {userId && canViewUserProfile ? (
                    <Link
                      href={`/dashboard/users/${userId}`}
                      className="text-dark dark:text-dark-text hover:text-primary dark:hover:text-primary font-semibold transition-colors"
                    >
                      {displayName}
                    </Link>
                  ) : (
                    <p className="text-dark dark:text-dark-text font-semibold">
                      {displayName}
                    </p>
                  )}
                  {displayBio && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {displayBio}
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
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(post.contentHtml),
              }}
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

                <PublicShareButton
                  title={post.title}
                  text={post.excerpt || post.title}
                  className="dark:hover:bg-dark-surface inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
                />
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
                  slug={relatedPost.slug}
                  category={relatedPost.category}
                  date={relatedPost.publishedAt || relatedPost.createdAt}
                  title={relatedPost.title}
                  excerpt={relatedPost.excerpt || ""}
                  image={relatedPost.coverImage?.url}
                  imagePositionX={relatedPost.coverImagePositionX}
                  imagePositionY={relatedPost.coverImagePositionY}
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
          copyright={lightboxImage.copyright}
          creator={lightboxImage.creator}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
}
