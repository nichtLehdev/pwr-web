"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import {
  UserRole,
  RegistrationStatus,
  PaymentStatus,
} from "~/generated/prisma/enums";

const registrationStatusLabels: Record<RegistrationStatus, string> = {
  CONFIRMED: "Bestätigt",
  WAITLIST: "Warteliste",
  CANCELLED: "Storniert",
};

const registrationStatusColors: Record<RegistrationStatus, string> = {
  CONFIRMED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  WAITLIST: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Ausstehend",
  PAID: "Bezahlt",
  REFUNDED: "Erstattet",
};

const paymentStatusColors: Record<PaymentStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REFUNDED: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

// Roles that have access to the dashboard
const DASHBOARD_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.LPW,
  UserRole.RPW,
  UserRole.OBLEUTE,
];

// Helper to get custom field value from participant
function getCustomFieldValue(participant: { customFields?: unknown }, fieldName: string): string {
  if (!participant.customFields || typeof participant.customFields !== "object") {
    return "–";
  }
  const fields = participant.customFields as Record<string, unknown>;
  const value = fields[fieldName];
  if (value === undefined || value === null || value === "") {
    return "–";
  }
  if (typeof value === "boolean") {
    return value ? "Ja" : "Nein";
  }
  return String(value);
}

export default function CourseParticipantsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  // View mode state
  const [viewMode, setViewMode] = useState<"participants" | "registrations">("participants");

  // Filter state
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | "ALL">("ALL");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch user profile for role
  const { data: profile, isLoading: profileLoading } = api.users.getMyProfile.useQuery(
    undefined,
    { enabled: !!session?.user },
  );

  // Fetch course data
  const { data: course, isLoading: courseLoading } = api.courses.getById.useQuery(
    { id: courseId },
    { enabled: !!courseId && !!session?.user },
  );

  // Fetch registrations
  const { data: registrationsData, isLoading: registrationsLoading } = api.courses.getRegistrations.useQuery(
    { courseId, page: 1, limit: 100 },
    { enabled: !!courseId && !!session?.user },
  );

  // Redirect if not logged in
  useEffect(() => {
    if (!sessionLoading && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/courses/${courseId}/participants`);
    }
  }, [session, sessionLoading, router, courseId]);

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
  if (sessionLoading || profileLoading || courseLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!session || !profile || !course) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-background">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-text">
            Kurs nicht gefunden
          </h1>
          <Link
            href="/dashboard/courses"
            className="mt-4 inline-block text-primary hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const userRole = profile.role;
  const isOwner = course.createdById === session.user.id;
  const isInstructor = course.instructors?.some((i) => i.id === session.user.id);
  const canViewParticipants = isOwner || isInstructor || userRole === UserRole.ADMIN || userRole === UserRole.LPW;

  if (!canViewParticipants) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-background">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-text">
            Keine Berechtigung
          </h1>
          <p className="mt-2 text-gray-600 dark:text-dark-muted">
            Du hast keine Berechtigung, die Teilnehmer dieses Kurses zu sehen.
          </p>
          <Link
            href="/dashboard/courses"
            className="mt-4 inline-block text-primary hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  // Filter registrations
  const filteredRegistrations = registrationsData?.registrations.filter((registration) => {
    // Status filter
    if (statusFilter !== "ALL" && registration.registrationStatus !== statusFilter) {
      return false;
    }
    // Payment filter
    if (paymentFilter !== "ALL" && registration.paymentStatus !== paymentFilter) {
      return false;
    }
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const registrantMatch =
        registration.registrantFirstName.toLowerCase().includes(query) ||
        registration.registrantLastName.toLowerCase().includes(query) ||
        registration.registrantEmail.toLowerCase().includes(query);
      const participantMatch = registration.participants.some(
        (p) =>
          p.firstName.toLowerCase().includes(query) ||
          p.lastName.toLowerCase().includes(query) ||
          p.city?.toLowerCase().includes(query) ||
          p.instrument?.toLowerCase().includes(query)
      );
      return registrantMatch || participantMatch;
    }
    return true;
  }) ?? [];

  // Calculate stats
  const confirmedCount = registrationsData?.registrations
    .filter((r) => r.registrationStatus === RegistrationStatus.CONFIRMED)
    .reduce((sum, r) => sum + r.participants.length, 0) ?? 0;
  const waitlistCount = registrationsData?.registrations
    .filter((r) => r.registrationStatus === RegistrationStatus.WAITLIST)
    .reduce((sum, r) => sum + r.participants.length, 0) ?? 0;
  const cancelledCount = registrationsData?.registrations
    .filter((r) => r.registrationStatus === RegistrationStatus.CANCELLED)
    .reduce((sum, r) => sum + r.participants.length, 0) ?? 0;
  const totalRevenue = registrationsData?.registrations
    .filter((r) => r.registrationStatus === RegistrationStatus.CONFIRMED)
    .reduce((sum, r) => sum + r.totalPrice, 0) ?? 0;
  const paidRevenue = registrationsData?.registrations
    .filter((r) => r.paymentStatus === PaymentStatus.PAID)
    .reduce((sum, r) => sum + r.totalPrice, 0) ?? 0;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-dark-background">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
                href="/dashboard/courses"
                className="text-gray-500 hover:text-primary dark:text-dark-muted dark:hover:text-primary"
              >
                Kurse
              </Link>
            </li>
            <li className="text-gray-400 dark:text-dark-muted">/</li>
            <li>
              <Link
                href={`/dashboard/courses/${courseId}`}
                className="max-w-[150px] truncate text-gray-500 hover:text-primary dark:text-dark-muted dark:hover:text-primary"
              >
                {course.title}
              </Link>
            </li>
            <li className="text-gray-400 dark:text-dark-muted">/</li>
            <li className="text-gray-900 dark:text-dark-text">Teilnehmer</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text sm:text-3xl">
              Teilnehmer
            </h1>
            <p className="mt-1 text-gray-600 dark:text-dark-muted">
              {course.title}
            </p>
          </div>
          <Link
            href={`/dashboard/courses/${courseId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:hover:bg-gray-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Zurück zum Kurs
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {confirmedCount}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Bestätigt</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {waitlistCount}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Warteliste</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {cancelledCount}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Storniert</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalRevenue.toFixed(2)} €
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Gesamtumsatz</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-surface">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {paidRevenue.toFixed(2)} €
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Bezahlt</div>
          </div>
        </div>

        {/* View Mode Toggle & Filters */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-surface">
          <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4 dark:border-dark-border">
            <span className="text-sm font-medium text-gray-700 dark:text-dark-text">Ansicht:</span>
            <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-dark-background-secondary">
              <button
                onClick={() => setViewMode("participants")}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === "participants"
                    ? "bg-white text-gray-900 shadow-sm dark:bg-dark-surface dark:text-dark-text"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Teilnehmer
                </span>
              </button>
              <button
                onClick={() => setViewMode("registrations")}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === "registrations"
                    ? "bg-white text-gray-900 shadow-sm dark:bg-dark-surface dark:text-dark-text"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Anmeldungen
                </span>
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Suche nach Name, E-Mail, Ort, Instrument..."
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-dark-text">
                Status:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RegistrationStatus | "ALL")}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
              >
                <option value="ALL">Alle</option>
                <option value={RegistrationStatus.CONFIRMED}>Bestätigt</option>
                <option value={RegistrationStatus.WAITLIST}>Warteliste</option>
                <option value={RegistrationStatus.CANCELLED}>Storniert</option>
              </select>
            </div>

            {/* Payment Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-dark-text">
                Zahlung:
              </label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as PaymentStatus | "ALL")}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
              >
                <option value="ALL">Alle</option>
                <option value={PaymentStatus.PENDING}>Ausstehend</option>
                <option value={PaymentStatus.PAID}>Bezahlt</option>
                <option value={PaymentStatus.REFUNDED}>Erstattet</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content based on view mode */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
          {registrationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-dark-text">
                Keine Anmeldungen gefunden
              </h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                {searchQuery || statusFilter !== "ALL" || paymentFilter !== "ALL"
                  ? "Versuche andere Filtereinstellungen."
                  : "Noch keine Anmeldungen für diesen Kurs vorhanden."}
              </p>
            </div>
          ) : viewMode === "participants" ? (
            /* Participants Table View */
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200 dark:divide-dark-border">
                <thead className="bg-gray-50 dark:bg-dark-background-secondary">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Ort
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Instrument
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Preiskategorie
                    </th>
                    {/* Custom Fields Headers */}
                    {course.customFields?.map((field) => (
                      <th
                        key={field.id}
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        {field.fieldName}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Anmelder
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-dark-border dark:bg-dark-surface">
                  {filteredRegistrations.flatMap((registration) =>
                    registration.participants.map((participant) => (
                      <tr key={participant.id} className="hover:bg-gray-50 dark:hover:bg-dark-background-secondary">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-dark-text">
                          {participant.firstName} {participant.lastName}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {participant.city || "–"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {participant.instrument || "–"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {participant.priceOption || "–"}
                        </td>
                        {/* Custom Fields Values */}
                        {course.customFields?.map((field) => (
                          <td
                            key={field.id}
                            className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400"
                          >
                            {getCustomFieldValue(participant, field.fieldName)}
                          </td>
                        ))}
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${registrationStatusColors[registration.registrationStatus]}`}
                          >
                            {registrationStatusLabels[registration.registrationStatus]}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {registration.registrantFirstName} {registration.registrantLastName}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Registrations List View */
            <div className="divide-y divide-gray-200 dark:divide-dark-border">
              {filteredRegistrations.map((registration) => (
                <div key={registration.id} className="p-4 sm:p-6">
                  {/* Registration Header */}
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text">
                        {registration.registrantFirstName} {registration.registrantLastName}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                        <a
                          href={`mailto:${registration.registrantEmail}`}
                          className="hover:text-primary"
                        >
                          {registration.registrantEmail}
                        </a>
                        {registration.registrantPhone && (
                          <a
                            href={`tel:${registration.registrantPhone}`}
                            className="hover:text-primary"
                          >
                            {registration.registrantPhone}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${registrationStatusColors[registration.registrationStatus]}`}
                      >
                        {registrationStatusLabels[registration.registrationStatus]}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${paymentStatusColors[registration.paymentStatus]}`}
                      >
                        {paymentStatusLabels[registration.paymentStatus]}
                      </span>
                    </div>
                  </div>

                  {/* Participants Table */}
                  {registration.participants.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-dark-border">
                      <table className="w-full divide-y divide-gray-200 dark:divide-dark-border">
                        <thead className="bg-gray-50 dark:bg-dark-background-secondary">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Ort
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Instrument
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Preiskategorie
                            </th>
                            {/* Custom Fields Headers */}
                            {course.customFields?.map((field) => (
                              <th
                                key={field.id}
                                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                              >
                                {field.fieldName}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white dark:divide-dark-border dark:bg-dark-surface">
                          {registration.participants.map((participant) => (
                            <tr key={participant.id}>
                              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-dark-text">
                                {participant.firstName} {participant.lastName}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                {participant.city || "–"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                {participant.instrument || "–"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                {participant.priceOption || "–"}
                              </td>
                              {/* Custom Fields Values */}
                              {course.customFields?.map((field) => (
                                <td
                                  key={field.id}
                                  className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
                                >
                                  {getCustomFieldValue(participant, field.fieldName)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Registration Footer */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Angemeldet am{" "}
                      {new Date(registration.createdAt).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-dark-text">
                      Gesamt: {registration.totalPrice.toFixed(2)} €
                    </span>
                  </div>

                  {/* Notes */}
                  {registration.notes && (
                    <div className="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-dark-background-secondary">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Anmerkungen:</span> {registration.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results count */}
        {filteredRegistrations.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {filteredRegistrations.length} von {registrationsData?.registrations.length ?? 0} Anmeldungen
            {" • "}
            {filteredRegistrations.reduce((sum, r) => sum + r.participants.length, 0)} Teilnehmer
          </div>
        )}
      </div>
    </main>
  );
}
