"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api, type RouterOutputs } from "@/trpc/react";
import DashboardPage from "@/app/_components/dashboard/dashboard-page";
import { InvoiceStatusBadge } from "@/app/_components/dashboard/invoice-status-badge";
import { usePermissions } from "@/lib/use-permissions";
import type { PermissionKey } from "@/lib/permissions";
import { formatDate, formatEuro } from "@/lib/invoice-document";
import { InvoiceStatus } from "~/generated/prisma/enums";
import { InvoicePaymentBadge } from "@/app/_components/dashboard/invoice-payment-badge";
import { invoiceOpenAmount } from "@/lib/invoice-payment";
import {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui/data-table";
import type {
  ColumnFiltersState,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { DownloadIcon, ReceiptTextIcon } from "lucide-react";

type ArchiveInvoice = RouterOutputs["invoices"]["list"]["invoices"][number];

/** The column ids the server can sort by, keyed by table column id. */
const SORTABLE_COLUMNS = {
  invoiceNumber: "invoiceNumber",
  recipient: "recipient",
  course: "course",
  invoiceDate: "invoiceDate",
  totalAmount: "totalAmount",
  status: "status",
} as const;

type SortableColumn = keyof typeof SORTABLE_COLUMNS;

const STATUS_OPTIONS = [
  { value: InvoiceStatus.DRAFT, label: "Entwurf" },
  { value: InvoiceStatus.PUBLISHED, label: "Ausgestellt" },
  { value: InvoiceStatus.CANCELLED, label: "Storniert" },
];

/** Invoice years to offer in the date filter: the current one and the four before. */
function recentYears(): number[] {
  const current = new Date().getFullYear();
  return [0, 1, 2, 3, 4].map((offset) => current - offset);
}

const column = createDataTableColumnHelper<ArchiveInvoice>();

function recipientName(invoice: ArchiveInvoice): string {
  return (
    [
      invoice.recipientCompany,
      `${invoice.recipientFirstName ?? ""} ${invoice.recipientLastName ?? ""}`.trim(),
    ]
      .filter(Boolean)
      .join(" · ") || "—"
  );
}

/** Reads one set filter out of the table's filter state. */
function setFilter(filters: ColumnFiltersState, id: string): string[] {
  const value = filters.find((filter) => filter.id === id)?.value;
  return Array.isArray(value) ? (value as string[]) : [];
}

export default function InvoiceArchivePage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canView = hasPermission("invoices.view" as PermissionKey);

  // The archive is paged on the server, so sorting, the set filters and the
  // search term are query input rather than something the table does locally —
  // otherwise each of them would only ever see the 25 rows already fetched.
  const [sorting, setSorting] = useState<SortingState>([
    { id: "invoiceDate", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [search, setSearch] = useState("");

  const sortBy = (sorting[0]?.id ?? "invoiceDate") as SortableColumn;
  const courseFilter = setFilter(columnFilters, "course");
  const statusFilter = setFilter(columnFilters, "status");
  const yearFilter = setFilter(columnFilters, "invoiceDate");

  const { data, isLoading } = api.invoices.list.useQuery(
    {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      status: statusFilter.length
        ? (statusFilter as InvoiceStatus[])
        : undefined,
      courseId: courseFilter.length ? courseFilter : undefined,
      year: yearFilter.length ? yearFilter.map(Number) : undefined,
      search: search || undefined,
      sortBy: SORTABLE_COLUMNS[sortBy] ?? "invoiceDate",
      sortOrder: sorting[0]?.desc === false ? "asc" : "desc",
    },
    { enabled: !!session?.user && canView },
  );

  const { data: courses } = api.invoices.archiveCourses.useQuery(undefined, {
    enabled: !!session?.user && canView,
  });

  const manageableCourses = useMemo(
    () => new Set(data?.manageableCourseIds ?? []),
    [data?.manageableCourseIds],
  );

  const columns = useMemo<DataTableColumn<ArchiveInvoice>[]>(
    () =>
      column.columns([
        column.accessor((invoice) => invoice.invoiceNumber ?? "Entwurf", {
          id: "invoiceNumber",
          header: "Nummer",
          enableColumnFilter: false,
          meta: { alwaysVisible: true },
          cell: ({ row }) => (
            <>
              <Link
                href={`/dashboard/courses/${row.original.course.id}/invoices/${row.original.id}`}
                className="dark:text-dark-text font-medium text-gray-900 hover:underline"
              >
                {row.original.invoiceNumber ?? "Entwurf"}
              </Link>
              {row.original.replaces?.invoiceNumber && (
                <span className="dark:text-dark-muted block text-xs text-gray-500">
                  ersetzt {row.original.replaces.invoiceNumber}
                </span>
              )}
              {row.original.replacedBy?.invoiceNumber && (
                <span className="dark:text-dark-muted block text-xs text-gray-500">
                  ersetzt durch {row.original.replacedBy.invoiceNumber}
                </span>
              )}
            </>
          ),
        }),
        column.accessor(recipientName, {
          id: "recipient",
          header: "Empfänger",
          enableColumnFilter: false,
          cell: ({ row }) => (
            <>
              <span className="block">{recipientName(row.original)}</span>
              {row.original.recipientEmail && (
                <span className="dark:text-dark-muted block text-xs text-gray-500">
                  {row.original.recipientEmail}
                </span>
              )}
            </>
          ),
        }),
        column.accessor((invoice) => invoice.course.id, {
          id: "course",
          header: "Kurs",
          meta: {
            filterVariant: "set",
            label: "Kurs",
            filterOptions: (courses ?? []).map((course) => ({
              value: course.id,
              label: `${course.title} (${course.invoiceCount})`,
            })),
          },
          cell: ({ row }) => {
            const course = row.original.course;
            // Kurs-Organisator:innen springen von hier direkt in die
            // Rechnungsliste des Kurses; wer den Kurs nicht abrechnen darf,
            // bekommt weiterhin nur den Titel — die Seite wäre für sie gesperrt.
            return manageableCourses.has(course.id) ? (
              <Link
                href={`/dashboard/courses/${course.id}/invoices`}
                title="Rechnungen dieses Kurses verwalten"
                className="text-primary inline-flex items-center gap-1 hover:underline"
              >
                <ReceiptTextIcon className="h-3.5 w-3.5 shrink-0" />
                {course.title}
              </Link>
            ) : (
              <span className="dark:text-dark-muted text-gray-600">
                {course.title}
              </span>
            );
          },
        }),
        column.accessor((invoice) => invoice.invoiceDate, {
          id: "invoiceDate",
          header: "Datum",
          meta: {
            filterVariant: "set",
            label: "Jahr",
            cellClassName: "whitespace-nowrap",
            filterOptions: recentYears().map((year) => ({
              value: String(year),
              label: String(year),
            })),
          },
          cell: ({ row }) =>
            row.original.invoiceDate
              ? formatDate(row.original.invoiceDate)
              : "—",
        }),
        column.accessor((invoice) => invoice.totalAmount, {
          id: "totalAmount",
          header: "Betrag",
          enableColumnFilter: false,
          meta: {
            align: "right",
            cellClassName: "whitespace-nowrap font-medium",
          },
          cell: ({ row }) => {
            const invoice = row.original;
            return (
              <>
                {formatEuro(invoice.totalAmount)}
                {invoice.status === InvoiceStatus.PUBLISHED &&
                  (invoice.paidAt ? (
                    <span className="block text-xs font-normal text-green-600 dark:text-green-400">
                      {invoiceOpenAmount(invoice) > 0
                        ? `${formatEuro(invoiceOpenAmount(invoice))} offen`
                        : "bezahlt"}
                    </span>
                  ) : (
                    <span className="block text-xs font-normal text-amber-600 dark:text-amber-400">
                      offen
                    </span>
                  ))}
              </>
            );
          },
        }),
        column.accessor((invoice) => invoice.status, {
          id: "status",
          header: "Status",
          meta: { filterVariant: "set", filterOptions: STATUS_OPTIONS },
          cell: ({ row }) => (
            <div className="flex flex-wrap items-center gap-1">
              <InvoiceStatusBadge status={row.original.status} />
              <InvoicePaymentBadge invoice={row.original} />
            </div>
          ),
        }),
        column.display({
          id: "pdf",
          header: "PDF",
          meta: { align: "right", label: "PDF" },
          cell: ({ row }) =>
            row.original.pdfPath ? (
              <a
                href={`/api/invoices/${row.original.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                aria-label={`PDF ${row.original.invoiceNumber ?? ""} öffnen`}
                className="text-primary inline-flex items-center gap-1 hover:underline"
              >
                <DownloadIcon className="h-4 w-4" />
              </a>
            ) : (
              <span className="dark:text-dark-muted text-xs text-gray-400">
                —
              </span>
            ),
        }),
      ]),
    [courses, manageableCourses],
  );

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

  // Genau ein Kurs ausgewählt und abrechenbar: dann ist der Sprung in dessen
  // Rechnungsliste die wahrscheinlichste nächste Handlung.
  const selectedCourse =
    courseFilter.length === 1
      ? courses?.find((course) => course.id === courseFilter[0])
      : undefined;

  return (
    <DashboardPage
      title="Rechnungsarchiv"
      description="Alle erstellten Rechnungen aller Kurse — aufbewahrungspflichtig und unveränderlich."
      actions={
        selectedCourse?.canManage ? (
          <Link
            href={`/dashboard/courses/${selectedCourse.id}/invoices`}
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
          >
            <ReceiptTextIcon className="h-4 w-4" />
            Rechnungen verwalten
          </Link>
        ) : undefined
      }
    >
      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        <div className="dark:bg-dark-surface rounded-lg bg-white p-4 shadow">
          <p className="dark:text-dark-muted text-xs text-gray-500">
            Davon noch offen
          </p>
          <p
            className={`mt-1 text-2xl font-semibold ${
              (data?.openTotal ?? 0) > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-green-600 dark:text-green-400"
            }`}
          >
            {formatEuro(data?.openTotal ?? 0)}
          </p>
        </div>
      </div>

      <DataTable
        data={data?.invoices}
        columns={columns}
        getRowId={(invoice) => invoice.id}
        isLoading={isLoading}
        rowNoun={["Rechnung", "Rechnungen"]}
        searchPlaceholder="Nummer, Empfänger oder Kurs"
        emptyState={
          <>
            <ReceiptTextIcon className="mx-auto h-10 w-10 text-gray-300" />
            <p className="dark:text-dark-text mt-3 font-medium text-gray-900">
              Keine Rechnungen gefunden
            </p>
            <p className="dark:text-dark-muted mt-1 text-sm text-gray-500">
              Passe die Filter an oder erstelle Rechnungen im jeweiligen Kurs.
            </p>
          </>
        }
        sorting={sorting}
        onSortingChange={setSorting}
        manualSorting
        columnFilters={columnFilters}
        onColumnFiltersChange={(updater) => {
          setColumnFilters(updater);
          setPagination((current) => ({ ...current, pageIndex: 0 }));
        }}
        manualFiltering
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPagination((current) => ({ ...current, pageIndex: 0 }));
        }}
        pagination={pagination}
        onPaginationChange={setPagination}
        manualPagination
        rowCount={data?.total ?? 0}
      />
    </DashboardPage>
  );
}
