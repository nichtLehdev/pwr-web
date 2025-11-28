"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import {
  ContentStatus,
  EventCategory,
  EventEnsembleType,
  UserRole,
} from "~/generated/prisma/enums";

const categoryLabels: Record<EventCategory, string> = {
  KONZERT: "Konzert",
  GOTTESDIENST: "Gottesdienst",
  PROBE: "Probe",
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
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  ARCHIVED: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

const ensembleTypeLabels: Record<EventEnsembleType, string> = {
  AUSWAHLCHOR: "Auswahlchor",
  ENSEMBLE: "Ensemble",
  CUSTOM: "Benutzerdefiniert",
};

// Roles that can review events
const REVIEWER_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.LPW, UserRole.RPW];

// Roles that have access to the dashboard
const DASHBOARD_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.LPW,
  UserRole.RPW,
  UserRole.OBLEUTE,
];

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  // Review state
  const [reviewNotes, setReviewNotes] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Fetch user profile for role
  const { data: profile, isLoading: profileLoading } = api.users.getMyProfile.useQuery(
    undefined,
    { enabled: !!session?.user },
  );

  // Fetch event data
  const {
    data: event,
    isLoading: eventLoading,
    refetch: refetchEvent,
  } = api.events.getById.useQuery(
    { id: eventId },
    { enabled: !!eventId && !!session?.user },
  );

  // Mutations
  const approveMutation = api.events.approve.useMutation({
    onSuccess: () => {
      void refetchEvent();
    },
  });

  const rejectMutation = api.events.reject.useMutation({
    onSuccess: () => {
      void refetchEvent();
      setShowRejectModal(false);
      setReviewNotes("");
    },
  });

  const deleteMutation = api.events.delete.useMutation({
    onSuccess: () => {
      router.push("/dashboard/events");
    },
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!sessionLoading && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/events/${eventId}`);
    }
  }, [session, sessionLoading, router, eventId]);

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
  if (sessionLoading || profileLoading || eventLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!session || !profile || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-background">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-text">
            Termin nicht gefunden
          </h1>
          <Link
            href="/dashboard/events"
            className="mt-4 inline-block text-primary hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const userRole = profile.role;
  const isReviewer = REVIEWER_ROLES.includes(userRole);
  const isOwner = event.createdById === session.user.id;
  const canEdit = isOwner || userRole === UserRole.ADMIN || userRole === UserRole.LPW;
  const canDelete = isOwner || userRole === UserRole.ADMIN || userRole === UserRole.LPW;
  const canReview = isReviewer && event.status === ContentStatus.PENDING;

  // Format date
  const eventDate = new Date(event.eventDate);
  const formattedDate = eventDate.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedTime = eventDate.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Get ensemble name
  const getEnsembleName = () => {
    if (event.performingEnsembleType === "ENSEMBLE" && event.ensemble) {
      return event.ensemble.name;
    }
    if (event.performingEnsembleType === "AUSWAHLCHOR" && event.auswahlChor) {
      return event.auswahlChor.name;
    }
    if (event.performingEnsembleType === "CUSTOM" && event.performingEnsembleName) {
      return event.performingEnsembleName;
    }
    return null;
  };

  const handleApprove = () => {
    approveMutation.mutate({
      id: eventId,
      reviewNotes: reviewNotes || undefined,
    });
  };

  const handleReject = () => {
    if (!reviewNotes.trim()) {
      return;
    }
    rejectMutation.mutate({
      id: eventId,
      reviewNotes: reviewNotes,
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate({ id: eventId });
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-dark-background">
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-primary dark:text-dark-muted dark:hover:text-primary"
              >
                Dashboard
              </Link>
            </li>
            <li className="text-gray-400 dark:text-dark-muted">/</li>
            <li>
              <Link
                href="/dashboard/events"
                className="text-gray-500 hover:text-primary dark:text-dark-muted dark:hover:text-primary"
              >
                Termine
              </Link>
            </li>
            <li className="text-gray-400 dark:text-dark-muted">/</li>
            <li className="max-w-[200px] truncate text-gray-900 dark:text-dark-text">
              {event.title}
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text sm:text-3xl">
                {event.title}
              </h1>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[event.status]}`}
              >
                {statusLabels[event.status]}
              </span>
            </div>
            {event.motto && (
              <p className="mt-1 text-lg text-gray-600 dark:text-dark-muted">
                {event.motto}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Link
                href={`/dashboard/events/${eventId}/edit`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:hover:bg-gray-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Bearbeiten
              </Link>
            )}
            {canDelete && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-dark-surface dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Löschen
              </button>
            )}
          </div>
        </div>

        {/* Cancelled Banner */}
        {event.cancelled && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <p className="font-medium text-red-800 dark:text-red-300">
              ⚠️ Diese Veranstaltung wurde abgesagt.
            </p>
          </div>
        )}

        {/* Review Section (for reviewers with pending events) */}
        {canReview && (
          <section className="mb-6 rounded-lg border-2 border-yellow-300 bg-yellow-50 p-6 dark:border-yellow-600 dark:bg-yellow-900/20">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Prüfung
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-text">
                  Anmerkungen (optional für Genehmigung, erforderlich für Ablehnung)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Anmerkungen zur Prüfung..."
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {approveMutation.isPending ? "Wird genehmigt..." : "Genehmigen"}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Ablehnen
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Review Notes (if exists) */}
        {event.reviewNotes && event.status !== ContentStatus.PENDING && (
          <section className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Prüfungsanmerkungen
            </h2>
            <p className="text-gray-700 dark:text-dark-muted">{event.reviewNotes}</p>
            {event.reviewer && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                — {event.reviewer.displayName}
                {event.reviewDate && (
                  <>, {new Date(event.reviewDate).toLocaleDateString("de-DE")}</>
                )}
              </p>
            )}
          </section>
        )}

        {/* Event Details */}
        <div className="space-y-6">
          {/* Basic Info */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Veranstaltungsdetails
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Datum
                </dt>
                <dd className="mt-1 text-gray-900 dark:text-dark-text">{formattedDate}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Uhrzeit
                </dt>
                <dd className="mt-1 text-gray-900 dark:text-dark-text">{formattedTime} Uhr</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Kategorie
                </dt>
                <dd className="mt-1 text-gray-900 dark:text-dark-text">
                  {categoryLabels[event.category]}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Bezirk
                </dt>
                <dd className="mt-1 text-gray-900 dark:text-dark-text">
                  {event.bezirk
                    ? `Bezirk ${event.bezirk.number} – ${event.bezirk.shortName}`
                    : event.districtName || "Übergreifend"}
                </dd>
              </div>
            </dl>
          </section>

          {/* Description */}
          {event.description && (
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
                Beschreibung
              </h2>
              <p className="whitespace-pre-wrap text-gray-700 dark:text-dark-muted">
                {event.description}
              </p>
            </section>
          )}

          {/* Location */}
          {event.location && (
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
                Veranstaltungsort
              </h2>
              <address className="not-italic text-gray-700 dark:text-dark-muted">
                {event.location.name && (
                  <span className="block font-medium text-gray-900 dark:text-dark-text">
                    {event.location.name}
                  </span>
                )}
                {event.location.street && <span className="block">{event.location.street}</span>}
                <span className="block">
                  {event.location.zipCode && `${event.location.zipCode} `}
                  {event.location.city}
                </span>
                {event.location.additionalInfo && (
                  <span className="mt-2 block text-sm text-gray-500 dark:text-gray-400">
                    {event.location.additionalInfo}
                  </span>
                )}
              </address>
            </section>
          )}

          {/* Performing Ensemble */}
          {event.performingEnsembleType && (
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
                Auftretendes Ensemble
              </h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Typ</dt>
                  <dd className="mt-1 text-gray-900 dark:text-dark-text">
                    {ensembleTypeLabels[event.performingEnsembleType]}
                  </dd>
                </div>
                {getEnsembleName() && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>
                    <dd className="mt-1 text-gray-900 dark:text-dark-text">{getEnsembleName()}</dd>
                  </div>
                )}
                {event.leitung && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Leitung
                    </dt>
                    <dd className="mt-1 text-gray-900 dark:text-dark-text">{event.leitung}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Participation */}
          {event.openToParticipants && (
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
                Teilnahme
              </h2>
              <p className="text-gray-700 dark:text-dark-muted">
                {event.participationInfo || "Offen für externe Teilnehmer / Mitwirkende"}
              </p>
            </section>
          )}

          {/* Pricing */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Eintritt
            </h2>
            <div className="space-y-3">
              <p className="text-gray-900 dark:text-dark-text">
                {event.isFree ? "Eintritt frei" : "Mit Eintritt"}
              </p>
              {event.priceInfo && (
                <p className="text-gray-700 dark:text-dark-muted">{event.priceInfo}</p>
              )}
              {event.priceOptions && event.priceOptions.length > 0 && (
                <div className="mt-3">
                  <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Preiskategorien
                  </h3>
                  <ul className="space-y-2">
                    {event.priceOptions.map((option) => (
                      <li
                        key={option.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-dark-background-secondary"
                      >
                        <div>
                          <span className="font-medium text-gray-900 dark:text-dark-text">
                            {option.label}
                          </span>
                          {option.description && (
                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                              – {option.description}
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-dark-text">
                          {option.price.toFixed(2)} €
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Meta Info */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Informationen
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Erstellt von
                </dt>
                <dd className="mt-1 text-gray-900 dark:text-dark-text">
                  {event.createdBy?.displayName || "Unbekannt"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Erstellt am
                </dt>
                <dd className="mt-1 text-gray-900 dark:text-dark-text">
                  {new Date(event.createdAt).toLocaleDateString("de-DE", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
              {event.reviewer && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Geprüft von
                    </dt>
                    <dd className="mt-1 text-gray-900 dark:text-dark-text">
                      {event.reviewer.displayName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Geprüft am
                    </dt>
                    <dd className="mt-1 text-gray-900 dark:text-dark-text">
                      {event.reviewDate
                        ? new Date(event.reviewDate).toLocaleDateString("de-DE", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "–"}
                    </dd>
                  </div>
                </>
              )}
              {event.publishedAt && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Veröffentlicht am
                  </dt>
                  <dd className="mt-1 text-gray-900 dark:text-dark-text">
                    {new Date(event.publishedAt).toLocaleDateString("de-DE", {
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
                <dd className="mt-1 text-gray-900 dark:text-dark-text">
                  {new Date(event.updatedAt).toLocaleDateString("de-DE", {
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
            href="/dashboard/events"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary dark:text-dark-muted dark:hover:text-primary"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Zurück zur Übersicht
          </Link>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-dark-surface">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Termin ablehnen
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-dark-muted">
              Bitte gib einen Grund für die Ablehnung an. Der Ersteller wird benachrichtigt.
            </p>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={4}
              placeholder="Begründung für die Ablehnung..."
              className="mb-4 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
              required
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setReviewNotes("");
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-dark-border dark:text-dark-text dark:hover:bg-gray-700"
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
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-dark-surface">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-dark-text">
              Termin löschen
            </h3>
            <p className="mb-4 text-gray-600 dark:text-dark-muted">
              Bist du sicher, dass du diesen Termin löschen möchtest? Diese Aktion kann nicht
              rückgängig gemacht werden.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-dark-border dark:text-dark-text dark:hover:bg-gray-700"
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
