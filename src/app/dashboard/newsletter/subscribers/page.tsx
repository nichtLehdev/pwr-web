"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import Link from "next/link";
import { DashboardPage } from "@/app/_components/dashboard";
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
import { useToast } from "@/app/_components/ui/toast";
import { Mail } from "lucide-react";
import { Tag, type TagTone } from "@/app/_components/programmheft/tag";

/** Gefüllte Werkbank-Schaltfläche, wie auf den Formularseiten des Hefts. */
const BTN_PRIMARY =
  "bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper semi-condensed inline-flex min-h-11 items-center gap-2 px-4 text-sm font-semibold transition-colors";

type Subscriber =
  RouterOutputs["newsletter"]["getSubscribers"]["subscribers"][number];

/** The columns the server can sort by. */
const SORTABLE_COLUMNS = {
  email: "email",
  name: "name",
  subscribedAt: "subscribedAt",
} as const;

type SortableColumn = keyof typeof SORTABLE_COLUMNS;

const STATUS_OPTIONS = [
  { value: "confirmed", label: "Bestätigt" },
  { value: "pending", label: "Ausstehend" },
  { value: "inactive", label: "Inaktiv" },
];

/**
 * `Tag` kennt nur vier Töne. `ink` bleibt `bg-ink text-paper` auch im
 * Nachtdruck (siehe `tag.tsx`) und verschwindet dort fast auf dem fast
 * schwarzen Grund der Werkbank — geprüft an dieser Seite im Nachtdruck.
 * Bestätigt bekommt deshalb `inverse` (im Nachtdruck helles Etikett, wie bei
 * „Bestätigt" in „Meine Anmeldungen"), ausstehend `orange` (braucht
 * Aufmerksamkeit), inaktiv ebenfalls `inverse` (neutral, aber vom
 * Aufmerksamkeits-Ton unterscheidbar durch die Beschriftung selbst).
 */
const SUBSCRIBER_STATUS_TONE: Record<
  "confirmed" | "pending" | "inactive",
  TagTone
> = {
  confirmed: "inverse",
  pending: "orange",
  inactive: "inverse",
};

const column = createDataTableColumnHelper<Subscriber>();

/** Der Status, den die Statusspalte zeigt — passend zum Serverfilter benannt. */
function subscriberStatus(subscriber: Subscriber): string {
  if (!subscriber.isActive) return "inactive";
  return subscriber.confirmedAt ? "confirmed" : "pending";
}

/** Reads one set filter out of the table's filter state. */
function setFilterValues(filters: ColumnFiltersState, id: string): string[] {
  const value = filters.find((filter) => filter.id === id)?.value;
  return Array.isArray(value) ? (value as string[]) : [];
}

export default function DashboardNewsletterSubscribersPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);
  // Die Abonnentenliste wächst unbegrenzt und wird deshalb serverseitig
  // geblättert; Sortierung, Statusfilter und Suche sind darum Abfrageparameter
  // — sonst würden sie nur die gerade geladene Seite betreffen.
  const [sorting, setSorting] = useState<SortingState>([
    { id: "subscribedAt", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const [search, setSearch] = useState("");

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageNewsletter = hasPermission(PERMISSIONS.NEWSLETTER_MANAGE);

  const statusFilter = setFilterValues(columnFilters, "status");

  const { data: subscribersData, isLoading: subscribersLoading } =
    api.newsletter.getSubscribers.useQuery(
      {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        status: statusFilter.length
          ? (statusFilter as ("confirmed" | "pending" | "inactive")[])
          : undefined,
        search: search || undefined,
        sortBy:
          SORTABLE_COLUMNS[
            (sorting[0]?.id ?? "subscribedAt") as SortableColumn
          ],
        sortOrder: sorting[0]?.desc === false ? "asc" : "desc",
      },
      {
        enabled: !!session?.user && !!profile,
      },
    );

  const { data: statistics } = api.newsletter.getStatistics.useQuery(
    undefined,
    {
      enabled: !!session?.user && !!profile,
    },
  );

  const utils = api.useUtils();
  const toast = useToast();

  const deleteSubscriber = api.newsletter.deleteSubscriber.useMutation({
    // Invalidate instead of reloading the page — a full reload threw away
    // the current search text, filter and page on every single delete.
    onSuccess: () => {
      toast.success("Abonnent gelöscht");
      void utils.newsletter.getSubscribers.invalidate();
      void utils.newsletter.getStatistics.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Löschen des Abonnenten");
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/newsletter/subscribers");
    }
  }, [isPending, session]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManageNewsletter &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      redirect("/dashboard");
    }
  }, [profile, profileLoading, permissionsLoading, canManageNewsletter]);

  const columns = useMemo<DataTableColumn<Subscriber>[]>(
    () =>
      column.columns([
        column.accessor((subscriber) => subscriber.email, {
          id: "email",
          header: "E-Mail",
          enableColumnFilter: false,
          meta: { alwaysVisible: true, cellClassName: "whitespace-nowrap" },
        }),
        column.accessor((subscriber) => subscriber.name ?? "", {
          id: "name",
          header: "Name",
          enableColumnFilter: false,
          cell: ({ getValue }) => getValue() || "-",
        }),
        column.accessor(subscriberStatus, {
          id: "status",
          header: "Status",
          enableSorting: false,
          meta: { filterVariant: "set", filterOptions: STATUS_OPTIONS },
          cell: ({ row }) => {
            const subscriber = row.original;
            if (subscriber.isActive && subscriber.confirmedAt) {
              return (
                <Tag tone={SUBSCRIBER_STATUS_TONE.confirmed}>Bestätigt</Tag>
              );
            }
            if (subscriber.isActive) {
              return (
                <span title="Anmeldung wurde noch nicht über den Link in der Bestätigungs-E-Mail bestätigt — erhält keinen Newsletter.">
                  <Tag tone={SUBSCRIBER_STATUS_TONE.pending}>Ausstehend</Tag>
                </span>
              );
            }
            return <Tag tone={SUBSCRIBER_STATUS_TONE.inactive}>Inaktiv</Tag>;
          },
        }),
        column.accessor((subscriber) => subscriber.subscribedAt, {
          id: "subscribedAt",
          header: "Abonniert am",
          enableColumnFilter: false,
          meta: { cellClassName: "whitespace-nowrap" },
          cell: ({ getValue }) =>
            new Date(getValue()).toLocaleDateString("de-DE"),
        }),
        column.display({
          id: "actions",
          header: "Aktionen",
          meta: { align: "right", label: "Aktionen" },
          cell: ({ row }) => (
            <button
              onClick={() => {
                if (
                  confirm(`Möchtest du ${row.original.email} wirklich löschen?`)
                ) {
                  deleteSubscriber.mutate({ id: row.original.id });
                }
              }}
              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
            >
              Löschen
            </button>
          ),
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (isPending || profileLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageNewsletter) {
    return null;
  }

  return (
    <DashboardPage
      title="Newsletter Abonnenten"
      description="Verwalte Newsletter-Abonnenten"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Newsletter", href: "/dashboard/newsletter" },
        { label: "Abonnenten" },
      ]}
      actions={
        <Link href="/dashboard/newsletter/compose" className={BTN_PRIMARY}>
          <Mail className="h-4 w-4" aria-hidden />
          Newsletter erstellen
        </Link>
      }
    >
      {/* Statistics */}
      {statistics && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-rule/25 dark:bg-night-raised p-4">
            <p className="text-dark dark:text-night-muted text-sm">Gesamt</p>
            <p className="text-ink dark:text-night-text text-2xl font-bold">
              {statistics.total}
            </p>
          </div>
          <div className="bg-rule/25 dark:bg-night-raised p-4">
            <p className="text-dark dark:text-night-muted text-sm">Bestätigt</p>
            <p className="dark:text-night-text text-ink text-2xl font-bold">
              {statistics.active}
            </p>
          </div>
          <div className="bg-rule/25 dark:bg-night-raised p-4">
            <p className="text-dark dark:text-night-muted text-sm">
              Bestätigung ausstehend
            </p>
            <p className="text-primary-ink dark:text-primary text-2xl font-bold">
              {statistics.pending}
            </p>
          </div>
          <div className="bg-rule/25 dark:bg-night-raised p-4">
            <p className="text-dark dark:text-night-muted text-sm">Inaktiv</p>
            <p className="text-ink dark:text-night-text text-2xl font-bold">
              {statistics.inactive}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <DataTable
        data={subscribersData?.subscribers}
        columns={columns}
        getRowId={(subscriber) => subscriber.id}
        isLoading={subscribersLoading}
        rowNoun={["Abonnent", "Abonnenten"]}
        searchPlaceholder="Suche nach E-Mail oder Name…"
        pageSizeOptions={[50, 100, 250]}
        emptyState={
          <span className="text-dark dark:text-night-muted">
            Keine Abonnenten gefunden.
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
        rowCount={subscribersData?.total ?? 0}
      />
    </DashboardPage>
  );
}
