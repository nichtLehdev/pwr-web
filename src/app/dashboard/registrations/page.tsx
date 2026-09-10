"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, type RouterOutputs } from "@/trpc/react";
import { DashboardPage } from "@/app/_components/dashboard";
import {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui/data-table";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import {
  RegistrationStatus,
  SiblingDiscountStatus,
} from "~/generated/prisma/enums";
import { RegistrationPaymentBadge } from "@/app/_components/dashboard/invoice-payment-badge";
import { registrationPaymentState } from "@/lib/invoice-payment";
import type {
  ColumnFiltersState,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { PencilIcon, SearchIcon, UsersIcon } from "lucide-react";

type AdminRegistration =
  RouterOutputs["registrations"]["getAllAdmin"]["registrations"][number];

const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  CONFIRMED: "Bestätigt",
  WAITLIST: "Warteliste",
  CANCELLED: "Storniert",
};

const REGISTRATION_STATUS_BADGES: Record<RegistrationStatus, string> = {
  CONFIRMED:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  WAITLIST:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const DISCOUNT_OPTIONS = [
  { value: SiblingDiscountStatus.PENDING, label: "Wartet auf Freigabe" },
  { value: SiblingDiscountStatus.APPROVED, label: "Genehmigt" },
  { value: SiblingDiscountStatus.REJECTED, label: "Abgelehnt" },
];

const PAYMENT_OPTIONS = [
  { value: "open", label: "Offen" },
  { value: "paid", label: "Bezahlt" },
];

/** The columns the server can sort by. */
const SORTABLE_COLUMNS = {
  registrant: "registrant",
  course: "course",
  totalPrice: "totalPrice",
  status: "status",
  createdAt: "createdAt",
} as const;

type SortableColumn = keyof typeof SORTABLE_COLUMNS;

const column = createDataTableColumnHelper<AdminRegistration>();

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

/** Reads one set filter out of the table's filter state. */
function setFilterValues(filters: ColumnFiltersState, id: string): string[] {
  const value = filters.find((filter) => filter.id === id)?.value;
  return Array.isArray(value) ? (value as string[]) : [];
}

export default function AdminRegistrationsPage() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();

  const canViewAll = hasPermission(PERMISSIONS.COURSES_MANAGE_REGISTRATIONS);
  /**
   * Wer nur den Geschwisterkindrabatt verwaltet, sieht hier ausschließlich
   * Anmeldungen mit Rabattstatus — über die entscheidet er, über alle anderen
   * nicht. Der Server lässt die Abfrage für ihn deshalb auch nur mit gesetztem
   * Rabattfilter zu, weshalb "Alle" für ihn keine wählbare Option ist.
   */
  const discountOnly =
    !canViewAll &&
    hasPermission(PERMISSIONS.REGISTRATIONS_MANAGE_SIBLING_DISCOUNT);
  const canView = canViewAll || discountOnly;

  // Vorbelegt über ?discount=PENDING — so landet die Freigabe-Kachel des
  // Dashboards direkt auf den offenen Rabatten statt auf der vollen Liste.
  const searchParams = useSearchParams();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
    const requested = searchParams.get("discount");
    // NONE ist kein Rabattstatus, den man hier prüfen würde, und steht auch im
    // Filter nicht zur Wahl — aus der URL wird er deshalb nicht übernommen.
    const initial =
      requested &&
      requested !== SiblingDiscountStatus.NONE &&
      Object.values(SiblingDiscountStatus).includes(
        requested as SiblingDiscountStatus,
      )
        ? requested
        : discountOnly
          ? SiblingDiscountStatus.PENDING
          : null;
    return initial ? [{ id: "discount", value: [initial] }] : [];
  });

  // Die Liste geht über alle Kurse und wird serverseitig geblättert; Sortierung,
  // Spaltenfilter und Suche sind darum Abfrageparameter — sonst würden sie nur
  // die gerade geladene Seite betreffen.
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [search, setSearch] = useState("");

  const courseFilter = setFilterValues(columnFilters, "course");
  const statusFilter = setFilterValues(columnFilters, "status");
  const paymentFilter = setFilterValues(columnFilters, "payment");
  const discountFilter = setFilterValues(columnFilters, "discount");

  const { data, isLoading } = api.registrations.getAllAdmin.useQuery(
    {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: search || undefined,
      registrationStatus: statusFilter.length
        ? (statusFilter as RegistrationStatus[])
        : undefined,
      // Nur eindeutig: "offen" und "bezahlt" zugleich ist dasselbe wie kein
      // Filter, denn der Server kennt hier nur ein Ja/Nein.
      paid:
        paymentFilter.length === 1 ? paymentFilter[0] === "paid" : undefined,
      siblingDiscountStatus: discountFilter.length
        ? (discountFilter as SiblingDiscountStatus[])
        : undefined,
      courseId: courseFilter.length ? courseFilter : undefined,
      sortBy:
        SORTABLE_COLUMNS[(sorting[0]?.id ?? "createdAt") as SortableColumn],
      sortOrder: sorting[0]?.desc === false ? "asc" : "desc",
    },
    { enabled: canView && (canViewAll || discountFilter.length > 0) },
  );

  const { data: courses } =
    api.registrations.getCoursesWithRegistrations.useQuery(undefined, {
      enabled: canViewAll,
    });

  const columns = useMemo<DataTableColumn<AdminRegistration>[]>(
    () =>
      column.columns([
        column.accessor(
          (registration) =>
            `${registration.registrantFirstName} ${registration.registrantLastName}`,
          {
            id: "registrant",
            header: "Anmelder:in",
            enableColumnFilter: false,
            meta: { alwaysVisible: true },
            cell: ({ row }) => (
              <>
                <Link
                  href={`/dashboard/courses/${row.original.course.id}/participants/${row.original.id}`}
                  className="text-primary font-medium hover:underline"
                >
                  {row.original.registrantFirstName}{" "}
                  {row.original.registrantLastName}
                </Link>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {row.original.registrantEmail}
                </p>
              </>
            ),
          },
        ),
        column.accessor((registration) => registration.course.id, {
          id: "course",
          header: "Kurs",
          meta: {
            filterVariant: "set",
            label: "Kurs",
            filterOptions: (courses ?? []).map((course) => ({
              value: course.id,
              label: `${course.title} (${formatDate(course.startDate)})`,
            })),
          },
          cell: ({ row }) => (
            <>
              <Link
                href={`/dashboard/courses/${row.original.course.id}/participants`}
                className="dark:text-dark-text text-gray-900 hover:underline"
              >
                {row.original.course.title}
              </Link>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(row.original.course.startDate)}
              </p>
            </>
          ),
        }),
        column.accessor((registration) => registration._count.participants, {
          id: "participants",
          header: "Teiln.",
          enableSorting: false,
          enableColumnFilter: false,
          meta: {
            align: "right",
            label: "Teilnehmerzahl",
            cellClassName: "tabular-nums",
          },
        }),
        column.accessor((registration) => registration.registrationStatus, {
          id: "status",
          header: "Status",
          meta: {
            filterVariant: "set",
            filterOptions: Object.entries(REGISTRATION_STATUS_LABELS).map(
              ([value, label]) => ({ value, label }),
            ),
          },
          cell: ({ row }) => (
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${REGISTRATION_STATUS_BADGES[row.original.registrationStatus]}`}
            >
              {REGISTRATION_STATUS_LABELS[row.original.registrationStatus]}
            </span>
          ),
        }),
        column.accessor(
          (registration) =>
            registrationPaymentState(registration.invoices) === "PAID"
              ? "paid"
              : "open",
          {
            id: "payment",
            header: "Zahlung",
            enableSorting: false,
            meta: { filterVariant: "set", filterOptions: PAYMENT_OPTIONS },
            cell: ({ row }) => (
              <RegistrationPaymentBadge invoices={row.original.invoices} />
            ),
          },
        ),
        column.accessor((registration) => registration.totalPrice, {
          id: "totalPrice",
          header: "Betrag",
          enableColumnFilter: false,
          meta: { align: "right", cellClassName: "tabular-nums" },
          cell: ({ row }) => (
            <>
              {formatPrice(row.original.totalPrice)}
              {row.original.siblingDiscountStatus ===
                SiblingDiscountStatus.PENDING && (
                <span className="mt-0.5 block text-xs font-medium whitespace-nowrap text-orange-600 dark:text-orange-400">
                  Rabatt prüfen
                  {row.original.siblingDiscountAmount
                    ? ` (${formatPrice(row.original.siblingDiscountAmount)})`
                    : ""}
                </span>
              )}
            </>
          ),
        }),
        column.accessor((registration) => registration.siblingDiscountStatus, {
          id: "discount",
          header: "Rabatt",
          enableSorting: false,
          meta: {
            filterVariant: "set",
            label: "Geschwisterrabatt",
            filterOptions: DISCOUNT_OPTIONS,
          },
          cell: ({ getValue }) =>
            DISCOUNT_OPTIONS.find((option) => option.value === getValue())
              ?.label ?? "–",
        }),
        column.accessor((registration) => registration.invoiceId ?? "", {
          id: "invoice",
          header: "Rechnung",
          enableSorting: false,
          enableColumnFilter: false,
          cell: ({ getValue }) => getValue() || "–",
        }),
        column.accessor((registration) => registration.createdAt, {
          id: "createdAt",
          header: "Datum",
          enableColumnFilter: false,
          meta: { cellClassName: "whitespace-nowrap" },
          cell: ({ getValue }) => formatDate(getValue()),
        }),
        column.display({
          id: "actions",
          header: "Aktionen",
          meta: { align: "right", label: "Aktionen" },
          cell: ({ row }) =>
            // Wer nur den Rabatt prüft, darf die Anmeldung nicht zwangsläufig
            // bearbeiten — er wird auf die Anmeldungsseite geschickt, wo
            // genehmigen und ablehnen sitzen.
            discountOnly ? (
              <Link
                href={`/dashboard/courses/${row.original.course.id}/participants/${row.original.id}`}
                className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <SearchIcon className="h-3.5 w-3.5" />
                Rabatt prüfen
              </Link>
            ) : row.original.registrationStatus !==
              RegistrationStatus.CANCELLED ? (
              <Link
                href={`/registrations/${row.original.id}/edit?returnTo=${encodeURIComponent(
                  "/dashboard/registrations",
                )}`}
                className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <PencilIcon className="h-3.5 w-3.5" />
                Bearbeiten
              </Link>
            ) : null,
        }),
      ]),
    [courses, discountOnly],
  );

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
      description={
        discountOnly
          ? "Anmeldungen mit Geschwisterkindrabatt kursübergreifend prüfen"
          : "Alle Kursanmeldungen kursübergreifend durchsuchen und filtern"
      }
    >
      {discountOnly && discountFilter.length === 0 && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-200">
          Wähle im Spaltenfilter „Rabatt“ einen Status aus — deine Berechtigung
          gilt nur für Anmeldungen mit Geschwisterkindrabatt.
        </div>
      )}

      <DataTable
        data={data?.registrations}
        columns={columns}
        getRowId={(registration) => registration.id}
        isLoading={isLoading}
        rowNoun={["Anmeldung", "Anmeldungen"]}
        searchPlaceholder="Name, E-Mail, Teilnehmer oder Rechnungsnummer…"
        pageSizeOptions={[25, 50, 100, 250]}
        emptyState={
          <span className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
            <UsersIcon className="h-8 w-8" />
            Keine Anmeldungen gefunden.
          </span>
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
