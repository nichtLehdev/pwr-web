"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import type { PermissionKey } from "@/lib/permissions";
import { useToast } from "@/app/_components/ui/toast";
import {
  ContentStatus,
  EventCategory,
  EventEnsembleType,
} from "~/generated/prisma/enums";
import {
  DashboardFormSectionLayout,
  DashboardOverflowMenu,
  DashboardPage,
  EntryExportButton,
  useEntryExport,
} from "@/app/_components/dashboard";
import { Tag, type TagTone } from "@/app/_components/programmheft/tag";
import { ArrowLeftIcon, CheckIcon, Edit, Trash2, XIcon } from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";

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

const ensembleTypeLabels: Record<EventEnsembleType, string> = {
  AUSWAHLCHOR: "Auswahlchor",
  ENSEMBLE: "Ensemble",
  CUSTOM: "Benutzerdefiniert",
};

// Dashboard access is now controlled by permissions

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
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

  const hasApprovePermission = hasPermission("events.approve" as PermissionKey);
  const hasEditPermission =
    hasPermission("events.edit" as PermissionKey) ||
    hasPermission("events.approve" as PermissionKey);

  const {
    data: event,
    isLoading: eventLoading,
    refetch: refetchEvent,
  } = api.events.getById.useQuery(
    { id: eventId },
    { enabled: !!eventId && !!session?.user },
  );

  const approveMutation = api.events.approve.useMutation({
    onSuccess: () => {
      void refetchEvent();
      toast.success("Termin wurde freigegeben");
    },
    onError: (error) => {
      toast.error("Fehler bei der Freigabe: " + error.message);
    },
  });

  const rejectMutation = api.events.reject.useMutation({
    onSuccess: () => {
      void refetchEvent();
      setShowRejectModal(false);
      setReviewNotes("");
      toast.success("Termin wurde abgelehnt");
    },
    onError: (error) => {
      toast.error("Fehler bei der Ablehnung: " + error.message);
    },
  });

  const entryExport = useEntryExport("events", eventId);

  const deleteMutation = api.events.delete.useMutation({
    onSuccess: () => {
      toast.success("Termin erfolgreich gelöscht");
      router.push("/dashboard/events");
    },
    onError: (error) => {
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/events/${eventId}`);
    }
  }, [session, sessionLoading, router, eventId]);

  useEffect(() => {
    if (!permissionsLoading && !hasDashboardAccess && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/");
    }
  }, [permissionsLoading, hasDashboardAccess, router]);

  if (sessionLoading || profileLoading || permissionsLoading || eventLoading) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !event) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-ink dark:text-night-text text-xl font-semibold">
            Termin nicht gefunden
          </h1>
          <Link
            href="/dashboard/events"
            className="text-primary-ink dark:text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const isReviewer = hasApprovePermission;
  const isOwner = event.createdById === session.user.id;
  const canEdit = isOwner || hasEditPermission;
  const canDelete = isOwner || hasEditPermission;
  const canReview = isReviewer && event.status === ContentStatus.PENDING;

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
  const districtLabel = event.bezirk
    ? `Bezirk ${event.bezirk.number} - ${event.bezirk.shortName}`
    : event.districtName || "Übergreifend";
  const locationLabel = event.location
    ? [event.location.name, event.location.city].filter(Boolean).join(", ")
    : "Kein Ort hinterlegt";
  const detailShortlinks = [
    { href: "#event-detail-overview", label: "Überblick" },
    ...(event.downloads?.length
      ? [{ href: "#event-detail-downloads", label: "Downloads" }]
      : []),
    { href: "#event-detail-info", label: "Details" },
    ...(event.description
      ? [{ href: "#event-detail-description", label: "Beschreibung" }]
      : []),
    ...(event.location
      ? [{ href: "#event-detail-location", label: "Ort" }]
      : []),
    ...(event.performingEnsembleType
      ? [{ href: "#event-detail-ensemble", label: "Ensemble" }]
      : []),
    ...(event.openToParticipants
      ? [{ href: "#event-detail-participation", label: "Teilnahme" }]
      : []),
    { href: "#event-detail-pricing", label: "Eintritt" },
    { href: "#event-detail-meta", label: "Infos" },
  ];

  const getEnsembleName = () => {
    if (event.performingEnsembleType === "ENSEMBLE" && event.ensemble) {
      return event.ensemble.name;
    }
    if (event.performingEnsembleType === "AUSWAHLCHOR" && event.auswahlChor) {
      return event.auswahlChor.name;
    }
    if (
      event.performingEnsembleType === "CUSTOM" &&
      event.performingEnsembleName
    ) {
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
    <>
      <DashboardPage
        title={event.title}
        description={event.motto ?? undefined}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Termine", href: "/dashboard/events" },
          { label: event.title },
        ]}
        actions={
          // `w-full sm:w-auto`: Nur über die volle Breite kann `ml-auto` das
          // „…“-Menü auf dem Telefon an den rechten Rand schieben — sein Panel
          // ist rechts verankert.
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {canEdit && (
              <Link
                href={`/dashboard/events/${eventId}/edit`}
                className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 border px-4 py-2 text-sm font-medium transition-colors"
              >
                <Edit className="h-4 w-4" />
                Bearbeiten
              </Link>
            )}
            {entryExport.canExport && (
              <EntryExportButton exporter={entryExport} />
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
            {/* Auf dem Telefon steht der Export im „…“-Menü (siehe
                EntryExportButton); ab sm als Knopf vor „Löschen“, damit die
                zerstörerische Aktion am Ende der Reihe bleibt. */}
            {entryExport.canExport && (
              <DashboardOverflowMenu
                className="ml-auto sm:hidden"
                items={[entryExport.menuItem]}
              />
            )}
          </div>
        }
        maxWidth="7xl"
      >
        {/* Status Badge */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Tag tone={statusTones[event.status]} className="shrink-0">
            {statusLabels[event.status]}
          </Tag>
        </div>

        <section
          id="event-detail-overview"
          className="dashboard-form-scroll-anchor mb-8"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="dark:bg-night-raised bg-rule/25 p-3">
              <p className="text-dark dark:text-night-muted text-xs font-medium tracking-wide uppercase">
                Termin
              </p>
              <p className="text-ink dark:text-night-text mt-1 text-sm font-semibold">
                {formattedDate}
              </p>
              <p className="text-dark dark:text-night-muted text-xs">
                {formattedTime} Uhr
              </p>
            </div>
            <div className="dark:bg-night-raised bg-rule/25 p-3">
              <p className="text-dark dark:text-night-muted text-xs font-medium tracking-wide uppercase">
                Bezirk
              </p>
              <p className="text-ink dark:text-night-text mt-1 text-sm font-semibold">
                {districtLabel}
              </p>
            </div>
            <div className="dark:bg-night-raised bg-rule/25 p-3">
              <p className="text-dark dark:text-night-muted text-xs font-medium tracking-wide uppercase">
                Kategorie
              </p>
              <p className="text-ink dark:text-night-text mt-1 text-sm font-semibold">
                {categoryLabels[event.category]}
              </p>
            </div>
            <div className="dark:bg-night-raised bg-rule/25 p-3">
              <p className="text-dark dark:text-night-muted text-xs font-medium tracking-wide uppercase">
                Ort
              </p>
              <p className="text-ink dark:text-night-text mt-1 text-sm font-semibold">
                {locationLabel}
              </p>
            </div>
          </div>
        </section>

        {/* Cancelled Banner */}
        {event.cancelled && (
          <div className="mb-6 bg-red-50 p-4 dark:bg-red-900/20">
            <p className="font-medium text-red-800 dark:text-red-300">
              ⚠️ Diese Veranstaltung wurde abgesagt.
            </p>
          </div>
        )}

        {/* Review Section (for reviewers with pending events) */}
        {canReview && (
          <section className="border-rule dark:border-night-rule mb-8 border-2 p-6">
            <h2 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
              Prüfung
            </h2>
            <div className="space-y-4">
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
                  disabled={approveMutation.isPending}
                  className="hover:bg-primary-dark bg-primary text-ink inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
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
                  <XIcon className="h-4 w-4" />
                  Ablehnen
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Review Notes (if exists) */}
        {event.reviewNotes && event.status !== ContentStatus.PENDING && (
          <section className="border-rule dark:border-night-rule border-t pt-10">
            <h2 className="text-ink dark:text-night-text mb-3 text-lg font-semibold">
              Prüfungsanmerkungen
            </h2>
            <p className="text-ink dark:text-night-muted">
              {event.reviewNotes}
            </p>
            {event.reviewer && (
              <p className="text-dark dark:text-night-muted mt-2 text-sm">
                — {event.reviewer.displayName}
                {event.reviewDate && (
                  <>
                    , {new Date(event.reviewDate).toLocaleDateString("de-DE")}
                  </>
                )}
              </p>
            )}
          </section>
        )}

        {/* Event Details */}
        <DashboardFormSectionLayout
          className="lg:grid lg:grid-cols-[minmax(0,1fr)_10.5rem] lg:items-start lg:gap-10 lg:pt-4 xl:gap-14"
          railClassName="dashboard-sticky-shell-top lg:sticky lg:block lg:self-start"
          railItems={detailShortlinks}
        >
          <div className="space-y-0">
            {/* Cover Image */}
            {event.coverImage && (
              <section className="border-rule dark:border-night-rule mb-10 overflow-hidden border">
                <div className="relative aspect-video w-full">
                  <Image
                    src={event.coverImage.url}
                    alt={event.coverImage.alt || event.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </section>
            )}

            {/* Downloads */}
            {event.downloads && event.downloads.length > 0 && (
              <section
                id="event-detail-downloads"
                className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
              >
                <h2 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
                  Downloads
                </h2>
                <div className="space-y-2">
                  {event.downloads.map((ed) => (
                    <a
                      key={ed.download.id}
                      href={ed.download.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-ink dark:text-primary border-rule dark:border-night-rule dark:hover:bg-night-raised hover:bg-rule/25 flex items-center gap-3 border p-3 transition-colors"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="font-medium text-inherit">
                        {ed.download.title}
                      </span>
                      {ed.download.description && (
                        <span className="text-dark dark:text-night-muted ml-auto text-sm">
                          {ed.download.description}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Basic Info */}
            <section
              id="event-detail-info"
              className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
            >
              <h2 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
                Veranstaltungsdetails
              </h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-dark dark:text-night-muted text-sm font-medium">
                    Datum
                  </dt>
                  <dd className="text-ink dark:text-night-text mt-1">
                    {formattedDate}
                  </dd>
                </div>
                <div>
                  <dt className="text-dark dark:text-night-muted text-sm font-medium">
                    Uhrzeit
                  </dt>
                  <dd className="text-ink dark:text-night-text mt-1">
                    {formattedTime} Uhr
                  </dd>
                </div>
                <div>
                  <dt className="text-dark dark:text-night-muted text-sm font-medium">
                    Kategorie
                  </dt>
                  <dd className="text-ink dark:text-night-text mt-1">
                    {categoryLabels[event.category]}
                  </dd>
                </div>
                <div>
                  <dt className="text-dark dark:text-night-muted text-sm font-medium">
                    Bezirk
                  </dt>
                  <dd className="text-ink dark:text-night-text mt-1">
                    {event.bezirk
                      ? `Bezirk ${event.bezirk.number} – ${event.bezirk.shortName}`
                      : event.districtName || "Übergreifend"}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Description */}
            {event.description && (
              <section
                id="event-detail-description"
                className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
              >
                <h2 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
                  Beschreibung
                </h2>
                <p className="text-ink dark:text-night-muted whitespace-pre-wrap">
                  {event.description}
                </p>
              </section>
            )}

            {/* Location */}
            {event.location && (
              <section
                id="event-detail-location"
                className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
              >
                <h2 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
                  Veranstaltungsort
                </h2>
                <address className="text-ink dark:text-night-muted not-italic">
                  {event.location.name && (
                    <span className="text-ink dark:text-night-text block font-medium">
                      {event.location.name}
                    </span>
                  )}
                  {event.location.street && (
                    <span className="text-ink dark:text-night-muted block">
                      {event.location.street}
                    </span>
                  )}
                  <span className="text-ink dark:text-night-muted block">
                    {event.location.zipCode && `${event.location.zipCode} `}
                    {event.location.city}
                  </span>
                  {event.location.additionalInfo && (
                    <span className="text-dark dark:text-night-muted mt-2 block text-sm">
                      {event.location.additionalInfo}
                    </span>
                  )}
                </address>
              </section>
            )}

            {/* Performing Ensemble */}
            {event.performingEnsembleType && (
              <section
                id="event-detail-ensemble"
                className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
              >
                <h2 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
                  Auftretendes Ensemble
                </h2>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-dark dark:text-night-muted text-sm font-medium">
                      Typ
                    </dt>
                    <dd className="text-ink dark:text-night-text mt-1">
                      {ensembleTypeLabels[event.performingEnsembleType]}
                    </dd>
                  </div>
                  {getEnsembleName() && (
                    <div>
                      <dt className="text-dark dark:text-night-muted text-sm font-medium">
                        Name
                      </dt>
                      <dd className="text-ink dark:text-night-text mt-1">
                        {getEnsembleName()}
                      </dd>
                    </div>
                  )}
                  {event.leitung && (
                    <div>
                      <dt className="text-dark dark:text-night-muted text-sm font-medium">
                        Leitung
                      </dt>
                      <dd className="text-ink dark:text-night-text mt-1">
                        {event.leitung}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {/* Participation */}
            {event.openToParticipants && (
              <section
                id="event-detail-participation"
                className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
              >
                <h2 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
                  Teilnahme
                </h2>
                <p className="text-ink dark:text-night-muted">
                  {event.participationInfo ||
                    "Offen für externe Teilnehmer / Mitwirkende"}
                </p>
              </section>
            )}

            {/* Pricing */}
            <section
              id="event-detail-pricing"
              className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
            >
              <h2 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
                Eintritt
              </h2>
              <div className="space-y-3">
                <p className="text-ink dark:text-night-text">
                  {event.isFree ? "Eintritt frei" : "Mit Eintritt"}
                </p>
                {event.priceInfo && (
                  <p className="text-ink dark:text-night-muted">
                    {event.priceInfo}
                  </p>
                )}
                {event.priceOptions && event.priceOptions.length > 0 && (
                  <div className="mt-3">
                    <h3 className="text-dark dark:text-night-muted mb-2 text-sm font-medium">
                      Preiskategorien
                    </h3>
                    <ul className="space-y-2">
                      {event.priceOptions.map((option) => (
                        <li
                          key={option.id}
                          className="dark:bg-night-raised bg-rule/25 flex items-center justify-between px-3 py-2"
                        >
                          <div>
                            <span className="text-ink dark:text-night-text font-medium">
                              {option.label}
                            </span>
                            {option.description && (
                              <span className="text-dark dark:text-night-muted ml-2 text-sm">
                                – {option.description}
                              </span>
                            )}
                          </div>
                          <span className="text-ink dark:text-night-text font-semibold">
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
            <section
              id="event-detail-meta"
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
                    {event.createdBy?.displayName || "Unbekannt"}
                  </dd>
                </div>
                <div>
                  <dt className="text-dark dark:text-night-muted text-sm font-medium">
                    Erstellt am
                  </dt>
                  <dd className="text-ink dark:text-night-text mt-1">
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
                      <dt className="text-dark dark:text-night-muted text-sm font-medium">
                        Geprüft von
                      </dt>
                      <dd className="text-ink dark:text-night-text mt-1">
                        {event.reviewer.displayName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-dark dark:text-night-muted text-sm font-medium">
                        Geprüft am
                      </dt>
                      <dd className="text-ink dark:text-night-text mt-1">
                        {event.reviewDate
                          ? new Date(event.reviewDate).toLocaleDateString(
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
                {event.publishedAt && (
                  <div>
                    <dt className="text-dark dark:text-night-muted text-sm font-medium">
                      Veröffentlicht am
                    </dt>
                    <dd className="text-ink dark:text-night-text mt-1">
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
                  <dt className="text-dark dark:text-night-muted text-sm font-medium">
                    Zuletzt aktualisiert
                  </dt>
                  <dd className="text-ink dark:text-night-text mt-1">
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
        </DashboardFormSectionLayout>

        {/* Back Link */}
        <div className="mt-8">
          <Link
            href="/dashboard/events"
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
                Termin ablehnen
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
                Termin löschen
              </h3>
              <p className="text-dark dark:text-night-muted mb-4">
                Bist du sicher, dass du diesen Termin löschen möchtest? Diese
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
