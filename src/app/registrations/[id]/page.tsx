"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { RegistrationStatus } from "~/generated/prisma/enums";

export default function ViewRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const registrationId = params.id as string;
  const utils = api.useUtils();

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Fetch registration details
  const { data: registration, isLoading: registrationLoading } =
    api.registrations.getById.useQuery(
      { id: registrationId },
      { enabled: !!registrationId },
    );

  // Cancel mutation
  const cancelMutation = api.registrations.cancel.useMutation({
    onSuccess: () => {
      setCancelModalOpen(false);
      setCancelError("");
      void utils.registrations.getMyRegistrations.invalidate();
      void utils.registrations.getById.invalidate({ id: registrationId });
    },
    onError: (err) => {
      setCancelError(err.message || "Ein Fehler ist aufgetreten.");
    },
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/login");
    }
  }, [session, sessionLoading, router]);

  // Check if user owns this registration
  const isOwner = registration?.registrantEmail === session?.user?.email;

  // Check if registration can be edited
  const canEdit = () => {
    if (!registration) return false;
    const now = new Date();
    const courseStart = new Date(registration.course.startDate);
    const deadline = registration.course.registrationDeadline
      ? new Date(registration.course.registrationDeadline)
      : null;

    if (courseStart <= now) return false;
    if (deadline && deadline <= now) return false;
    if (registration.registrationStatus === RegistrationStatus.CANCELLED)
      return false;

    return true;
  };

  const canCancel = () => {
    if (!registration) return false;
    if (registration.registrationStatus === RegistrationStatus.CANCELLED)
      return false;

    const now = new Date();
    const deadline = registration.course.registrationDeadline
      ? new Date(registration.course.registrationDeadline)
      : null;

    // Can only cancel before the registration deadline
    if (deadline && deadline <= now) return false;

    return true;
  };

  const confirmCancel = () => {
    cancelMutation.mutate({ id: registrationId });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: RegistrationStatus) => {
    const badges: Record<RegistrationStatus, string> = {
      CONFIRMED:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      WAITLIST:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      CANCELLED:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    };
    const labels: Record<RegistrationStatus, string> = {
      CONFIRMED: "Teilnahme Bestätigt",
      WAITLIST: "Auf Warteliste",
      CANCELLED: "Storniert",
    };

    return (
      <span
        className={`rounded-full px-3 py-1 text-sm font-semibold ${badges[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  if (sessionLoading || registrationLoading) {
    return (
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-dark dark:text-dark-text">Lädt...</div>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <h1 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold">
            Anmeldung nicht gefunden
          </h1>
          <Link
            href="/registrations"
            className="text-primary hover:text-primary-dark"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <h1 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold">
            Keine Berechtigung
          </h1>
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            Du kannst nur deine eigenen Anmeldungen einsehen.
          </p>
          <Link
            href="/registrations"
            className="text-primary hover:text-primary-dark"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-secondary dark:bg-dark-background-secondary min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <nav className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link
              href="/registrations"
              className="transition-colors hover:text-primary"
            >
              Meine Anmeldungen
            </Link>
            <span>/</span>
            <span className="text-dark dark:text-dark-text">Details</span>
          </nav>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-dark dark:text-dark-text text-3xl font-bold">
                {registration.course.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {getStatusBadge(registration.registrationStatus)}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {canEdit() && (
                <Link
                  href={`/registrations/${registration.id}/edit`}
                  className="bg-primary hover:bg-primary-dark inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
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
              {canCancel() && (
                <button
                  onClick={() => setCancelModalOpen(true)}
                  className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:border-red-400 hover:bg-red-100 hover:text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400 dark:hover:border-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-300"
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
            </div>
          </div>
        </div>

        {/* Course Info Card */}
        <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-dark dark:text-dark-text mb-4 flex items-center gap-2 text-lg font-semibold">
            <svg
              className="text-primary h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            Kursdetails
          </h2>
          <div className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Zeitraum:
              </span>
              <p className="text-gray-600 dark:text-gray-400">
                {formatDate(registration.course.startDate)} –{" "}
                {formatDate(registration.course.endDate)}
              </p>
            </div>
            {registration.course.location && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Ort:
                </span>
                <p className="text-gray-600 dark:text-gray-400">
                  {registration.course.location.name},{" "}
                  {registration.course.location.city}
                </p>
              </div>
            )}
            {registration.course.registrationDeadline && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Anmeldefrist:
                </span>
                <p className="text-gray-600 dark:text-gray-400">
                  {formatDate(registration.course.registrationDeadline)}
                </p>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Angemeldet am:
              </span>
              <p className="text-gray-600 dark:text-gray-400">
                {formatDateTime(registration.createdAt)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Link
              href={`/termine/${registration.course.id}`}
              className="text-primary hover:text-primary-dark inline-flex items-center gap-1 text-sm font-medium transition-colors"
            >
              Zur Kursseite
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
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* Registrant Info */}
        <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-dark dark:text-dark-text mb-4 flex items-center gap-2 text-lg font-semibold">
            <svg
              className="text-primary h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Anmelder
          </h2>
          <div className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Name:
              </span>
              <p className="text-gray-600 dark:text-gray-400">
                {registration.registrantFirstName}{" "}
                {registration.registrantLastName}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                E-Mail:
              </span>
              <p className="text-gray-600 dark:text-gray-400">
                {registration.registrantEmail}
              </p>
            </div>
            {registration.registrantPhone && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Telefon:
                </span>
                <p className="text-gray-600 dark:text-gray-400">
                  {registration.registrantPhone}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Billing Info (if separate) */}
        {registration.useSeparateBilling && (
          <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-dark dark:text-dark-text mb-4 flex items-center gap-2 text-lg font-semibold">
              <svg
                className="text-primary h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Rechnungsadresse
            </h2>
            <div className="grid gap-4 text-sm md:grid-cols-2">
              {registration.billingCompany && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Firma/Organisation:
                  </span>
                  <p className="text-gray-600 dark:text-gray-400">
                    {registration.billingCompany}
                  </p>
                </div>
              )}
              {(registration.billingFirstName ||
                registration.billingLastName) && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Name:
                  </span>
                  <p className="text-gray-600 dark:text-gray-400">
                    {registration.billingFirstName}{" "}
                    {registration.billingLastName}
                  </p>
                </div>
              )}
              {registration.billingEmail && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    E-Mail:
                  </span>
                  <p className="text-gray-600 dark:text-gray-400">
                    {registration.billingEmail}
                  </p>
                </div>
              )}
              {(registration.billingStreet || registration.billingCity) && (
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Adresse:
                  </span>
                  <p className="text-gray-600 dark:text-gray-400">
                    {registration.billingStreet && (
                      <>
                        {registration.billingStreet}
                        <br />
                      </>
                    )}
                    {registration.billingZipCode} {registration.billingCity}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Participants */}
        <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-6 dark:border-gray-700">
            <h2 className="text-dark dark:text-dark-text flex items-center gap-2 text-lg font-semibold">
              <svg
                className="text-primary h-5 w-5"
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
              Teilnehmer ({registration.participants.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {registration.participants.map((participant, index) => (
              <div key={participant.id} className="p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-dark dark:text-dark-text font-semibold">
                    {participant.firstName} {participant.lastName}
                  </h3>
                  <span className="dark:bg-dark-background-secondary rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                    #{index + 1}
                  </span>
                </div>
                <div className="grid gap-4 text-sm md:grid-cols-2">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Geburtsdatum:
                    </span>
                    <p className="text-gray-600 dark:text-gray-400">
                      {formatDate(participant.birthDate)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Wohnort:
                    </span>
                    <p className="text-gray-600 dark:text-gray-400">
                      {participant.city}
                    </p>
                  </div>
                  {participant.instrument && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Instrument:
                      </span>
                      <p className="text-gray-600 dark:text-gray-400">
                        {participant.instrument}
                      </p>
                    </div>
                  )}
                  {participant.priceOption && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Preisoption:
                      </span>
                      <p className="text-gray-600 dark:text-gray-400">
                        {participant.priceOption}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Summary */}
        <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-dark dark:text-dark-text text-lg font-semibold">
                Gesamtpreis
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {registration.participants.length} Teilnehmer
                {registration.participants.length !== 1 && ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-primary text-3xl font-bold">
                {registration.totalPrice.toFixed(2)} €
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {registration.notes && (
          <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-dark dark:text-dark-text mb-4 flex items-center gap-2 text-lg font-semibold">
              <svg
                className="text-primary h-5 w-5"
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
              Anmerkungen
            </h2>
            <p className="whitespace-pre-wrap text-gray-600 dark:text-gray-400">
              {registration.notes}
            </p>
          </div>
        )}

        {/* Back Link */}
        <div className="flex justify-start">
          <Link
            href="/registrations"
            className="text-primary hover:text-primary-dark inline-flex items-center gap-2 text-sm font-medium transition-colors"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Zurück zur Übersicht
          </Link>
        </div>

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
                    setCancelError("");
                  }}
                  className="dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Zurück
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={cancelMutation.isPending}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelMutation.isPending ? "Wird storniert..." : "Stornieren"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
