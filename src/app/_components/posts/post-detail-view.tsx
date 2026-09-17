"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import "@/styles/article-content.css";
import type { RouterOutputs } from "@/trpc/react";
import PublicPage from "@/app/_components/general/public-page";
import { PageSection } from "@/app/_components/programmheft/page-section";
import { SectionHead } from "@/app/_components/programmheft/section-head";
import { headMeta } from "@/app/_components/programmheft/page-head";
import { BezirkLabel } from "@/app/_components/programmheft/bezirk-label";
import { WayList, WayRow } from "@/app/_components/programmheft/way-list";
import { NewsColumns } from "@/app/_components/programmheft/news";
import ImageLightbox from "./image-lightbox";
import MediaCredit from "@/app/_components/general/media-credit";
import PublicShareButton from "@/app/_components/general/public-share-button";
import { DOWNLOAD_FILE_TYPE_LABELS } from "@/lib/download-file-types";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import type { PermissionKey } from "@/lib/permissions";
import { sanitizeHtml } from "@/lib/sanitize";
import { ArrowLeftIcon, CalendarIcon, EditIcon, PinIcon } from "lucide-react";

type PostWithRelations = RouterOutputs["posts"]["getById"];
type PostListItem = RouterOutputs["posts"]["getAll"]["posts"][number];

const DATE = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Ohne Titelbild zeigt das Bildfeld das helle Logo auf Tinte. */
function CoverFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center px-10">
      <Image
        src="/images/logo-horizontal-dark.svg"
        alt=""
        width={240}
        height={67}
        className="h-auto w-2/5 max-w-xs"
        unoptimized
      />
    </div>
  );
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

  const publishDate = new Date(post.publishedAt || post.createdAt);
  const position =
    post.coverImagePositionX != null && post.coverImagePositionY != null
      ? `${post.coverImagePositionX}% ${post.coverImagePositionY}%`
      : undefined;

  const displayUser = post.author || (post.authorName ? null : post.createdBy);
  const displayName =
    post.authorName || displayUser?.displayName || "Unbekannt";
  const displayBio = displayUser?.bio;
  const displayImage = displayUser?.profileImage;
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

  const heroDescription = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {post.pinned ? (
          <span className={headMeta.label}>
            <span className="inline-flex items-center gap-1.5">
              <PinIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Angepinnt
            </span>
          </span>
        ) : null}
        <span className={headMeta.label}>{post.category}</span>
        {post.bezirk ? (
          <span className={headMeta.label}>
            <BezirkLabel bezirk={post.bezirk} />
          </span>
        ) : null}
        {canEdit ? (
          <Link
            href={`/dashboard/posts/${post.id}/edit`}
            className={headMeta.action}
          >
            <EditIcon className="h-4 w-4 shrink-0" aria-hidden />
            Bearbeiten
          </Link>
        ) : null}
        <PublicShareButton
          title={post.title}
          text={post.excerpt || post.title}
          className={headMeta.action}
        />
      </div>
      <div className={headMeta.line}>
        <span className="flex items-center gap-2">
          <CalendarIcon className={headMeta.icon} aria-hidden />
          <time dateTime={publishDate.toISOString()}>
            {DATE.format(publishDate)}
          </time>
        </span>
      </div>
    </div>
  );

  return (
    <PublicPage
      title={post.title}
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Aktuelles", href: "/aktuelles" },
        { label: "Beitrag" },
      ]}
      heroSize="compact"
      description={heroDescription}
    >
      <PageSection flush="top">
        {/* Das Lesemaß ist von hier auf die einzelnen Geschwister gewandert:
            Solange es an der Hülle hing, konnte kein Bild breiter werden als
            der Text. Der Artikelkörper führt sein Maß jetzt selbst (siehe
            article-content.css) und darf dafür die volle Satzbreite nutzen. */}
        <div className="mt-12 space-y-8">
          {/* Author Info */}
          {post.author || post.authorName || post.createdBy ? (
            <div className="border-rule dark:border-night-rule mx-auto flex max-w-[65ch] items-center gap-4 border-b pb-8">
              {displayImage?.url ? (
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={displayImage.url}
                    alt={displayImage.alt || displayName || "Autor Bild"}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <div className="min-w-0">
                {userId && canViewUserProfile ? (
                  <Link
                    href={`/dashboard/users/${userId}`}
                    className="condensed text-ink dark:text-night-text hover:text-primary-ink dark:hover:text-primary text-[1.375rem] leading-tight font-bold transition-colors"
                  >
                    {displayName}
                  </Link>
                ) : (
                  <p className="condensed text-ink dark:text-night-text text-[1.375rem] leading-tight font-bold">
                    {displayName}
                  </p>
                )}
                {displayBio ? (
                  <p className="text-dark dark:text-night-muted mt-0.5 text-[0.9375rem]">
                    {displayBio}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Excerpt */}
          {post.excerpt ? (
            // Der Maßrahmen steht außen, in Grundschriftgröße: `ch` bemisst
            // sich an der eigenen Schriftgröße, und der Anriss läuft in
            // `text-xl`. Direkt am Absatz wären 65ch rund 649px statt der
            // 596px des Artikelkörpers — gemessen, er stand 27px zu weit
            // links. Außen erbt der Rahmen 1rem und flucht damit.
            <div className="mx-auto max-w-[65ch]">
              <p className="semi-condensed text-ink dark:text-night-text text-xl leading-relaxed font-medium">
                {post.excerpt}
              </p>
            </div>
          ) : null}

          {/* Main Content */}
          {/* Titelbild und Text teilen sich eine Spalte, damit der Text das
              Bild umfließt — so macht es das Blechblatt: Überschrift, dann
              sofort Text, das Aufmacherbild daneben. Vorher stand das Bild als
              885px hoher Block über allem; am Desktop mussten 483px gescrollt
              werden, bevor ein einziges Wort zu sehen war (gemessen bei
              1440×900). Das `after:clear-both` ist nötig, weil der Float hier
              ein Geschwister des Artikelkörpers ist — dessen eigenes `clear`
              greift dafür nicht. */}
          <div className="mx-auto max-w-[65ch] after:clear-both after:block after:content-['']">
            {/* Auf dem Handy steht das Bild nicht daneben, sondern darüber —
                dort kostet 3:2 zu viel Höhe: Bei „Wichtige Impulse…" lag der
                erste Absatz dadurch 20px unter der Kante (gemessen 390×844),
                also derselbe Fehler wie zuvor am Desktop, nur klein. Flacher
                geschnitten bleibt das Bild da und der Text sichtbar. */}
            <figure className="mb-5 w-full sm:float-right sm:mb-2 sm:ml-8 sm:w-3/5">
              <div className="bg-ink dark:bg-night-raised relative aspect-[2/1] w-full overflow-hidden sm:aspect-[3/2]">
                {post.coverImage?.url ? (
                  <Image
                    src={post.coverImage.url}
                    alt={post.coverImage.alt || post.title}
                    fill
                    priority
                    sizes="(min-width: 40rem) 23rem, 100vw"
                    className="object-cover"
                    style={{ objectPosition: position }}
                  />
                ) : (
                  <CoverFallback />
                )}
              </div>
              <figcaption>
                <MediaCredit
                  copyright={post.coverImage?.copyright}
                  creator={post.coverImage?.creator}
                  className="mt-2"
                />
              </figcaption>
            </figure>

            {/* `--seite`: Nur hier ist der Artikel die Hauptspalte, nur hier
                dürfen breite Bilder über das Lesemaß hinaustreten. Editorfläche
                und Dashboard-Vorschau teilen dieses Stylesheet, sind aber
                schmale Rahmen — dort bliebe ein Ausbruch ein Fremdkörper.
                `--in-spalte`: Das Maß führt hier die Hülle, sonst rutschte der
                Körper unter dem Float weg. */}
            <div
              className="article-content article-content--seite article-content--in-spalte"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(post.contentHtml),
              }}
            />
          </div>

          {/* Share & Back */}
          <div className="border-rule dark:border-night-rule mx-auto max-w-[65ch] border-t pt-8">
            <Link
              href="/aktuelles"
              className="semi-condensed text-primary-ink dark:text-primary inline-flex min-h-11 items-center gap-2 text-base font-semibold underline-offset-4 hover:underline"
            >
              <ArrowLeftIcon className="h-5 w-5 shrink-0" aria-hidden />
              Zurück zur Übersicht
            </Link>
          </div>
        </div>

        {/* Attached Downloads */}
        {post.attachedDownloads && post.attachedDownloads.length > 0 ? (
          <div className="mt-16">
            <SectionHead
              as="h2"
              id="downloads-heading"
              title="Downloads"
              size="list"
              rule
            />
            <WayList labelledBy="downloads-heading">
              {post.attachedDownloads.map((download) => (
                <WayRow
                  key={download.id}
                  href={download.fileUrl}
                  kind="download"
                  fileType={DOWNLOAD_FILE_TYPE_LABELS[download.fileType]}
                  title={download.title}
                  description={
                    download.description || download.fileSize
                      ? [
                          download.description,
                          download.fileSize
                            ? `${DOWNLOAD_FILE_TYPE_LABELS[download.fileType]} · ${formatFileSize(download.fileSize)}`
                            : DOWNLOAD_FILE_TYPE_LABELS[download.fileType],
                        ]
                          .filter(Boolean)
                          .join(" — ")
                      : undefined
                  }
                />
              ))}
            </WayList>
          </div>
        ) : null}
      </PageSection>

      {/* Similar Posts */}
      {relatedPosts.length > 0 ? (
        <PageSection labelledBy="aehnliche-heading" rule>
          <SectionHead id="aehnliche-heading" title="Ähnliche Beiträge" rule />
          <NewsColumns posts={relatedPosts} />
        </PageSection>
      ) : null}

      {/* Image Lightbox */}
      {lightboxImage ? (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          copyright={lightboxImage.copyright}
          creator={lightboxImage.creator}
          onClose={() => setLightboxImage(null)}
        />
      ) : null}
    </PublicPage>
  );
}
