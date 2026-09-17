"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import type { PermissionKey } from "@/lib/permissions";
import { ContentStatus, PostCategory } from "~/generated/prisma/enums";
import "@/styles/article-content.css";
import { useToast } from "@/app/_components/ui/toast";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  Edit,
  Trash2,
  PinIcon,
  AlertTriangleIcon,
  CheckIcon,
  TrashIcon,
  DownloadIcon,
} from "lucide-react";
import {
  DashboardFormSectionLayout,
  DashboardPage,
} from "@/app/_components/dashboard";
import { Tag, type TagTone } from "@/app/_components/programmheft/tag";
import { ArrowLeftIcon, EyeIcon } from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";

const categoryLabels: Record<PostCategory, string> = {
  MAGAZIN: "Magazin",
  EVENT: "Event",
  AUSBILDUNG: "Ausbildung",
  BEZIRKE: "Bezirke",
  ANDERE: "Andere",
};

const statusLabels: Record<ContentStatus, string> = {
  DRAFT: "Entwurf",
  PENDING: "Ausstehend",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

// Etikett statt pastelliger Pille: Zustaende sind rechteckige Druckflaechen
// (siehe Tag-Komponente). Spiegelt die Zuordnung aus content-status.tsx —
// derselbe Status muss ueberall gleich aussehen. Tag hat inzwischen einen
// fuenften, umrandeten Ton: Entwurf und Archiviert sind Ruhezustaende ohne
// Handlungsbedarf und standen bisher so laut gefuellt wie "Veroeffentlicht".
const statusTones: Record<ContentStatus, TagTone> = {
  DRAFT: "muted",
  PENDING: "orange",
  APPROVED: "ink",
  REJECTED: "cancelled",
  ARCHIVED: "muted",
};

// Dashboard access is now controlled by permissions

export default function PostDetailPage() {
  const router = useRouter();
  const toast = useToast();
  const params = useParams();
  const postId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  const [reviewNotes, setReviewNotes] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, { enabled: !!session?.user });

  const {
    hasDashboardAccess,
    hasPermission,
    isLoading: permissionsLoading,
  } = usePermissions();

  const hasApprovePermission = hasPermission("posts.approve" as PermissionKey);
  const hasEditPermission =
    hasPermission("posts.edit" as PermissionKey) ||
    hasPermission("posts.approve" as PermissionKey);

  const {
    data: post,
    isLoading: postLoading,
    refetch: refetchPost,
  } = api.posts.getById.useQuery(
    { id: postId },
    { enabled: !!postId && !!session?.user },
  );

  const { data: attachedContent, refetch: refetchAttachedContent } =
    api.posts.getAttachedContent.useQuery(
      { postId },
      {
        enabled: !!postId && !!profile && hasApprovePermission,
      },
    );

  const approveMutation = api.posts.approve.useMutation({
    onSuccess: () => {
      toast.success("Beitrag genehmigt");
      void refetchPost();
    },
  });

  const rejectMutation = api.posts.reject.useMutation({
    onSuccess: () => {
      toast.warning("Beitrag abgelehnt");
      void refetchPost();
      setShowRejectModal(false);
      setReviewNotes("");
    },
  });

  const deleteMutation = api.posts.delete.useMutation({
    onSuccess: () => {
      toast.success("Beitrag gelöscht");
      router.push("/dashboard/posts");
    },
  });

  const approveDownloadMutation = api.materials.reviewDownload.useMutation({
    onSuccess: () => {
      toast.success("Download freigegeben");
      void refetchAttachedContent();
      void refetchPost();
    },
  });

  const approveMediaMutation = api.media.review.useMutation({
    onSuccess: () => {
      toast.success("Medium freigegeben");
      void refetchAttachedContent();
      void refetchPost();
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/posts/${postId}`);
    }
  }, [session, sessionLoading, router, postId]);

  useEffect(() => {
    if (!permissionsLoading && !hasDashboardAccess && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/");
    }
  }, [permissionsLoading, hasDashboardAccess, router]);

  if (sessionLoading || profileLoading || permissionsLoading || postLoading) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !post) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-ink dark:text-night-text text-xl font-semibold">
            Beitrag nicht gefunden
          </h1>
          <Link
            href="/dashboard/posts"
            className="text-primary-ink dark:text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const isReviewer = hasApprovePermission;
  const isOwner = post.createdById === session.user.id;
  const canEdit = isOwner || hasEditPermission;
  const canDelete = isOwner || hasEditPermission;
  const canReview = isReviewer && post.status === ContentStatus.PENDING;

  const hasPendingDownloads =
    attachedContent?.downloads.some(
      (d) => d.status !== ContentStatus.APPROVED,
    ) ?? false;
  const hasPendingMedia =
    attachedContent?.media.some((m) => m.status !== ContentStatus.APPROVED) ??
    false;
  const hasPendingCoverImage =
    post.coverImage?.status !== ContentStatus.APPROVED &&
    post.coverImage?.status !== undefined;
  const hasUnapprovedContent =
    hasPendingDownloads || hasPendingMedia || hasPendingCoverImage;
  const detailShortlinks = [
    { href: "#post-detail-overview", label: "Überblick" },
    ...(isReviewer && attachedContent
      ? [{ href: "#post-detail-attached", label: "Anhaenge" }]
      : []),
    { href: "#post-detail-info", label: "Details" },
    ...(post.coverImage
      ? [{ href: "#post-detail-cover", label: "Titelbild" }]
      : []),
    { href: "#post-detail-content", label: "Inhalt" },
    { href: "#post-detail-meta", label: "Infos" },
  ];

  const handleApprove = () => {
    approveMutation.mutate({
      id: postId,
      reviewNotes: reviewNotes || undefined,
    });
  };

  const handleReject = () => {
    if (!reviewNotes.trim()) {
      return;
    }
    rejectMutation.mutate({
      id: postId,
      reviewNotes: reviewNotes,
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate({ id: postId });
  };

  return (
    <>
      <DashboardPage
        title={post.title}
        description={post.excerpt ?? undefined}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Beiträge", href: "/dashboard/posts" },
          { label: post.title },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Link
                href={`/dashboard/posts/${postId}/edit`}
                className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 border px-4 py-2 text-sm font-medium transition-colors"
              >
                <Edit className="h-4 w-4" />
                Bearbeiten
              </Link>
            )}
            {canDelete && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="dark:bg-night bg-paper inline-flex min-h-11 items-center gap-2 border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
                Löschen
              </button>
            )}
          </div>
        }
        maxWidth="7xl"
      >
        {/* Status Badges */}
        <div
          id="post-detail-overview"
          className="dashboard-form-scroll-anchor mb-5 flex flex-wrap items-center gap-3"
        >
          <Tag tone={statusTones[post.status]} className="shrink-0">
            {statusLabels[post.status]}
          </Tag>
          {post.pinned && (
            <Tag tone="orange" className="shrink-0 gap-1">
              <PinIcon className="h-3 w-3" />
              Gepinnt
            </Tag>
          )}
        </div>

        {/* Review Section (for reviewers with pending posts) */}
        {canReview && (
          <section className="border-rule dark:border-night-rule mb-6 border-2 p-6">
            <h2 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
              Prüfung
            </h2>
            <div className="space-y-4">
              {/* Warning if there's unapproved content */}
              {hasUnapprovedContent && (
                <div className="flex items-start gap-3 border border-red-300 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/20">
                  <AlertTriangleIcon className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      Nicht alle Inhalte sind freigegeben
                    </p>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                      Bitte gib zuerst alle angehängten Downloads, Medien und
                      das Titelbild frei, bevor du den Beitrag genehmigst.
                    </p>
                  </div>
                </div>
              )}
              <div>
                <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                  Anmerkungen (optional für Genehmigung, erforderlich für
                  Ablehnung)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Anmerkungen zur Prüfung..."
                  className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending || hasUnapprovedContent}
                  title={
                    hasUnapprovedContent
                      ? "Alle Inhalte müssen zuerst freigegeben werden"
                      : undefined
                  }
                  className="hover:bg-primary-dark bg-primary text-ink inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckIcon className="h-4 w-4" />
                  {approveMutation.isPending
                    ? "Wird genehmigt..."
                    : "Genehmigen"}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="inline-flex min-h-11 items-center gap-2 bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  <TrashIcon className="h-4 w-4" />
                  Ablehnen
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Attached Content Section (for reviewers) */}
        {isReviewer && attachedContent && (
          <section
            id="post-detail-attached"
            className="dashboard-form-scroll-anchor border-rule dark:border-night-rule mb-8 border-t pt-10"
          >
            <h2 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
              Angehängte Inhalte
            </h2>

            {attachedContent.downloads.length === 0 &&
              attachedContent.media.length === 0 && (
                <p className="text-dark dark:text-night-muted text-sm">
                  Keine Downloads oder Medien im Inhalt gefunden.
                </p>
              )}

            {/* Downloads */}
            {attachedContent.downloads.length > 0 && (
              <div className="mb-4">
                <h3 className="text-ink dark:text-night-text mb-2 text-sm font-medium">
                  Downloads ({attachedContent.downloads.length})
                </h3>
                <div className="space-y-2">
                  {attachedContent.downloads.map((download) => (
                    <div
                      key={download.id}
                      className="border-rule dark:border-night-rule dark:bg-night-raised bg-rule/25 flex items-center justify-between border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {download.fileType === "PDF"
                            ? "📄"
                            : download.fileType === "DOCX"
                              ? "📝"
                              : download.fileType === "XLSX"
                                ? "📊"
                                : download.fileType === "ZIP"
                                  ? "📦"
                                  : download.fileType === "MP3"
                                    ? "🎵"
                                    : "📁"}
                        </span>
                        <div>
                          <p className="text-ink dark:text-night-text text-sm font-medium">
                            {download.title}
                          </p>
                          <p className="text-dark dark:text-night-muted text-xs">
                            {download.uploadedBy?.displayName ?? "Unbekannt"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Download button */}
                        <a
                          href={download.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-ink text-paper hover:bg-dark inline-flex min-h-6 items-center gap-1 px-2 py-1 text-xs font-medium"
                          title="Herunterladen"
                        >
                          <DownloadIcon className="h-3 w-3" />
                          Öffnen
                        </a>
                        <Tag tone={statusTones[download.status]}>
                          {statusLabels[download.status]}
                        </Tag>
                        {download.status === ContentStatus.PENDING && (
                          <button
                            onClick={() =>
                              approveDownloadMutation.mutate({
                                id: download.id,
                                status: ContentStatus.APPROVED,
                              })
                            }
                            disabled={approveDownloadMutation.isPending}
                            className="hover:bg-primary-dark bg-primary text-ink inline-flex min-h-6 items-center gap-1 px-2 py-1 text-xs font-medium disabled:opacity-50"
                          >
                            <CheckIcon className="h-3 w-3" />
                            Freigeben
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Media */}
            {attachedContent.media.length > 0 && (
              <div>
                <h3 className="text-ink dark:text-night-text mb-2 text-sm font-medium">
                  Medien ({attachedContent.media.length})
                </h3>
                <div className="space-y-3">
                  {attachedContent.media.map((media) => (
                    <div
                      key={media.id}
                      className="border-rule dark:border-night-rule dark:bg-night-raised bg-rule/25 border p-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {media.mimeType.startsWith("image/") ? (
                            <a
                              href={media.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative block"
                              title="Bild in neuem Tab öffnen"
                            >
                              <Image
                                src={media.url}
                                alt={media.name}
                                width={80}
                                height={80}
                                className="object-cover transition-opacity group-hover:opacity-75"
                              />
                              <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                <EyeIcon className="h-6 w-6 text-white" />
                              </span>
                            </a>
                          ) : (
                            <span className="text-2xl">📎</span>
                          )}
                          <div>
                            <p className="text-ink dark:text-night-text text-sm font-medium">
                              {media.name}
                            </p>
                            {media.mimeType.startsWith("image/") && (
                              <a
                                href={media.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-ink dark:text-primary text-xs underline"
                              >
                                In neuem Tab öffnen
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Tag tone={statusTones[media.status]}>
                            {statusLabels[media.status]}
                          </Tag>
                          {media.status === ContentStatus.PENDING && (
                            <button
                              onClick={() =>
                                approveMediaMutation.mutate({
                                  id: media.id,
                                  status: ContentStatus.APPROVED,
                                })
                              }
                              disabled={approveMediaMutation.isPending}
                              className="hover:bg-primary-dark bg-primary text-ink inline-flex min-h-6 items-center gap-1 px-2 py-1 text-xs font-medium disabled:opacity-50"
                            >
                              <CheckIcon className="h-3 w-3" />
                              Freigeben
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Review Notes (if exists) */}
        {post.reviewNotes && post.status !== ContentStatus.PENDING && (
          <section className="border-rule dark:border-night-rule mb-8 border-t pt-10">
            <h2 className="text-ink dark:text-night-text mb-3 text-lg font-semibold">
              Prüfungsanmerkungen
            </h2>
            <p className="text-ink dark:text-night-muted">{post.reviewNotes}</p>
            {post.reviewer && (
              <p className="text-dark dark:text-night-muted mt-2 text-sm">
                — {post.reviewer.displayName}
                {post.reviewDate && (
                  <>, {new Date(post.reviewDate).toLocaleDateString("de-DE")}</>
                )}
              </p>
            )}
          </section>
        )}

        {/* Post Details */}
        <DashboardFormSectionLayout
          className="lg:grid lg:grid-cols-[minmax(0,1fr)_10.5rem] lg:items-start lg:gap-10 lg:pt-4 xl:gap-14"
          railClassName="dashboard-sticky-shell-top lg:sticky lg:block lg:self-start"
          railItems={detailShortlinks}
        >
          <div className="space-y-0">
            {/* Basic Info */}
            <section
              id="post-detail-info"
              className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
            >
              <h2 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
                Beitragsdetails
              </h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-dark dark:text-night-muted text-sm font-medium">
                    Kategorie
                  </dt>
                  <dd className="text-ink dark:text-night-text mt-1">
                    {categoryLabels[post.category]}
                  </dd>
                </div>
                <div>
                  <dt className="text-dark dark:text-night-muted text-sm font-medium">
                    Bezirk
                  </dt>
                  <dd className="text-ink dark:text-night-text mt-1">
                    {post.bezirk
                      ? `Bezirk ${post.bezirk.number} – ${post.bezirk.shortName}`
                      : "Übergreifend"}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Cover Image */}
            {post.coverImage && (
              <section
                id="post-detail-cover"
                className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-ink dark:text-night-text text-lg font-semibold">
                    Titelbild
                  </h2>
                  {isReviewer && post.coverImage.status && (
                    <div className="flex items-center gap-2">
                      <Tag tone={statusTones[post.coverImage.status]}>
                        {statusLabels[post.coverImage.status]}
                      </Tag>
                      {post.coverImage.status === ContentStatus.PENDING && (
                        <button
                          onClick={() =>
                            approveMediaMutation.mutate({
                              id: post.coverImage!.id,
                              status: ContentStatus.APPROVED,
                            })
                          }
                          disabled={approveMediaMutation.isPending}
                          className="hover:bg-primary-dark bg-primary text-ink inline-flex min-h-6 items-center gap-1 px-2 py-1 text-xs font-medium disabled:opacity-50"
                        >
                          <CheckIcon className="h-3 w-3" />
                          Freigeben
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="border-rule dark:border-night-rule relative aspect-video w-full overflow-hidden border">
                  <Image
                    src={post.coverImage.url}
                    alt={post.coverImage.alt || post.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </section>
            )}

            {/* Content */}
            <section
              id="post-detail-content"
              className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
            >
              <h2 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
                Inhalt
              </h2>
              {post.contentHtml ? (
                <div
                  className="article-content"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(post.contentHtml),
                  }}
                />
              ) : (
                <pre className="text-ink dark:text-night-muted font-sans whitespace-pre-wrap">
                  {post.content}
                </pre>
              )}
            </section>

            {/* Markdown Source */}
            <section className="border-rule dark:border-night-rule border-t pt-10">
              <h2 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
                Markdown-Quelltext
              </h2>
              <pre className="dark:bg-night-raised bg-rule/25 text-ink dark:text-night-text overflow-x-auto p-4 font-mono text-sm">
                {post.content}
              </pre>
            </section>

            {/* Meta Info */}
            <section
              id="post-detail-meta"
              className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
            >
              <h2 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
                Informationen
              </h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-dark dark:text-night-muted text-sm font-medium">
                    Erstellt von
                  </dt>
                  <dd className="text-ink dark:text-night-text mt-1">
                    {post.createdBy?.displayName || "Unbekannt"}
                  </dd>
                </div>
                <div>
                  <dt className="text-dark dark:text-night-muted text-sm font-medium">
                    Erstellt am
                  </dt>
                  <dd className="text-ink dark:text-night-text mt-1">
                    {new Date(post.createdAt).toLocaleDateString("de-DE", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </dd>
                </div>
                {post.reviewer && (
                  <>
                    <div>
                      <dt className="text-dark dark:text-night-muted text-sm font-medium">
                        Geprüft von
                      </dt>
                      <dd className="text-ink dark:text-night-text mt-1">
                        {post.reviewer.displayName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-dark dark:text-night-muted text-sm font-medium">
                        Geprüft am
                      </dt>
                      <dd className="text-ink dark:text-night-text mt-1">
                        {post.reviewDate
                          ? new Date(post.reviewDate).toLocaleDateString(
                              "de-DE",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                          : "–"}
                      </dd>
                    </div>
                  </>
                )}
                {post.publishedAt && (
                  <div>
                    <dt className="text-dark dark:text-night-muted text-sm font-medium">
                      Veröffentlicht am
                    </dt>
                    <dd className="text-ink dark:text-night-text mt-1">
                      {new Date(post.publishedAt).toLocaleDateString("de-DE", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-dark dark:text-night-muted text-sm font-medium">
                    Zuletzt aktualisiert
                  </dt>
                  <dd className="text-ink dark:text-night-text mt-1">
                    {new Date(post.updatedAt).toLocaleDateString("de-DE", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </DashboardFormSectionLayout>

        {/* Back Link */}
        <div className="mt-8">
          <Link
            href="/dashboard/posts"
            className="text-dark dark:text-night-muted hover:text-primary-ink dark:hover:text-primary inline-flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Zurück zur Übersicht
          </Link>
        </div>
      </DashboardPage>

      {/* Reject Modal */}
      {showRejectModal && (
        <ScrollableModal>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h3 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
                Beitrag ablehnen
              </h3>
              <p className="text-dark dark:text-night-muted mb-4 text-sm">
                Bitte gib einen Grund für die Ablehnung an. Der Ersteller wird
                benachrichtigt.
              </p>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                placeholder="Begründung für die Ablehnung..."
                className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper mb-4 block w-full border px-3 py-2"
                required
              />
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setReviewNotes("");
                  }}
                  className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-11 border px-4 py-2 text-sm font-medium"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleReject}
                  disabled={!reviewNotes.trim() || rejectMutation.isPending}
                  className="min-h-11 bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? "Wird abgelehnt..." : "Ablehnen"}
                </button>
              </div>
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <ScrollableModal>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h3 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
                Beitrag löschen
              </h3>
              <p className="text-dark dark:text-night-muted mb-4">
                Bist du sicher, dass du diesen Beitrag löschen möchtest? Diese
                Aktion kann nicht rückgängig gemacht werden.
              </p>
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-11 border px-4 py-2 text-sm font-medium"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="min-h-11 bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Wird gelöscht..." : "Löschen"}
                </button>
              </div>
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}
    </>
  );
}
