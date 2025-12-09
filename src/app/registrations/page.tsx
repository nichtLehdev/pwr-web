"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { RegistrationStatus } from "~/generated/prisma/enums";
import { useToast } from "@/app/_components/ui/toast";

export default function MyRegistrationsPage() {
  const router = useRouter();
  const toast = useToast();
  const { data: session, isPending: sessionLoading } = useSession();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    RegistrationStatus | undefined
  >(undefined);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [registrationToCancel, setRegistrationToCancel] = useState<
    string | null
  >(null);
  const [cancelError, setCancelError] = useState("");
  const utils = api.useUtils();

  const cancelMutation = api.registrations.cancel.useMutation({
    onSuccess: () => {
      setCancelModalOpen(false);
      setRegistrationToCancel(null);
      setCancelError("");
      toast.success("Anmeldung erfolgreich storniert");
      void utils.registrations.getMyRegistrations.invalidate();
    },
    onError: (err) => {
      setCancelError(err.message || "Ein Fehler ist aufgetreten.");
      toast.error(err.message || "Ein Fehler ist aufgetreten.");
    },
  });

  const handleCancelClick = (registrationId: string) => {
    setRegistrationToCancel(registrationId);
    setCancelModalOpen(true);
    setCancelError("");
  };

  const confirmCancel = () => {
    if (registrationToCancel) {
      cancelMutation.mutate({ id: registrationToCancel });
    }
  };

  const { data, isLoading } = api.registrations.getMyRegistrations.useQuery(
    {
      page,
      limit: 10,
      status: statusFilter,
    },
    {
      enabled: !!session?.user,
    },
  );

  if (!sessionLoading && !session?.user) {
    router.push("/login");
    return null;
  }

  const getStatusBadge = (status: RegistrationStatus) => {
    const badges: Record<RegistrationStatus, string> = {
      CONFIRMED:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      WAITLIST:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    };
    const labels: Record<RegistrationStatus, string> = {
      CONFIRMED: "Teilnahme Bestätigt",
      WAITLIST: "Auf Warteliste",
      CANCELLED: "Storniert",
    };

    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${badges[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getEditDeadlineInfo = (
    registration: NonNullable<typeof data>["registrations"][0],
  ) => {
    const now = new Date();
    const courseStart = new Date(registration.course.startDate);
    const deadline = registration.course.registrationDeadline
      ? new Date(registration.course.registrationDeadline)
      : null;

    if (registration.registrationStatus === RegistrationStatus.CANCELLED) {
      return {
        canEdit: false,
        message: "Stornierte Anmeldung",
        color: "text-gray-500",
      };
    }

    if (courseStart <= now) {
      return {
        canEdit: false,
        message: "Kurs hat bereits begonnen",
        color: "text-gray-500",
      };
    }

    if (deadline && deadline <= now) {
      return {
        canEdit: false,
        message: "Anmeldefrist abgelaufen",
        color: "text-red-600 dark:text-red-400",
      };
    }

    const editUntil = deadline || courseStart;
    const daysUntil = Math.ceil(
      (editUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntil <= 3) {
      return {
        canEdit: true,
        message: `Noch ${daysUntil} Tag${daysUntil === 1 ? "" : "e"} bearbeitbar`,
        color: "text-orange-600 dark:text-orange-400",
      };
    }

    if (daysUntil <= 7) {
      return {
        canEdit: true,
        message: `Bearbeitbar bis ${formatDate(editUntil)}`,
        color: "text-yellow-600 dark:text-yellow-400",
      };
    }

    return {
      canEdit: true,
      message: `Bearbeitbar bis ${formatDate(editUntil)}`,
      color: "text-green-600 dark:text-green-400",
    };
  };

  if (sessionLoading || isLoading) {
    return (
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-dark dark:text-dark-text">Lädt...</div>
      </div>
    );
  }

  return (
    <div className="bg-background-secondary dark:bg-dark-background-secondary min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <nav className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link
              href="/dashboard"
              className="hover:text-primary transition-colors"
            >
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-dark dark:text-dark-text">
              Meine Anmeldungen
            </span>
          </nav>
          <h1 className="text-dark dark:text-dark-text text-3xl font-bold">
            Meine Anmeldungen
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Übersicht über alle deine Anmeldungen.
          </p>
        </div>

        {/* Filters */}
        <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-dark dark:text-dark-text text-sm font-medium">
              Filter:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter(undefined)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  statusFilter === undefined
                    ? "bg-primary text-white"
                    : "dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                Alle
              </button>
              <button
                onClick={() => setStatusFilter(RegistrationStatus.CONFIRMED)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  statusFilter === RegistrationStatus.CONFIRMED
                    ? "bg-primary text-white"
                    : "dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                Bestätigt
              </button>
              <button
                onClick={() => setStatusFilter(RegistrationStatus.WAITLIST)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  statusFilter === RegistrationStatus.WAITLIST
                    ? "bg-primary text-white"
                    : "dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                Warteliste
              </button>
              <button
                onClick={() => setStatusFilter(RegistrationStatus.CANCELLED)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  statusFilter === RegistrationStatus.CANCELLED
                    ? "bg-primary text-white"
                    : "dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                Storniert
              </button>
            </div>
          </div>
        </div>

        {/* Registrations List */}
        {data?.registrations && data.registrations.length > 0 ? (
          <div className="space-y-4">
            {data.registrations.map((registration) => {
              const editInfo = getEditDeadlineInfo(registration);

              return (
                <div
                  key={registration.id}
                  className="dark:bg-dark-surface dark:border-dark-border overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      {/* Course Info */}
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h2 className="text-dark dark:text-dark-text text-xl font-bold">
                            {registration.course.title}
                          </h2>
                          {getStatusBadge(registration.registrationStatus)}
                        </div>

                        <div className="mb-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span>
                              {formatDate(registration.course.startDate)} -{" "}
                              {formatDate(registration.course.endDate)}
                            </span>
                          </div>

                          {registration.course.location && (
                            <div className="flex items-center gap-2">
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              <span>
                                {registration.course.location.name},{" "}
                                {registration.course.location.city}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                              />
                            </svg>
                            <span>
                              {registration.participants.length} Teilnehmer
                            </span>
                          </div>

                          {/* Edit deadline info */}
                          <div
                            className={`flex items-center gap-2 ${editInfo.color}`}
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span className="text-sm font-medium">
                              {editInfo.message}
                            </span>
                          </div>
                        </div>

                        {/* Participants */}
                        <div className="mb-4">
                          <h3 className="text-dark dark:text-dark-text mb-2 text-sm font-semibold">
                            Teilnehmer:
                          </h3>
                          <div className="space-y-1">
                            {registration.participants.map((participant) => (
                              <div
                                key={participant.id}
                                className="text-sm text-gray-600 dark:text-gray-400"
                              >
                                {participant.firstName} {participant.lastName}
                                {participant.instrument && (
                                  <span className="ml-2 text-xs">
                                    ({participant.instrument})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-dark dark:text-dark-text text-sm font-medium">
                            Gesamtpreis:
                          </span>
                          <span className="text-primary text-xl font-bold">
                            {registration.totalPrice.toFixed(2)} €
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 lg:min-w-[140px] lg:items-stretch">
                        <Link
                          href={`/registrations/${registration.id}`}
                          className="dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          Details
                        </Link>
                        {editInfo.canEdit && (
                          <Link
                            href={`/registrations/${registration.id}/edit`}
                            className="bg-primary hover:bg-primary-dark inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
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
                        {editInfo.canEdit && (
                          <button
                            onClick={() => handleCancelClick(registration.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-100 hover:text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:border-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-300"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            Stornieren
                          </button>
                        )}

                        {/* Meta info */}
                        <span className="mt-1 text-center text-xs text-gray-500 dark:text-gray-400">
                          Angemeldet am {formatDate(registration.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <svg
              className="text-primary mx-auto mb-4 h-16 w-16 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-semibold">
              Keine Anmeldungen gefunden
            </h3>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              Du hast dich noch nicht für einen Kurs angemeldet.
            </p>
            <Link
              href="/termine"
              className="bg-primary hover:bg-primary-dark dark:bg-primary-light dark:hover:bg-primary inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-colors"
            >
              Kurse entdecken
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {cancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="dark:bg-dark-surface w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="text-dark dark:text-dark-text mb-4 text-lg font-bold">
                Anmeldung stornieren?
              </h3>
              <p className="mb-6 text-gray-600 dark:text-gray-400">
                Bist du sicher, dass du diese Anmeldung stornieren möchtest?
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              {cancelError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    {cancelError}
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCancelModalOpen(false);
                    setRegistrationToCancel(null);
                    setCancelError("");
                  }}
                  className="dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Abbrechen
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={cancelMutation.isPending}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelMutation.isPending
                    ? "Wird storniert..."
                    : "Stornieren"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800"
            >
              Zurück
            </button>
            <span className="text-dark dark:text-dark-text px-4">
              Seite {page} von {data.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={page === data.pages}
              className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800"
            >
              Weiter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
