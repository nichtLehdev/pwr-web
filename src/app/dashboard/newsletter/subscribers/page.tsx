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
                <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Bestätigt
                </span>
              );
            }
            if (subscriber.isActive) {
              return (
                <span
                  className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                  title="Anmeldung wurde noch nicht über den Link in der Bestätigungs-E-Mail bestätigt — erhält keinen Newsletter."
                >
                  Ausstehend
                </span>
              );
            }
            return (
              <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                Inaktiv
              </span>
            );
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
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
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
        <Link
          href="/dashboard/newsletter/compose"
          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-white transition-colors"
        >
          <Mail className="h-5 w-5" />
          Newsletter erstellen
        </Link>
      }
    >
      {/* Statistics */}
      {statistics && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700">
            <p className="dark:text-dark-muted text-sm text-gray-600">Gesamt</p>
            <p className="dark:text-dark-text text-2xl font-bold text-gray-900">
              {statistics.total}
            </p>
          </div>
          <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700">
            <p className="dark:text-dark-muted text-sm text-gray-600">
              Bestätigt
            </p>
            <p className="dark:text-dark-text text-2xl font-bold text-green-600">
              {statistics.active}
            </p>
          </div>
          <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700">
            <p className="dark:text-dark-muted text-sm text-gray-600">
              Bestätigung ausstehend
            </p>
            <p className="dark:text-dark-text text-2xl font-bold text-yellow-600">
              {statistics.pending}
            </p>
          </div>
          <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700">
            <p className="dark:text-dark-muted text-sm text-gray-600">
              Inaktiv
            </p>
            <p className="dark:text-dark-text text-2xl font-bold text-gray-600">
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
          <span className="dark:text-dark-muted text-gray-600">
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
