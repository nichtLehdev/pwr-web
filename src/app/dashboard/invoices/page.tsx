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

/** Gefüllte Werkbank-Schaltfläche, wie auf den Formularseiten des Hefts. */
const BTN_PRIMARY =
  "bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper semi-condensed inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold transition-colors";

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
                className="text-ink dark:text-night-text font-medium hover:underline"
              >
                {row.original.invoiceNumber ?? "Entwurf"}
              </Link>
              {row.original.replaces?.invoiceNumber && (
                <span className="text-dark dark:text-night-muted block text-xs">
                  ersetzt {row.original.replaces.invoiceNumber}
                </span>
              )}
              {row.original.replacedBy?.invoiceNumber && (
                <span className="text-dark dark:text-night-muted block text-xs">
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
                <span className="text-dark dark:text-night-muted block text-xs">
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
                className="text-primary-ink dark:text-primary inline-flex items-center gap-1 hover:underline"
              >
                <ReceiptTextIcon className="h-3.5 w-3.5 shrink-0" />
                {course.title}
              </Link>
            ) : (
              <span className="text-dark dark:text-night-muted">
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
                    <span className="text-dark dark:text-night-muted block text-xs font-normal">
                      {invoiceOpenAmount(invoice) > 0
                        ? `${formatEuro(invoiceOpenAmount(invoice))} offen`
                        : "bezahlt"}
                    </span>
                  ) : (
                    <span className="text-dark dark:text-night-muted block text-xs font-normal">
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
                className="text-primary-ink dark:text-primary inline-flex items-center gap-1 hover:underline"
              >
                <DownloadIcon className="h-4 w-4" />
              </a>
            ) : (
              <span className="text-dark dark:text-night-muted text-xs">—</span>
            ),
        }),
      ]),
    [courses, manageableCourses],
  );

  if (sessionLoading || permissionsLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!canView) {
    return (
      <DashboardPage title="Rechnungsarchiv">
        <div className="border-rule dark:border-night-rule border p-8 text-center">
          <p className="text-dark dark:text-night-muted">
            Du hast keine Berechtigung, das Rechnungsarchiv einzusehen.
          </p>
          <Link href="/dashboard" className="link-ink mt-4 inline-block">
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
            className={BTN_PRIMARY}
          >
            <ReceiptTextIcon className="h-4 w-4" aria-hidden />
            Rechnungen verwalten
          </Link>
        ) : undefined
      }
    >
      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-rule/25 dark:bg-night-raised p-4">
          <p className="text-dark dark:text-night-muted text-xs">
            Rechnungen in dieser Auswahl
          </p>
          <p className="text-ink dark:text-night-text mt-1 text-2xl font-semibold">
            {data?.total ?? 0}
          </p>
        </div>
        <div className="bg-rule/25 dark:bg-night-raised p-4">
          <p className="text-dark dark:text-night-muted text-xs">
            Summe der ausgestellten Rechnungen
          </p>
          <p className="text-ink dark:text-night-text mt-1 text-2xl font-semibold">
            {formatEuro(data?.publishedTotal ?? 0)}
          </p>
        </div>
        <div className="bg-rule/25 dark:bg-night-raised p-4">
          <p className="text-dark dark:text-night-muted text-xs">
            Davon noch offen
          </p>
          <p
            className={`mt-1 text-2xl font-semibold ${
              (data?.openTotal ?? 0) > 0
                ? "text-primary-ink dark:text-primary"
                : "text-ink dark:text-night-text"
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
            <ReceiptTextIcon
              className="text-dark/50 dark:text-night-muted/50 mx-auto h-10 w-10"
              aria-hidden
            />
            <p className="text-ink dark:text-night-text mt-3 font-medium">
              Keine Rechnungen gefunden
            </p>
            <p className="text-dark dark:text-night-muted mt-1 text-sm">
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
