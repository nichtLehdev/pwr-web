"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import {
  ContentStatus,
  PostCategory,
  UserRole,
} from "~/generated/prisma/enums";
import "@/styles/article-content.css";

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

const statusColors: Record<ContentStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  PENDING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  ARCHIVED: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

// Roles that can review posts
const REVIEWER_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.LPW, UserRole.RPW];

// Roles that have access to the dashboard
const DASHBOARD_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.LPW,
  UserRole.RPW,
  UserRole.OBLEUTE,
];

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  // Review state
  const [reviewNotes, setReviewNotes] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Fetch user profile for role
  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, { enabled: !!session?.user });

  // Fetch post data
  const {
    data: post,
    isLoading: postLoading,
    refetch: refetchPost,
  } = api.posts.getById.useQuery(
    { id: postId },
    { enabled: !!postId && !!session?.user },
  );

  // Mutations
  const approveMutation = api.posts.approve.useMutation({
    onSuccess: () => {
      void refetchPost();
    },
  });

  const rejectMutation = api.posts.reject.useMutation({
    onSuccess: () => {
      void refetchPost();
      setShowRejectModal(false);
      setReviewNotes("");
    },
  });

  const deleteMutation = api.posts.delete.useMutation({
    onSuccess: () => {
      router.push("/dashboard/posts");
    },
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!sessionLoading && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/posts/${postId}`);
    }
  }, [session, sessionLoading, router, postId]);

  // Redirect if user doesn't have dashboard access
  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!DASHBOARD_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        router.push("/");
      }
    }
  }, [profile, profileLoading, router]);

  // Loading state
  if (sessionLoading || profileLoading || postLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !post) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Beitrag nicht gefunden
          </h1>
          <Link
            href="/dashboard/posts"
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const userRole = profile.role;
  const isReviewer = REVIEWER_ROLES.includes(userRole);
  const isOwner = post.createdById === session.user.id;
  const canEdit =
    isOwner || userRole === UserRole.ADMIN || userRole === UserRole.LPW;
  const canDelete =
    isOwner || userRole === UserRole.ADMIN || userRole === UserRole.LPW;
  const canReview = isReviewer && post.status === ContentStatus.PENDING;

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
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/dashboard"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Dashboard
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href="/dashboard/posts"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Beiträge
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text max-w-[200px] truncate text-gray-900">
              {post.title}
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="dark:text-dark-text text-2xl font-bold wrap-break-word text-gray-900 sm:text-3xl">
                {post.title}
              </h1>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusColors[post.status]}`}
              >
                {statusLabels[post.status]}
              </span>
              {post.pinned && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  <svg
                    className="h-3 w-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Gepinnt
                </span>
              )}
            </div>
            {post.excerpt && (
              <p className="dark:text-dark-muted mt-2 text-lg text-gray-600">
                {post.excerpt}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Link
                href={`/dashboard/posts/${postId}/edit`}
                className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Bearbeiten
              </Link>
            )}
            {canDelete && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="dark:bg-dark-surface inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Löschen
              </button>
            )}
          </div>
        </div>

        {/* Review Section (for reviewers with pending posts) */}
        {canReview && (
          <section className="mb-6 rounded-lg border-2 border-yellow-300 bg-yellow-50 p-6 dark:border-yellow-600 dark:bg-yellow-900/20">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Prüfung
            </h2>
            <div className="space-y-4">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Anmerkungen (optional für Genehmigung, erforderlich für
                  Ablehnung)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Anmerkungen zur Prüfung..."
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {approveMutation.isPending
                    ? "Wird genehmigt..."
                    : "Genehmigen"}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Ablehnen
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Review Notes (if exists) */}
        {post.reviewNotes && post.status !== ContentStatus.PENDING && (
          <section className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-3 text-lg font-semibold text-gray-900">
              Prüfungsanmerkungen
            </h2>
            <p className="dark:text-dark-muted text-gray-700">
              {post.reviewNotes}
            </p>
            {post.reviewer && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                — {post.reviewer.displayName}
                {post.reviewDate && (
                  <>, {new Date(post.reviewDate).toLocaleDateString("de-DE")}</>
                )}
              </p>
            )}
          </section>
        )}

        {/* Post Details */}
        <div className="space-y-6">
          {/* Basic Info */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Beitragsdetails
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Kategorie
                </dt>
                <dd className="dark:text-dark-text mt-1 text-gray-900">
                  {categoryLabels[post.category]}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Bezirk
                </dt>
                <dd className="dark:text-dark-text mt-1 text-gray-900">
                  {post.bezirk
                    ? `Bezirk ${post.bezirk.number} – ${post.bezirk.shortName}`
                    : "Übergreifend"}
                </dd>
              </div>
            </dl>
          </section>

          {/* Cover Image */}
          {post.coverImage && (
            <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                Titelbild
              </h2>
              <div className="relative aspect-video w-full overflow-hidden rounded-lg">
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
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Inhalt
            </h2>
            {post.contentHtml ? (
              <div
                className="article-content"
                dangerouslySetInnerHTML={{ __html: post.contentHtml }}
              />
            ) : (
              <pre className="dark:text-dark-muted font-sans whitespace-pre-wrap text-gray-700">
                {post.content}
              </pre>
            )}
          </section>

          {/* Markdown Source */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Markdown-Quelltext
            </h2>
            <pre className="dark:bg-dark-background-secondary overflow-x-auto rounded-lg bg-gray-50 p-4 font-mono text-sm text-gray-700 dark:text-gray-300">
              {post.content}
            </pre>
          </section>

          {/* Meta Info */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Informationen
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Erstellt von
                </dt>
                <dd className="dark:text-dark-text mt-1 text-gray-900">
                  {post.createdBy?.displayName || "Unbekannt"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Erstellt am
                </dt>
                <dd className="dark:text-dark-text mt-1 text-gray-900">
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
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Geprüft von
                    </dt>
                    <dd className="dark:text-dark-text mt-1 text-gray-900">
                      {post.reviewer.displayName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Geprüft am
                    </dt>
                    <dd className="dark:text-dark-text mt-1 text-gray-900">
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
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Veröffentlicht am
                  </dt>
                  <dd className="dark:text-dark-text mt-1 text-gray-900">
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
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Zuletzt aktualisiert
                </dt>
                <dd className="dark:text-dark-text mt-1 text-gray-900">
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

        {/* Back Link */}
        <div className="mt-8">
          <Link
            href="/dashboard/posts"
            className="hover:text-primary dark:text-dark-muted dark:hover:text-primary inline-flex items-center gap-2 text-sm font-medium text-gray-600"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Zurück zur Übersicht
          </Link>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="dark:bg-dark-surface w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Beitrag ablehnen
            </h3>
            <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
              Bitte gib einen Grund für die Ablehnung an. Der Ersteller wird
              benachrichtigt.
            </p>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={4}
              placeholder="Begründung für die Ablehnung..."
              className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text mb-4 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
              required
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setReviewNotes("");
                }}
                className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={handleReject}
                disabled={!reviewNotes.trim() || rejectMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMutation.isPending ? "Wird abgelehnt..." : "Ablehnen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="dark:bg-dark-surface w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Beitrag löschen
            </h3>
            <p className="dark:text-dark-muted mb-4 text-gray-600">
              Bist du sicher, dass du diesen Beitrag löschen möchtest? Diese
              Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Wird gelöscht..." : "Löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
