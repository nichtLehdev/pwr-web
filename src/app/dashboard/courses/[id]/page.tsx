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
  CourseCollaboratorRole,
  CourseType,
  RegistrationStatus,
  PaymentStatus,
} from "~/generated/prisma/enums";
import { customFieldTypeNeedsOptions } from "@/lib/course-custom-fields";
import { customFieldTypeLabels } from "@/app/_components/dashboard";
import {
  ArrowRightIcon,
  Edit,
  ExternalLink,
  MailIcon,
  PlusIcon,
  ReceiptTextIcon,
  Trash2,
  UserIcon,
} from "lucide-react";
import { isExternalCourse } from "@/lib/course-external";
import {
  DashboardFormMediaSplit,
  DashboardFormSectionLayout,
  DashboardPage,
} from "@/app/_components/dashboard";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";

const courseTypeLabels: Record<CourseType, string> = {
  LEHRGANG: "Lehrgang",
  FREIZEIT: "Freizeit",
  WORKSHOP: "Workshop",
  KOMPONISTENPORTRAIT: "Komponistenportrait",
  VERANSTALTUNG: "Veranstaltung",
  OTHER: "Sonstiges",
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

const registrationStatusLabels: Record<RegistrationStatus, string> = {
  CONFIRMED: "Bestätigt",
  WAITLIST: "Warteliste",
  CANCELLED: "Storniert",
};

const registrationStatusColors: Record<RegistrationStatus, string> = {
  CONFIRMED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  WAITLIST:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Ausstehend",
  PAID: "Bezahlt",
  REFUNDED: "Erstattet",
};

// Dashboard access is now controlled by permissions

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const [activeTab, setActiveTab] = useState<"details" | "participants">(
    "details",
  );

  const [reviewNotes, setReviewNotes] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, { enabled: !!session?.user });

  const {
    hasDashboardAccess,
    hasPermission,
    hasAnyPermission,
    isLoading: permissionsLoading,
  } = usePermissions();

  const hasApprovePermission = hasPermission(
    "courses.approve" as PermissionKey,
  );
  const hasEditPermission =
    hasPermission("courses.edit" as PermissionKey) ||
    hasPermission("courses.approve" as PermissionKey);
  const hasViewParticipantsPermission = hasAnyPermission([
    "courses.view" as PermissionKey,
    "courses.approve" as PermissionKey,
    "courses.manage" as PermissionKey,
  ]);
  const hasManageRegistrationsPermission = hasPermission(
    "courses.manage_registrations" as PermissionKey,
  );

  const {
    data: course,
    isLoading: courseLoading,
    refetch: refetchCourse,
  } = api.courses.getById.useQuery(
    { id: courseId },
    { enabled: !!courseId && !!session?.user },
  );

  const { data: registrationsData, isLoading: registrationsLoading } =
    api.courses.getRegistrations.useQuery(
      { courseId, all: true },
      {
        enabled: !!courseId && !!session?.user && activeTab === "participants",
      },
    );

  const { data: canMailRegistrants } = api.courseMail.canSend.useQuery(
    { courseId },
    {
      enabled: !!courseId && !!session?.user && activeTab === "participants",
    },
  );

  const { data: invoiceAccess } = api.invoices.canManageCourseInvoices.useQuery(
    { courseId },
    {
      enabled: !!courseId && !!session?.user && activeTab === "participants",
    },
  );

  const approveMutation = api.courses.approve.useMutation({
    onSuccess: () => {
      void refetchCourse();
      toast.success("Kurs wurde freigegeben");
    },
    onError: (error) => {
      toast.error("Fehler bei der Freigabe: " + error.message);
    },
  });

  const rejectMutation = api.courses.reject.useMutation({
    onSuccess: () => {
      void refetchCourse();
      setShowRejectModal(false);
      setReviewNotes("");
      toast.success("Kurs wurde abgelehnt");
    },
    onError: (error) => {
      toast.error("Fehler bei der Ablehnung: " + error.message);
    },
  });

  const deleteMutation = api.courses.delete.useMutation({
    onSuccess: () => {
      toast.success("Kurs erfolgreich gelöscht");
      router.push("/dashboard/courses");
    },
    onError: (error) => {
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/courses/${courseId}`);
    }
  }, [session, sessionLoading, router, courseId]);

  useEffect(() => {
    if (!permissionsLoading && !hasDashboardAccess && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/");
    }
  }, [permissionsLoading, hasDashboardAccess, router]);

  if (sessionLoading || profileLoading || permissionsLoading || courseLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !course) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Kurs nicht gefunden
          </h1>
          <Link
            href="/dashboard/courses"
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const isReviewer = hasApprovePermission;
  const isOwner = course.createdById === session.user.id;
  const hasCourseTeamAccess =
    course.viewerCollaboratorRole === CourseCollaboratorRole.STAFF ||
    course.viewerCollaboratorRole === CourseCollaboratorRole.ORGANIZER;
  const hasDistrictCourseAccess =
    !!profile.bezirkId &&
    !!course.bezirkId &&
    profile.bezirkId === course.bezirkId;
  const canEdit =
    isOwner ||
    hasEditPermission ||
    hasDistrictCourseAccess ||
    course.viewerCollaboratorRole === CourseCollaboratorRole.ORGANIZER;
  const canDelete = isOwner || hasEditPermission;
  const canReview = isReviewer && course.status === ContentStatus.PENDING;
  const canViewParticipants =
    isOwner || hasViewParticipantsPermission || hasCourseTeamAccess;
  // Registrations the team received by mail, phone or on paper are entered by
  // hand — the public form is closed once the deadline passes.
  const canAddRegistrations =
    !isExternalCourse(course) &&
    (isOwner || hasCourseTeamAccess || hasManageRegistrationsPermission);

  const startDate = new Date(course.startDate);
  const endDate = new Date(course.endDate);
  const formattedStartDate = startDate.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedEndDate = endDate.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleApprove = () => {
    approveMutation.mutate({
      id: courseId,
      reviewNotes: reviewNotes || undefined,
    });
  };

  const handleReject = () => {
    if (!reviewNotes.trim()) {
      return;
    }
    rejectMutation.mutate({
      id: courseId,
      reviewNotes: reviewNotes,
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate({ id: courseId });
  };

  const confirmedCount = course._count?.participants ?? 0;
  const isExternal = isExternalCourse(course);
  const districtLabel = course.bezirk
    ? `${course.bezirk.name}`
    : "Übergreifend";
  const registrationLabel =
    course.registrationOpen &&
    course.registrationOpensAt &&
    new Date(course.registrationOpensAt) > new Date()
      ? `Öffnet ${new Date(course.registrationOpensAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}`
      : course.registrationOpen
        ? "Anmeldung offen"
        : "Anmeldung geschlossen";
  const detailShortlinks = [
    { href: "#course-detail-overview", label: "Überblick" },
    { href: "#course-detail-info", label: "Kursinfos" },
    ...(course.description
      ? [{ href: "#course-detail-description", label: "Beschreibung" }]
      : []),
    ...((course.collaborators?.length ?? 0) > 0 ||
    (course.guestTeamMembers?.length ?? 0) > 0
      ? [{ href: "#course-detail-team", label: "Team" }]
      : []),
    ...(course.prerequisites || course.whatToBring
      ? [{ href: "#course-detail-more", label: "Hinweise" }]
      : []),
    ...(course.customFields?.length
      ? [{ href: "#course-detail-fields", label: "Anmeldefelder" }]
      : []),
    { href: "#course-detail-prices", label: "Preise" },
    { href: "#course-detail-meta", label: "Metadaten" },
  ];
  const renderCourseInfoSection = (className: string) => (
    <section id="course-detail-info" className={className}>
      <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
        Kursinformationen
      </h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Kurstyp
          </dt>
          <dd className="dark:text-dark-text mt-1 text-gray-900">
            {courseTypeLabels[course.courseType]}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Beginn
          </dt>
          <dd className="dark:text-dark-text mt-1 text-gray-900">
            {formattedStartDate}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Ende
          </dt>
          <dd className="dark:text-dark-text mt-1 text-gray-900">
            {formattedEndDate}
          </dd>
        </div>
        {course.bezirk && (
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Bezirk
            </dt>
            <dd className="dark:text-dark-text mt-1 text-gray-900">
              {course.bezirk.name}
            </dd>
          </div>
        )}
        {course.location && (
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Veranstaltungsort
            </dt>
            <dd className="dark:text-dark-text mt-1 text-gray-900">
              {course.location.name && `${course.location.name}, `}
              {course.location.city}
              {course.location.street && (
                <span className="block text-sm text-gray-500">
                  {course.location.street}, {course.location.zipCode}{" "}
                  {course.location.city}
                </span>
              )}
            </dd>
          </div>
        )}
        {isExternal ? (
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Externe Anmeldung
            </dt>
            <dd className="dark:text-dark-text mt-1 text-gray-900">
              {course.externalProviderName || "Externer Anbieter"}
              {course.externalRegistrationUrl ? (
                <a
                  href={course.externalRegistrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary mt-1 inline-flex items-center gap-1 text-sm hover:underline"
                >
                  Zur Anmeldung
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </dd>
          </div>
        ) : (
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Teilnehmer
            </dt>
            <dd className="dark:text-dark-text mt-1 text-gray-900">
              {confirmedCount}
              {course.maxParticipants && ` / ${course.maxParticipants}`}
              {course.allowWaitingList && (
                <span className="ml-2 text-sm text-gray-500">
                  (Warteliste aktiviert)
                </span>
              )}
            </dd>
          </div>
        )}
        {course.registrationOpensAt && (
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Anmeldung öffnet ab
            </dt>
            <dd className="dark:text-dark-text mt-1 text-gray-900">
              {new Date(course.registrationOpensAt).toLocaleDateString(
                "de-DE",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                },
              )}{" "}
              um{" "}
              {new Date(course.registrationOpensAt).toLocaleTimeString(
                "de-DE",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}{" "}
              Uhr
            </dd>
          </div>
        )}
        {course.registrationDeadline && (
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Anmeldeschluss
            </dt>
            <dd className="dark:text-dark-text mt-1 text-gray-900">
              {new Date(course.registrationDeadline).toLocaleDateString(
                "de-DE",
              )}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );

  return (
    <DashboardPage
      title={course.title}
      description={course.motto ?? undefined}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Kurse", href: "/dashboard/courses" },
        { label: course.title },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Link
              href={`/dashboard/courses/${courseId}/edit`}
              className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Edit className="h-4 w-4" />
              Bearbeiten
            </Link>
          )}
          {canDelete && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="dark:bg-dark-surface inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
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
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusColors[course.status]}`}
        >
          {statusLabels[course.status]}
        </span>
        {course.registrationOpen &&
        course.registrationOpensAt &&
        new Date(course.registrationOpensAt) > new Date() ? (
          <span className="inline-flex rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            Öffnet{" "}
            {new Date(course.registrationOpensAt).toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "short",
            })}
          </span>
        ) : course.registrationOpen ? (
          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            Anmeldung offen
          </span>
        ) : null}
        {course.maxParticipants && confirmedCount >= course.maxParticipants && (
          <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            Ausgebucht
          </span>
        )}
      </div>

      <section
        id="course-detail-overview"
        className="dashboard-form-scroll-anchor mb-8"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="dark:bg-dark-background-secondary rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Zeitraum
            </p>
            <p className="text-dark dark:text-dark-text mt-1 text-sm font-semibold">
              {formattedStartDate}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              bis {formattedEndDate}
            </p>
          </div>
          <div className="dark:bg-dark-background-secondary rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Bezirk
            </p>
            <p className="text-dark dark:text-dark-text mt-1 text-sm font-semibold">
              {districtLabel}
            </p>
          </div>
          <div className="dark:bg-dark-background-secondary rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Anmeldung
            </p>
            <p className="text-dark dark:text-dark-text mt-1 text-sm font-semibold">
              {registrationLabel}
            </p>
          </div>
          <div className="dark:bg-dark-background-secondary rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
              {isExternal ? "Anbieter" : "Teilnehmer"}
            </p>
            <p className="text-dark dark:text-dark-text mt-1 text-sm font-semibold">
              {isExternal
                ? course.externalProviderName || "Extern"
                : `${confirmedCount}${course.maxParticipants ? ` / ${course.maxParticipants}` : ""}`}
            </p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      {canViewParticipants && !isExternal && (
        <div className="dark:border-dark-border mb-6 border-b border-gray-200">
          <nav className="-mb-px flex gap-4">
            <button
              onClick={() => setActiveTab("details")}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === "details"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab("participants")}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === "participants"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              Teilnehmer ({confirmedCount})
            </button>
          </nav>
        </div>
      )}

      {/* Details Tab */}
      {activeTab === "details" && (
        <DashboardFormSectionLayout
          className="lg:grid lg:grid-cols-[minmax(0,1fr)_10.5rem] lg:items-start lg:gap-10 lg:pt-4 xl:gap-14"
          railClassName="dashboard-sticky-shell-top lg:sticky lg:block lg:self-start"
          railItems={detailShortlinks}
        >
          <div className="space-y-0">
            {/* Review Section - Only for pending courses */}
            {canReview && (
              <section className="mb-8 rounded-lg border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-900/50 dark:bg-yellow-900/20">
                <h2 className="mb-4 text-lg font-semibold text-yellow-800 dark:text-yellow-300">
                  Kurs prüfen
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-yellow-800 dark:text-yellow-300">
                      Anmerkungen (optional bei Genehmigung, erforderlich bei
                      Ablehnung)
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={3}
                      className="focus:border-primary focus:ring-primary dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-yellow-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none dark:border-yellow-800"
                      placeholder="Anmerkungen zur Prüfung..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleApprove}
                      disabled={approveMutation.isPending}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      {approveMutation.isPending
                        ? "Wird genehmigt..."
                        : "Genehmigen"}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                    >
                      Ablehnen
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Rejection Notice */}
            {course.status === ContentStatus.REJECTED && course.reviewNotes && (
              <section className="mb-8 rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-900/20">
                <h2 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-300">
                  Ablehnungsgrund
                </h2>
                <p className="text-red-700 dark:text-red-400">
                  {course.reviewNotes}
                </p>
                {course.reviewer && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-500">
                    Abgelehnt von {course.reviewer.displayName} am{" "}
                    {course.reviewDate
                      ? new Date(course.reviewDate).toLocaleDateString("de-DE")
                      : ""}
                  </p>
                )}
              </section>
            )}

            {course.image ? (
              <DashboardFormMediaSplit
                className="dark:border-dark-border mb-10 border-t border-gray-200/80 pt-10"
                main={renderCourseInfoSection("dashboard-form-scroll-anchor")}
                aside={
                  <section className="overflow-hidden rounded-xl">
                    <div className="relative aspect-video w-full">
                      <Image
                        src={course.image.url}
                        alt={course.image.alt || course.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </section>
                }
              />
            ) : (
              renderCourseInfoSection(
                "dashboard-form-scroll-anchor dark:border-dark-border border-t border-gray-200/80 pt-10",
              )
            )}

            {/* Description */}
            {course.description && (
              <section
                id="course-detail-description"
                className="dashboard-form-scroll-anchor dark:border-dark-border border-t border-gray-200/80 pt-10"
              >
                <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                  Beschreibung
                </h2>
                <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300">
                  {course.description.split("\n").map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </section>
            )}

            {/* Öffentliches Kurs-Team */}
            {((course.collaborators?.length ?? 0) > 0 ||
              (course.guestTeamMembers?.length ?? 0) > 0) && (
              <section
                id="course-detail-team"
                className="dashboard-form-scroll-anchor dark:border-dark-border border-t border-gray-200/80 pt-10"
              >
                <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                  Kurs-Team
                </h2>
                <ul className="space-y-2">
                  {course.collaborators?.map((entry) => (
                    <li key={entry.user.id} className="flex items-center gap-3">
                      {entry.user.profileImage?.url ? (
                        <Image
                          src={entry.user.profileImage.url}
                          alt={entry.user.displayName || ""}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                          <UserIcon className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                      <span className="dark:text-dark-text text-gray-900">
                        {entry.user.displayName}
                      </span>
                    </li>
                  ))}
                  {course.guestTeamMembers?.map((row) => (
                    <li key={row.id} className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                        <UserIcon className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <span className="dark:text-dark-text block text-gray-900">
                          {row.displayName}
                        </span>
                        {row.bio ? (
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {row.bio}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Prerequisites & What to Bring */}
            {(course.prerequisites || course.whatToBring) && (
              <section
                id="course-detail-more"
                className="dashboard-form-scroll-anchor dark:border-dark-border border-t border-gray-200/80 pt-10"
              >
                <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                  Weitere Informationen
                </h2>
                <div className="space-y-4">
                  {course.prerequisites && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Voraussetzungen
                      </h3>
                      <p className="dark:text-dark-text mt-1 text-gray-900">
                        {course.prerequisites}
                      </p>
                    </div>
                  )}
                  {course.whatToBring && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Mitzubringen
                      </h3>
                      <p className="dark:text-dark-text mt-1 text-gray-900">
                        {course.whatToBring}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Custom Fields */}
            {course.customFields && course.customFields.length > 0 && (
              <section
                id="course-detail-fields"
                className="dashboard-form-scroll-anchor dark:border-dark-border border-t border-gray-200/80 pt-10"
              >
                <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                  Zusätzliche Felder bei Anmeldung
                </h2>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Diese Felder werden bei der Anmeldung von den Teilnehmern
                  abgefragt.
                </p>
                <div className="space-y-3">
                  {course.customFields
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((field) => (
                      <div
                        key={field.id}
                        className="dark:border-dark-border rounded-lg border border-gray-100 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="dark:text-dark-text font-medium text-gray-900">
                                {field.fieldName}
                              </span>
                              {field.isRequired && (
                                <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                  Pflichtfeld
                                </span>
                              )}
                            </div>
                            {field.helpText && (
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {field.helpText}
                              </p>
                            )}
                          </div>
                          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            {customFieldTypeLabels[field.fieldType]}
                          </span>
                        </div>
                        {customFieldTypeNeedsOptions(field.fieldType) &&
                          field.options && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Optionen:
                              </span>
                              {(typeof field.options === "string"
                                ? field.options
                                    .split(",")
                                    .map((o) => o.trim())
                                    .filter(Boolean)
                                : Array.isArray(field.options)
                                  ? (field.options as string[])
                                  : []
                              ).map((option: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="rounded bg-gray-50 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                >
                                  {option}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* Pricing */}
            <section
              id="course-detail-prices"
              className="dashboard-form-scroll-anchor dark:border-dark-border border-t border-gray-200/80 pt-10"
            >
              <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                Preise
              </h2>
              {course.isFree ? (
                <p className="dark:text-dark-text text-gray-900">Kostenlos</p>
              ) : course.priceOptions && course.priceOptions.length > 0 ? (
                <div className="space-y-2">
                  {course.priceOptions.map((option) => (
                    <div
                      key={option.id}
                      className="dark:border-dark-border flex items-start justify-between gap-3 rounded-lg border border-gray-100 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="dark:text-dark-text font-medium text-gray-900">
                          {option.label}
                        </span>
                        {option.description && (
                          <p className="text-sm text-gray-500">
                            {option.description}
                          </p>
                        )}
                      </div>
                      <span className="dark:text-dark-text shrink-0 font-semibold whitespace-nowrap text-gray-900 tabular-nums">
                        {option.price.toFixed(2)}&nbsp;€
                      </span>
                    </div>
                  ))}
                </div>
              ) : course.priceInfo ? (
                <p className="dark:text-dark-text text-gray-900">
                  {course.priceInfo}
                </p>
              ) : (
                <p className="text-gray-500">
                  Keine Preisinformationen verfügbar
                </p>
              )}
            </section>

            {/* Meta Info */}
            <section
              id="course-detail-meta"
              className="dashboard-form-scroll-anchor dark:border-dark-border border-t border-gray-200/80 pt-10"
            >
              <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                Metadaten
              </h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                {course.createdBy && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Erstellt von
                    </dt>
                    <dd className="dark:text-dark-text mt-1 text-gray-900">
                      {course.createdBy.displayName}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Erstellt am
                  </dt>
                  <dd className="dark:text-dark-text mt-1 text-gray-900">
                    {new Date(course.createdAt).toLocaleDateString("de-DE")}
                  </dd>
                </div>
                {course.reviewer && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Geprüft von
                    </dt>
                    <dd className="dark:text-dark-text mt-1 text-gray-900">
                      {course.reviewer.displayName}
                    </dd>
                  </div>
                )}
                {course.reviewDate && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Geprüft am
                    </dt>
                    <dd className="dark:text-dark-text mt-1 text-gray-900">
                      {new Date(course.reviewDate).toLocaleDateString("de-DE")}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          </div>
        </DashboardFormSectionLayout>
      )}

      {/* Participants Tab */}
      {activeTab === "participants" && canViewParticipants && (
        <div className="space-y-6">
          {/* Link to full participants page */}
          <div className="flex flex-wrap justify-end gap-2">
            {canMailRegistrants && (
              <Link
                href={`/dashboard/courses/${courseId}/mail`}
                className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <MailIcon className="h-4 w-4" />
                Anmelder:innen anschreiben
              </Link>
            )}
            {invoiceAccess?.canManage && invoiceAccess.invoicingEnabled && (
              <Link
                href={`/dashboard/courses/${courseId}/invoices`}
                className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ReceiptTextIcon className="h-4 w-4" />
                Rechnungen
              </Link>
            )}
            {canAddRegistrations && (
              <Link
                href={`/dashboard/courses/${courseId}/participants/new`}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                <PlusIcon className="h-4 w-4" />
                Anmeldung hinzufügen
              </Link>
            )}
            <Link
              href={`/dashboard/courses/${courseId}/participants`}
              className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              <ArrowRightIcon className="h-4 w-4" />
              Zur Teilnehmerverwaltung
            </Link>
          </div>

          {/* Summary */}
          <section className="dark:border-dark-border border-t border-gray-200/80 pt-10">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Übersicht
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {registrationsData?.registrations
                    .filter(
                      (r) =>
                        r.registrationStatus === RegistrationStatus.CONFIRMED,
                    )
                    .reduce((sum, r) => sum + r.participants.length, 0) ?? 0}
                </div>
                <div className="text-sm text-green-600 dark:text-green-500">
                  Bestätigte Teilnehmer
                </div>
              </div>
              <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                  {registrationsData?.registrations
                    .filter(
                      (r) =>
                        r.registrationStatus === RegistrationStatus.WAITLIST,
                    )
                    .reduce((sum, r) => sum + r.participants.length, 0) ?? 0}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-500">
                  Auf Warteliste
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {registrationsData?.total ?? 0}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-500">
                  Anmeldungen gesamt
                </div>
              </div>
            </div>
          </section>

          {/* Registrations List */}
          <section className="dark:border-dark-border border-t border-gray-200/80 pt-10">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Anmeldungen
            </h2>
            {registrationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
              </div>
            ) : registrationsData?.registrations.length === 0 ? (
              <p className="py-8 text-center text-gray-500 dark:text-gray-400">
                Noch keine Anmeldungen vorhanden.
              </p>
            ) : (
              <div className="space-y-4">
                {registrationsData?.registrations.map((registration) => (
                  <div
                    key={registration.id}
                    className="dark:border-dark-border rounded-lg border border-gray-200 p-4"
                  >
                    {/* Registration Header */}
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="dark:text-dark-text font-medium text-gray-900">
                          <Link
                            href={`/dashboard/courses/${courseId}/participants/${registration.id}`}
                            className="hover:text-primary transition-colors"
                          >
                            {registration.registrantFirstName}{" "}
                            {registration.registrantLastName}
                          </Link>
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {registration.registrantEmail}
                          {registration.registrantPhone &&
                            ` • ${registration.registrantPhone}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            registrationStatusColors[
                              registration.registrationStatus
                            ]
                          }`}
                        >
                          {
                            registrationStatusLabels[
                              registration.registrationStatus
                            ]
                          }
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            registration.paymentStatus === PaymentStatus.PAID
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : registration.paymentStatus ===
                                  PaymentStatus.REFUNDED
                                ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {paymentStatusLabels[registration.paymentStatus]}
                        </span>
                      </div>
                    </div>

                    {/* Participants */}
                    {registration.participants.length > 0 && (
                      <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
                        <h4 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                          Teilnehmer ({registration.participants.length})
                        </h4>
                        <div className="space-y-2">
                          {registration.participants.map((participant) => (
                            <div
                              key={participant.id}
                              className="dark:bg-dark-background-secondary flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm"
                            >
                              <div>
                                <span className="dark:text-dark-text font-medium text-gray-900">
                                  {participant.firstName} {participant.lastName}
                                </span>
                                {participant.city && (
                                  <span className="ml-2 text-gray-500">
                                    aus {participant.city}
                                  </span>
                                )}
                                {participant.instrument && (
                                  <span className="ml-2 text-gray-500">
                                    ({participant.instrument})
                                  </span>
                                )}
                              </div>
                              {participant.priceOption && (
                                <span className="text-gray-500">
                                  {participant.priceOption}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Registration Meta */}
                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-sm dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">
                        Angemeldet am{" "}
                        {new Date(registration.createdAt).toLocaleDateString(
                          "de-DE",
                        )}
                      </span>
                      <span className="dark:text-dark-text font-medium text-gray-900">
                        {registration.totalPrice.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <ScrollableModal>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                Kurs ablehnen
              </h2>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Bitte gib einen Grund für die Ablehnung an. Dieser wird dem
                Ersteller angezeigt.
              </p>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text mb-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:ring-1 focus:outline-none"
                placeholder="Ablehnungsgrund..."
              />
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setReviewNotes("");
                  }}
                  className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleReject}
                  disabled={!reviewNotes.trim() || rejectMutation.isPending}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
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
              <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                Kurs löschen
              </h2>
              <p className="mb-4 text-gray-600 dark:text-gray-400">
                Bist du sicher, dass du diesen Kurs löschen möchtest? Diese
                Aktion kann nicht rückgängig gemacht werden.
              </p>
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Wird gelöscht..." : "Löschen"}
                </button>
              </div>
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}
    </DashboardPage>
  );
}
