"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import DashboardPage from "@/app/_components/dashboard/dashboard-page";
import { InvoiceStatusBadge } from "@/app/_components/dashboard/invoice-status-badge";
import { usePermissions } from "@/lib/use-permissions";
import type { PermissionKey } from "@/lib/permissions";
import { formatDate, formatEuro } from "@/lib/invoice-document";
import { InvoiceStatus, PaymentStatus } from "~/generated/prisma/enums";
import { DownloadIcon, ReceiptTextIcon, SearchIcon } from "lucide-react";

const PAGE_SIZE = 25;

const statusOptions = [
  { value: "", label: "Alle Status" },
  { value: InvoiceStatus.DRAFT, label: "Entwurf" },
  { value: InvoiceStatus.PUBLISHED, label: "Ausgestellt" },
  { value: InvoiceStatus.CANCELLED, label: "Storniert" },
];

/** Invoice years to offer in the filter: the current one and the four before. */
function recentYears(): number[] {
  const current = new Date().getFullYear();
  return [0, 1, 2, 3, 4].map((offset) => current - offset);
}

export default function InvoiceArchivePage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canView = hasPermission("invoices.view" as PermissionKey);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = api.invoices.list.useQuery(
    {
      page,
      limit: PAGE_SIZE,
      status: status ? (status as InvoiceStatus) : undefined,
      courseId: courseId || undefined,
      year: year ? Number(year) : undefined,
      search: search || undefined,
    },
    { enabled: !!session?.user && canView },
  );

  const { data: courses } = api.invoices.archiveCourses.useQuery(undefined, {
    enabled: !!session?.user && canView,
  });

  const resetToFirstPage = () => setPage(1);

  if (sessionLoading || permissionsLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!canView) {
    return (
      <DashboardPage title="Rechnungsarchiv">
        <div className="dark:bg-dark-surface rounded-lg bg-white p-8 text-center shadow">
          <p className="dark:text-dark-muted text-gray-600">
            Du hast keine Berechtigung, das Rechnungsarchiv einzusehen.
          </p>
          <Link
            href="/dashboard"
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zum Dashboard
          </Link>
        </div>
      </DashboardPage>
    );
  }

  const selectClass =
    "dark:border-dark-border dark:bg-dark-background dark:text-dark-text rounded-md border border-gray-300 px-3 py-2 text-sm";

  return (
    <DashboardPage
      title="Rechnungsarchiv"
      description="Alle erstellten Rechnungen aller Kurse — aufbewahrungspflichtig und unveränderlich."
    >
      {/* Filters */}
      <div className="dark:bg-dark-surface mb-6 rounded-lg bg-white p-4 shadow">
        <div className="flex flex-wrap items-end gap-3">
          <form
            className="flex min-w-[240px] flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput.trim());
              resetToFirstPage();
            }}
          >
            <div className="relative flex-1">
              <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Nummer, Empfänger oder Kurs"
                aria-label="Rechnungen durchsuchen"
                className={`${selectClass} w-full pl-9`}
              />
            </div>
            <button
              type="submit"
              className="bg-primary hover:bg-primary/90 rounded-md px-3 py-2 text-sm font-medium text-white"
            >
              Suchen
            </button>
          </form>

          <select
            aria-label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              resetToFirstPage();
            }}
            className={selectClass}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Kurs"
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value);
              resetToFirstPage();
            }}
            className={`${selectClass} max-w-[260px]`}
          >
            <option value="">Alle Kurse</option>
            {courses?.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title} ({course.invoiceCount})
              </option>
            ))}
          </select>

          <select
            aria-label="Jahr"
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              resetToFirstPage();
            }}
            className={selectClass}
          >
            <option value="">Alle Jahre</option>
            {recentYears().map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="dark:bg-dark-surface rounded-lg bg-white p-4 shadow">
          <p className="dark:text-dark-muted text-xs text-gray-500">
            Rechnungen in dieser Auswahl
          </p>
          <p className="dark:text-dark-text mt-1 text-2xl font-semibold text-gray-900">
            {data?.total ?? 0}
          </p>
        </div>
        <div className="dark:bg-dark-surface rounded-lg bg-white p-4 shadow">
          <p className="dark:text-dark-muted text-xs text-gray-500">
            Summe der ausgestellten Rechnungen
          </p>
          <p className="dark:text-dark-text mt-1 text-2xl font-semibold text-gray-900">
            {formatEuro(data?.publishedTotal ?? 0)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="dark:bg-dark-surface overflow-hidden rounded-lg bg-white shadow">
        {isLoading ? (
          <p className="dark:text-dark-muted p-6 text-sm text-gray-500">Lade…</p>
        ) : (data?.invoices.length ?? 0) === 0 ? (
          <div className="p-10 text-center">
            <ReceiptTextIcon className="mx-auto h-10 w-10 text-gray-300" />
            <p className="dark:text-dark-text mt-3 font-medium text-gray-900">
              Keine Rechnungen gefunden
            </p>
            <p className="dark:text-dark-muted mt-1 text-sm text-gray-500">
              Passe die Filter an oder erstelle Rechnungen im jeweiligen Kurs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="dark:bg-dark-background-secondary dark:text-dark-muted bg-gray-50 text-xs tracking-wide text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Nummer</th>
                  <th className="px-4 py-3">Empfänger</th>
                  <th className="px-4 py-3">Kurs</th>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3 text-right">Betrag</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="dark:divide-dark-border divide-y divide-gray-200">
                {data?.invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="dark:hover:bg-dark-background-secondary hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/courses/${invoice.course.id}/invoices/${invoice.id}`}
                        className="dark:text-dark-text font-medium text-gray-900 hover:underline"
                      >
                        {invoice.invoiceNumber ?? "Entwurf"}
                      </Link>
                      {invoice.replaces?.invoiceNumber && (
                        <span className="dark:text-dark-muted block text-xs text-gray-500">
                          ersetzt {invoice.replaces.invoiceNumber}
                        </span>
                      )}
                      {invoice.replacedBy?.invoiceNumber && (
                        <span className="dark:text-dark-muted block text-xs text-gray-500">
                          ersetzt durch {invoice.replacedBy.invoiceNumber}
                        </span>
                      )}
                    </td>
                    <td className="dark:text-dark-text px-4 py-3 text-gray-700">
                      <span className="block">
                        {[
                          invoice.recipientCompany,
                          `${invoice.recipientFirstName ?? ""} ${invoice.recipientLastName ?? ""}`.trim(),
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                      {invoice.recipientEmail && (
                        <span className="dark:text-dark-muted block text-xs text-gray-500">
                          {invoice.recipientEmail}
                        </span>
                      )}
                    </td>
                    {/* Not a link to the course's invoice list: that page is
                        organizer-only, and this archive is open to anyone with
                        invoices.view. The number beside it opens the read-only
                        detail view instead. */}
                    <td className="dark:text-dark-muted px-4 py-3 text-gray-600">
                      {invoice.course.title}
                    </td>
                    <td className="dark:text-dark-muted px-4 py-3 whitespace-nowrap text-gray-600">
                      {invoice.invoiceDate
                        ? formatDate(invoice.invoiceDate)
                        : "—"}
                    </td>
                    <td className="dark:text-dark-text px-4 py-3 text-right font-medium whitespace-nowrap text-gray-900">
                      {formatEuro(invoice.totalAmount)}
                      {invoice.registration?.paymentStatus ===
                        PaymentStatus.PAID && (
                        <span className="block text-xs font-normal text-green-600 dark:text-green-400">
                          bezahlt
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={invoice.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {invoice.pdfPath ? (
                        <a
                          href={`/api/invoices/${invoice.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`PDF ${invoice.invoiceNumber ?? ""} öffnen`}
                          className="text-primary inline-flex items-center gap-1 hover:underline"
                        >
                          <DownloadIcon className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="dark:text-dark-muted text-xs text-gray-400">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {(data?.pages ?? 0) > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            Zurück
          </button>
          <span className="dark:text-dark-muted text-sm text-gray-600">
            Seite {page} von {data?.pages}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(data?.pages ?? current, current + 1))
            }
            disabled={page >= (data?.pages ?? 1)}
            className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            Weiter
          </button>
        </div>
      )}
    </DashboardPage>
  );
}
