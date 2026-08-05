"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { DashboardPage } from "@/app/_components/dashboard";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { PaymentStatus, RegistrationStatus } from "~/generated/prisma/enums";
import { SearchIcon, UsersIcon } from "lucide-react";

const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  CONFIRMED: "Bestätigt",
  WAITLIST: "Warteliste",
  CANCELLED: "Storniert",
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Offen",
  PAID: "Bezahlt",
  REFUNDED: "Erstattet",
};

const REGISTRATION_STATUS_BADGES: Record<RegistrationStatus, string> = {
  CONFIRMED:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  WAITLIST:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const PAYMENT_STATUS_BADGES: Record<PaymentStatus, string> = {
  PENDING:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  REFUNDED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export default function AdminRegistrationsPage() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState<
    RegistrationStatus | ""
  >("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">("");
  const [courseId, setCourseId] = useState("");

  const canView = hasPermission(PERMISSIONS.COURSES_MANAGE_REGISTRATIONS);

  const { data, isLoading } = api.registrations.getAllAdmin.useQuery(
    {
      page,
      limit: 25,
      search: search || undefined,
      registrationStatus: registrationStatus || undefined,
      paymentStatus: paymentStatus || undefined,
      courseId: courseId || undefined,
    },
    { enabled: canView },
  );

  const { data: courses } =
    api.registrations.getCoursesWithRegistrations.useQuery(undefined, {
      enabled: canView,
    });

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  if (!permissionsLoading && !canView) {
    return (
      <DashboardPage title="Anmeldungen">
        <p className="text-gray-600 dark:text-gray-400">
          Du hast keine Berechtigung, diese Seite zu sehen.
        </p>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage
      title="Anmeldungen"
      description="Alle Kursanmeldungen kursübergreifend durchsuchen und filtern"
    >
      <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <form onSubmit={applySearch} className="flex-1">
            <label
              htmlFor="registration-search"
              className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700"
            >
              Suche
            </label>
            <div className="flex gap-2">
              <input
                id="registration-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Name, E-Mail, Teilnehmer oder Rechnungsnummer…"
                className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="bg-primary hover:bg-primary-dark flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white"
              >
                <SearchIcon className="h-4 w-4" />
                Suchen
              </button>
            </div>
          </form>

          <div>
            <label
              htmlFor="filter-course"
              className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700"
            >
              Kurs
            </label>
            <select
              id="filter-course"
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                setPage(1);
              }}
              className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 text-sm lg:w-64"
            >
              <option value="">Alle Kurse</option>
              {courses?.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} ({formatDate(course.startDate)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-status"
              className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="filter-status"
              value={registrationStatus}
              onChange={(e) => {
                setRegistrationStatus(
                  e.target.value as RegistrationStatus | "",
                );
                setPage(1);
              }}
              className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Alle</option>
              {Object.entries(REGISTRATION_STATUS_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-payment"
              className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700"
            >
              Zahlung
            </label>
            <select
              id="filter-payment"
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value as PaymentStatus | "");
                setPage(1);
              }}
              className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Alle</option>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="dark:bg-dark-surface dark:border-dark-border overflow-hidden rounded-lg border border-gray-200 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          </div>
        ) : !data || data.registrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-gray-500 dark:text-gray-400">
            <UsersIcon className="h-8 w-8" />
            <p>Keine Anmeldungen gefunden.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    {[
                      "Anmelder:in",
                      "Kurs",
                      "Teiln.",
                      "Status",
                      "Zahlung",
                      "Betrag",
                      "Rechnung",
                      "Datum",
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.registrations.map((registration) => (
                    <tr
                      key={registration.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/40"
                    >
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/dashboard/courses/${registration.course.id}/participants/${registration.id}`}
                          className="text-primary font-medium hover:underline"
                        >
                          {registration.registrantFirstName}{" "}
                          {registration.registrantLastName}
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {registration.registrantEmail}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/dashboard/courses/${registration.course.id}/participants`}
                          className="dark:text-dark-text text-gray-900 hover:underline"
                        >
                          {registration.course.title}
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(registration.course.startDate)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 tabular-nums dark:text-gray-300">
                        {registration._count.participants}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${REGISTRATION_STATUS_BADGES[registration.registrationStatus]}`}
                        >
                          {
                            REGISTRATION_STATUS_LABELS[
                              registration.registrationStatus
                            ]
                          }
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STATUS_BADGES[registration.paymentStatus]}`}
                        >
                          {PAYMENT_STATUS_LABELS[registration.paymentStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 tabular-nums dark:text-gray-300">
                        {formatPrice(registration.totalPrice)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {registration.invoiceId ?? "–"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(registration.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="dark:border-dark-border flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm">
              <p className="text-gray-600 dark:text-gray-400">
                {data.total} {data.total === 1 ? "Anmeldung" : "Anmeldungen"}
              </p>
              {data.pages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="dark:border-dark-border rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
                  >
                    Zurück
                  </button>
                  <span className="text-gray-600 dark:text-gray-400">
                    Seite {page} von {data.pages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                    disabled={page >= data.pages}
                    className="dark:border-dark-border rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
                  >
                    Weiter
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardPage>
  );
}
