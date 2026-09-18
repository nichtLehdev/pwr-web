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
import { DownPaymentBadge } from "@/app/_components/dashboard/down-payment-panel";
import {
  DOWN_PAYMENT_STATE_LABELS,
  downPaymentState,
} from "@/lib/course-down-payment";
import { registrationPaymentState } from "@/lib/invoice-payment";
import { Tag, type TagTone } from "@/app/_components/programmheft/tag";
import type {
  ColumnFiltersState,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { PencilIcon, SearchIcon, UsersIcon } from "lucide-react";
import { formatBerlin } from "@/lib/berlin-time";

type AdminRegistration =
  RouterOutputs["registrations"]["getAllAdmin"]["registrations"][number];

const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  CONFIRMED: "Bestätigt",
  WAITLIST: "Warteliste",
  CANCELLED: "Storniert",
};

// Wie bei anderen Zustandsspalten ein Ton pro Status: Bestätigt ist der
// starke Ton, Warteliste der Aufmerksamkeitston (wie sonst „Nur Warteliste"),
// Storniert nutzt den eigens dafür reservierten `cancelled`-Ton.
const REGISTRATION_STATUS_TONE: Record<RegistrationStatus, TagTone> = {
  CONFIRMED: "ink",
  WAITLIST: "orange",
  CANCELLED: "cancelled",
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
  return formatBerlin(date, "datumZweistellig");
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
                  className="text-primary-ink dark:text-primary font-medium hover:underline"
                >
                  {row.original.registrantFirstName}{" "}
                  {row.original.registrantLastName}
                </Link>
                <p className="text-dark dark:text-night-muted text-xs">
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
                className="text-ink dark:text-night-text hover:underline"
              >
                {row.original.course.title}
              </Link>
              <p className="text-dark dark:text-night-muted text-xs">
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
            <Tag
              tone={REGISTRATION_STATUS_TONE[row.original.registrationStatus]}
            >
              {REGISTRATION_STATUS_LABELS[row.original.registrationStatus]}
            </Tag>
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
        column.accessor(
          (registration) =>
            DOWN_PAYMENT_STATE_LABELS[downPaymentState(registration)],
          {
            id: "downPayment",
            header: "Anzahlung",
            enableSorting: false,
            enableColumnFilter: false,
            cell: ({ row }) => (
              <DownPaymentBadge
                registration={row.original}
                withPrefix={false}
              />
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
                <span className="text-primary-ink dark:text-primary mt-0.5 block text-xs font-medium whitespace-nowrap">
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
                className="border-rule dark:border-night-rule text-ink dark:text-night-text bg-paper dark:bg-night hover:bg-rule/30 dark:hover:bg-night-raised inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium transition-colors"
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
                className="border-rule dark:border-night-rule text-ink dark:text-night-text bg-paper dark:bg-night hover:bg-rule/30 dark:hover:bg-night-raised inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium transition-colors"
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
        <p className="text-dark dark:text-night-muted">
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
        // Hinweis statt Alarm: Tinte auf Papier an einer Haarlinie statt
        // gelbem Kasten.
        <div className="border-ink dark:border-night-text text-dark dark:text-night-muted mb-6 border-l-2 py-1 pl-4 text-sm">
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
          <span className="text-dark dark:text-night-muted flex flex-col items-center gap-2">
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
