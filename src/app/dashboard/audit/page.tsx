"use client";

import { useMemo, useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { DashboardPage } from "@/app/_components/dashboard";
import {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui/data-table";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import type {
  ColumnFiltersState,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { ShieldIcon } from "lucide-react";

type AuditEntry = RouterOutputs["audit"]["list"]["entries"][number];

/** The columns the server can sort by. */
const SORTABLE_COLUMNS = {
  createdAt: "createdAt",
  actor: "actorEmail",
  action: "action",
  entity: "entityType",
} as const;

type SortableColumn = keyof typeof SORTABLE_COLUMNS;

const column = createDataTableColumnHelper<AuditEntry>();

function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(date));
}

/** Reads one set filter out of the table's filter state. */
function setFilter(filters: ColumnFiltersState, id: string): string[] {
  const value = filters.find((filter) => filter.id === id)?.value;
  return Array.isArray(value) ? (value as string[]) : [];
}

export default function AuditLogPage() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canView = hasPermission(PERMISSIONS.AUDIT_VIEW);

  // Das Audit-Log wächst unbegrenzt und wird deshalb serverseitig geblättert;
  // Sortierung, Spaltenfilter und Suche sind darum Abfrageparameter — sonst
  // würden sie nur die gerade geladenen 50 Zeilen betreffen.
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const [search, setSearch] = useState("");

  const sortBy = (sorting[0]?.id ?? "createdAt") as SortableColumn;
  const actionFilter = setFilter(columnFilters, "action");
  const entityFilter = setFilter(columnFilters, "entity");

  const { data, isLoading } = api.audit.list.useQuery(
    {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: search || undefined,
      action: actionFilter.length ? actionFilter : undefined,
      entityType: entityFilter.length ? entityFilter : undefined,
      sortBy: SORTABLE_COLUMNS[sortBy] ?? "createdAt",
      sortOrder: sorting[0]?.desc === false ? "asc" : "desc",
    },
    { enabled: canView },
  );

  const { data: actions } = api.audit.actions.useQuery(undefined, {
    enabled: canView,
  });
  const { data: entityTypes } = api.audit.entityTypes.useQuery(undefined, {
    enabled: canView,
  });

  const columns = useMemo<DataTableColumn<AuditEntry>[]>(
    () =>
      column.columns([
        column.accessor((entry) => entry.createdAt, {
          id: "createdAt",
          header: "Zeitpunkt",
          enableColumnFilter: false,
          meta: {
            alwaysVisible: true,
            cellClassName: "whitespace-nowrap tabular-nums",
          },
          cell: ({ getValue }) => formatDateTime(getValue()),
        }),
        column.accessor(
          (entry) => entry.actorEmail ?? entry.actorId ?? "System",
          {
            id: "actor",
            header: "Akteur",
            enableColumnFilter: false,
            meta: { cellClassName: "break-all" },
          },
        ),
        column.accessor((entry) => entry.action, {
          id: "action",
          header: "Aktion",
          meta: {
            filterVariant: "set",
            filterOptions: (actions ?? []).map((value) => ({
              value,
              label: value,
            })),
          },
          cell: ({ getValue }) => (
            <span className="dark:bg-dark-background inline-block rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-800 dark:text-gray-200">
              {getValue()}
            </span>
          ),
        }),
        column.accessor((entry) => entry.entityType, {
          id: "entity",
          header: "Objekt",
          meta: {
            filterVariant: "set",
            filterOptions: (entityTypes ?? []).map((value) => ({
              value,
              label: value,
            })),
          },
          cell: ({ row }) => (
            <>
              {row.original.entityType}
              {row.original.entityId ? (
                <span className="block font-mono text-xs break-all text-gray-400 dark:text-gray-500">
                  {row.original.entityId}
                </span>
              ) : null}
            </>
          ),
        }),
        column.display({
          id: "details",
          header: "Details",
          meta: { label: "Details", cellClassName: "max-w-md" },
          cell: ({ row }) =>
            row.original.details ? (
              <pre className="font-mono text-xs break-all whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                {JSON.stringify(row.original.details, null, 1)}
              </pre>
            ) : (
              "–"
            ),
        }),
      ]),
    [actions, entityTypes],
  );

  if (!permissionsLoading && !canView) {
    return (
      <DashboardPage title="Audit-Log">
        <p className="text-gray-600 dark:text-gray-400">
          Du hast keine Berechtigung, diese Seite zu sehen.
        </p>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage
      title="Audit-Log"
      description="Sicherheitsrelevante Aktionen: wer hat wann was geändert"
    >
      <DataTable
        data={data?.entries}
        columns={columns}
        getRowId={(entry) => entry.id}
        isLoading={isLoading}
        rowNoun={["Eintrag", "Einträge"]}
        searchPlaceholder="Akteur-E-Mail, Aktion oder Objekt-ID…"
        pageSizeOptions={[50, 100, 250]}
        emptyState={
          <span className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
            <ShieldIcon className="h-8 w-8" />
            Keine Einträge gefunden.
          </span>
        }
        renderMobileRow={(entry) => (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="dark:bg-dark-background inline-block rounded bg-gray-100 px-2 py-0.5 font-mono text-xs break-all text-gray-800 dark:text-gray-200">
                {entry.action}
              </span>
              <time className="text-xs text-gray-500 tabular-nums dark:text-gray-400">
                {formatDateTime(entry.createdAt)}
              </time>
            </div>
            <p className="dark:text-dark-text text-sm break-all text-gray-900">
              {entry.actorEmail ?? entry.actorId ?? "System"}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {entry.entityType}
              {entry.entityId ? (
                <span className="block font-mono break-all text-gray-400 dark:text-gray-500">
                  {entry.entityId}
                </span>
              ) : null}
            </p>
            {entry.details ? (
              <details>
                <summary className="text-primary cursor-pointer text-xs font-medium">
                  Details
                </summary>
                <pre className="mt-1 font-mono text-xs break-all whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                  {JSON.stringify(entry.details, null, 1)}
                </pre>
              </details>
            ) : null}
          </div>
        )}
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
