"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import type { PermissionKey } from "@/lib/permissions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { capitalizeFirstLetter, cn } from "@/lib/utils";
import { getDistrictColor } from "@/lib/district-color";
import { eventPath } from "@/lib/slug";
import DashboardEventCard from "./dashboard-event-card";
import {
  DashboardListViewToggle,
  useDashboardListView,
} from "./dashboard-list-view";
import { CONTENT_STATUS_OPTIONS, ContentStatusBadge } from "./content-status";
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
import type { ContentStatus } from "~/generated/prisma/enums";
import { useToast } from "@/app/_components/ui/toast";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ExternalLinkIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  BanIcon,
  CheckIcon,
  CopyIcon,
  FilterIcon,
  PencilIcon,
  SquareDashed,
  TrashIcon,
  X,
} from "lucide-react";
import { Button, Select } from "@/app/_components/ui";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";

type DashboardEventsListProps = Record<string, never>;

type DashboardEvent =
  RouterOutputs["events"]["getDashboardEvents"]["events"][number];

/** Die Standardordnung der Liste — auch das Ziel des dritten Sortierklicks. */
const DEFAULT_SORTING = { id: "eventDate", desc: false } as const;

/** Die Spalten, nach denen der Server sortieren kann. */
type TableSortColumn = "title" | "eventDate" | "status" | "createdAt";

const column = createDataTableColumnHelper<DashboardEvent>();

type DashboardEventsScheduleFilter = "active" | "all" | "past";

const scheduleFilters: {
  value: DashboardEventsScheduleFilter;
  label: string;
}[] = [
  { value: "active", label: "Aktuell" },
  { value: "all", label: "Alle Zeiträume" },
  { value: "past", label: "Vergangen" },
];

const statusFilters: { value: ContentStatus | "all"; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "DRAFT", label: "Entwürfe" },
  { value: "PENDING", label: "Zur Prüfung" },
  { value: "APPROVED", label: "Veröffentlicht" },
  { value: "REJECTED", label: "Abgelehnt" },
  { value: "ARCHIVED", label: "Archiviert" },
];

const sortOptions: {
  value: "eventDate" | "title" | "createdAt" | "status";
  label: string;
}[] = [
  { value: "eventDate", label: "Datum" },
  { value: "title", label: "Titel" },
  { value: "createdAt", label: "Erstellt am" },
  { value: "status", label: "Status" },
];

export default function DashboardEventsList({}: DashboardEventsListProps) {
  const router = useRouter();
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "all">(
    "all",
  );
  const [scheduleFilter, setScheduleFilter] =
    useState<DashboardEventsScheduleFilter>("active");
  // Die Sortierung selbst ist der Zustand — eine leere Sortierung ist der
  // dritte Klick auf einen Spaltenkopf und bedeutet "wieder Standardordnung".
  // Aus ihr werden Spalte und Richtung für Abfrage und Kartenansicht abgeleitet.
  const [sorting, setSorting] = useState<SortingState>([DEFAULT_SORTING]);
  const activeSort = sorting[0] ?? DEFAULT_SORTING;
  const sortBy = activeSort.id as TableSortColumn;
  const sortOrder = activeSort.desc ? "desc" : "asc";

  const setSortBy = (next: TableSortColumn) =>
    setSorting([{ id: next, desc: activeSort.desc }]);
  /** Bezirks-Set-Filter; leer heißt "alle Bezirke". */
  const [bezirkFilter, setBezirkFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useDashboardListView("dashboard-events-view");
  // Nur die Tabellenansicht sucht: in der Kartenansicht gäbe es kein Feld dazu,
  // und ein Filter ohne sichtbaren Schalter ist ein Filter, den niemand findet.
  const [search, setSearch] = useState("");
  const [tablePageSize, setTablePageSize] = useState(25);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [newStatus, setNewStatus] = useState<ContentStatus | null>(null);
  // Karten füllen ein Raster, Tabellenzeilen eine Seite — beide brauchen
  // eine andere Seitengröße.
  const limit = view === "table" ? tablePageSize : 12;

  const utils = api.useUtils();

  const { data: bezirke } = api.bezirke.getAll.useQuery();

  const { data, isLoading, error } = api.events.getDashboardEvents.useQuery({
    page,
    limit,
    status: statusFilter === "all" ? undefined : statusFilter,
    schedule: scheduleFilter,
    sortBy,
    sortOrder,
    bezirkId: bezirkFilter.length ? bezirkFilter : undefined,
    search: view === "table" && search ? search : undefined,
  });

  useEffect(() => {
    if (data && data.pages > 0 && page > data.pages) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clamp page when total pages shrink (filters / data)
      setPage(data.pages);
    }
  }, [data, page]);

  const bulkDeleteMutation = api.events.bulkDelete.useMutation({
    onSuccess: (result) => {
      void utils.events.getDashboardEvents.invalidate();
      setSelectedIds(new Set());
      setSelectionMode(false);
      setShowDeleteConfirm(false);
      toast.success(`${result.deletedCount} Event(s) gelöscht`);
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const bulkCancelMutation = api.events.bulkCancel.useMutation({
    onSuccess: (result) => {
      void utils.events.getDashboardEvents.invalidate();
      setSelectedIds(new Set());
      setSelectionMode(false);
      setShowCancelConfirm(false);
      toast.success(`${result.cancelledCount} Event(s) abgesagt`);
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const duplicateMutation = api.events.duplicate.useMutation({
    onSuccess: (newEvent) => {
      void utils.events.getDashboardEvents.invalidate();
      toast.success("Event dupliziert");
      router.push(`/dashboard/events/${newEvent.id}/edit`);
    },
    onError: (error) => {
      toast.error(`Fehler beim Duplizieren: ${error.message}`);
    },
  });

  const bulkDuplicateMutation = api.events.bulkDuplicate.useMutation({
    onSuccess: (result) => {
      void utils.events.getDashboardEvents.invalidate();
      setSelectedIds(new Set());
      setSelectionMode(false);
      toast.success(`${result.duplicatedCount} Event(s) dupliziert`);
    },
    onError: (error) => {
      toast.error(`Fehler beim Duplizieren: ${error.message}`);
    },
  });

  const bulkStatusChangeMutation = api.events.bulkStatusChange.useMutation({
    onSuccess: (result) => {
      void utils.events.getDashboardEvents.invalidate();
      setSelectedIds(new Set());
      setSelectionMode(false);
      setShowStatusChange(false);
      setNewStatus(null);
      toast.success(`${result.updatedCount} Event(s) aktualisiert`);
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const { hasPermission } = usePermissions();

  const hasApprovePermission = hasPermission("events.approve" as PermissionKey);

  const availableFilters = statusFilters.filter((filter) => {
    if (hasApprovePermission) return true;

    return filter.value !== "DRAFT";
  });

  const bezirkColumnOptions = useMemo(
    () =>
      (bezirke ?? []).map((bezirk) => ({
        value: bezirk.id,
        label:
          `${bezirk.number} · ${bezirk.shortName ?? bezirk.name ?? ""}`.trim(),
      })),
    [bezirke],
  );

  const statusColumnOptions = useMemo(
    () =>
      CONTENT_STATUS_OPTIONS.filter(
        (option) => hasApprovePermission || option.value !== "DRAFT",
      ),
    [hasApprovePermission],
  );

  const adjustedFilterCount = useMemo(() => {
    return (
      (statusFilter !== "all" ? 1 : 0) +
      (bezirkFilter.length > 0 ? 1 : 0) +
      (scheduleFilter !== "active" ? 1 : 0) +
      (sortBy !== "eventDate" || sortOrder !== "asc" ? 1 : 0)
    );
  }, [statusFilter, bezirkFilter, scheduleFilter, sortBy, sortOrder]);

  /** Beim Wechsel neu aufsetzen: die Seitengröße unterscheidet sich. */
  const handleViewChange = (next: "cards" | "table") => {
    setView(next);
    setPage(1);
    if (next === "cards") setSearch("");
  };

  const columnFilters: ColumnFiltersState = useMemo(
    () => [
      ...(statusFilter === "all"
        ? []
        : [{ id: "status", value: [statusFilter] }]),
      ...(bezirkFilter.length ? [{ id: "district", value: bezirkFilter }] : []),
    ],
    [statusFilter, bezirkFilter],
  );

  const pagination: PaginationState = useMemo(
    () => ({ pageIndex: page - 1, pageSize: limit }),
    [page, limit],
  );

  const toggleSortOrder = () => {
    setSorting([{ id: sortBy, desc: sortOrder === "asc" }]);
    setPage(1);
  };

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const columns = useMemo<DataTableColumn<DashboardEvent>[]>(() => {
    const select = selectionMode
      ? [
          column.display({
            id: "select",
            header: "",
            meta: { alwaysVisible: true, headerClassName: "w-10" },
            cell: ({ row }) => (
              <input
                type="checkbox"
                checked={selectedIds.has(row.original.id)}
                onChange={() => toggleSelection(row.original.id)}
                aria-label={`${row.original.title} auswählen`}
                className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
              />
            ),
          }),
        ]
      : [];

    return column.columns([
      ...select,
      column.accessor((event) => event.title, {
        id: "title",
        header: "Titel",
        enableColumnFilter: false,
        meta: { alwaysVisible: true },
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              href={`/dashboard/events/${row.original.id}/edit`}
              className="hover:text-primary dark:text-dark-text font-medium text-gray-900"
            >
              {row.original.title}
            </Link>
            {row.original.cancelled && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
                Abgesagt
              </span>
            )}
          </div>
        ),
      }),
      column.accessor((event) => event.eventDate, {
        id: "eventDate",
        header: "Datum",
        enableColumnFilter: false,
        meta: { cellClassName: "whitespace-nowrap tabular-nums" },
        cell: ({ getValue }) =>
          new Date(getValue()).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
      }),
      column.accessor((event) => event.location?.city ?? "", {
        id: "location",
        header: "Ort",
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ getValue }) => getValue() || "–",
      }),
      column.accessor((event) => event.category, {
        id: "category",
        header: "Kategorie",
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ getValue }) => capitalizeFirstLetter(getValue()),
      }),
      column.accessor((event) => event.bezirkId ?? "", {
        id: "district",
        header: "Bezirk",
        enableSorting: false,
        meta: {
          align: "center",
          label: "Bezirk",
          filterVariant: "set",
          filterOptions: bezirkColumnOptions,
        },
        cell: ({ row }) => {
          const number = row.original.bezirk?.number;
          if (!number) return "–";
          return (
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: getDistrictColor(number) }}
            >
              {number}
            </span>
          );
        },
      }),
      column.accessor((event) => event.status, {
        id: "status",
        header: "Status",
        meta: { filterVariant: "set", filterOptions: statusColumnOptions },
        cell: ({ row }) => <ContentStatusBadge status={row.original.status} />,
      }),
      column.accessor((event) => event.createdBy?.displayName ?? "", {
        id: "createdBy",
        header: "Erstellt von",
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ getValue }) => getValue() || "–",
      }),
      column.accessor((event) => event.createdAt, {
        id: "createdAt",
        header: "Erstellt am",
        enableColumnFilter: false,
        meta: { cellClassName: "whitespace-nowrap tabular-nums" },
        cell: ({ getValue }) =>
          new Date(getValue()).toLocaleDateString("de-DE"),
      }),
      column.display({
        id: "actions",
        header: "Aktionen",
        meta: { align: "right", label: "Aktionen" },
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/dashboard/events/${row.original.id}/edit`}
              className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
              title="Bearbeiten"
            >
              <PencilIcon className="h-4 w-4" />
            </Link>
            <Link
              href={eventPath({
                id: row.original.id,
                slug: row.original.slug,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
              title="Öffentliche Seite"
            >
              <ExternalLinkIcon className="h-4 w-4" />
            </Link>
          </div>
        ),
      }),
    ]);
  }, [
    selectionMode,
    selectedIds,
    statusColumnOptions,
    bezirkColumnOptions,
    toggleSelection,
  ]);

  const selectAll = () => {
    if (data?.events) {
      setSelectedIds(new Set(data.events.map((e) => e.id)));
    }
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedIds.size > 0) {
      bulkDeleteMutation.mutate({ ids: Array.from(selectedIds) });
    }
  };

  const handleBulkCancel = () => {
    if (selectedIds.size > 0) {
      bulkCancelMutation.mutate({ ids: Array.from(selectedIds) });
    }
  };

  const handleDuplicate = () => {
    if (selectedIds.size === 1) {
      const id = Array.from(selectedIds)[0]!;
      duplicateMutation.mutate({ id });
    }
  };

  const handleBulkDuplicate = () => {
    if (selectedIds.size > 0) {
      bulkDuplicateMutation.mutate({ ids: Array.from(selectedIds) });
    }
  };

  const handleBulkStatusChange = () => {
    if (selectedIds.size > 0 && newStatus) {
      bulkStatusChangeMutation.mutate({
        ids: Array.from(selectedIds),
        status: newStatus,
      });
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
        <p className="text-sm text-red-800 dark:text-red-300">
          Fehler beim Laden der Events: {error.message}
        </p>
      </div>
    );
  }

  const scheduleSegment = (
    <div className="dark:border-dark-border inline-flex max-w-full rounded-md border border-gray-200/90 p-0.5">
      {scheduleFilters.map((sf) => (
        <button
          key={sf.value}
          type="button"
          onClick={() => {
            setScheduleFilter(sf.value);
            setPage(1);
          }}
          className={cn(
            "min-w-0 shrink-0 rounded px-2.5 py-1.5 text-center text-xs font-medium transition-colors sm:text-sm",
            scheduleFilter === sf.value
              ? "dark:bg-dark-surface dark:text-dark-text bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200",
          )}
        >
          {sf.label}
        </button>
      ))}
    </div>
  );

  const selectClass =
    "dark:border-dark-border dark:bg-dark-background min-h-9 min-w-0 rounded-md border border-gray-200/90 bg-white px-2.5 py-1.5 text-sm text-gray-900 dark:text-dark-text";

  // In der Tabelle sitzen Status und Sortierung in den Spaltenköpfen — beides
  // zusätzlich in der Leiste zu zeigen wären zwei Schalter für dieselbe Sache.
  const filterControlsRow = (
    <div className="-mx-0.5 flex flex-nowrap items-center gap-x-2 overflow-x-auto px-0.5 pb-1 sm:mx-0 sm:gap-x-3 sm:overflow-visible sm:pb-0">
      <div className="shrink-0">{scheduleSegment}</div>
      {view === "table" ? null : (
        <>
          <div className="w-[10.25rem] shrink-0 sm:w-[11.75rem]">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as ContentStatus | "all");
                setPage(1);
              }}
              className={cn(selectClass, "w-full")}
              aria-label="Status"
            >
              {availableFilters.map((filter) => (
                <option key={String(filter.value)} value={String(filter.value)}>
                  {filter.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-[9.75rem] shrink-0 sm:w-[10.75rem]">
            <Select
              value={bezirkFilter[0] ?? "all"}
              onChange={(e) => {
                setBezirkFilter(
                  e.target.value === "all" ? [] : [e.target.value],
                );
                setPage(1);
              }}
              className={cn(selectClass, "w-full")}
              aria-label="Bezirk"
            >
              <option value="all">Alle Bezirke</option>
              {bezirkColumnOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Select
              value={sortBy}
              onChange={(e) => {
                setSortBy(
                  e.target.value as
                    "eventDate" | "title" | "createdAt" | "status",
                );
                setPage(1);
              }}
              className={cn(selectClass, "w-[9.5rem]")}
              aria-label="Sortierung"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={toggleSortOrder}
              className="text-dark dark:text-dark-text dark:border-dark-border dark:bg-dark-background-secondary dark:hover:bg-dark-surface inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200/90 bg-white text-gray-600 transition-colors hover:bg-gray-50"
              title={sortOrder === "asc" ? "Aufsteigend" : "Absteigend"}
            >
              {sortOrder === "asc" ? (
                <ArrowUpIcon className="h-4 w-4" />
              ) : (
                <ArrowDownIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {!selectionMode && (
        <div className="dark:border-dark-border border-b border-gray-200/80 pb-2">
          {/* Zählung und Ansichtsschalter oben, die Filter darunter über die
              volle Breite: die Selects haben feste Breiten und drängeln sich in
              einer gemeinsamen Zeile bei mittleren Fenstern gegenseitig weg. */}
          <div className="hidden space-y-2 sm:block">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <p className="min-w-0 text-sm text-gray-600 tabular-nums dark:text-gray-400">
                {isLoading ? (
                  <span className="text-gray-500">Liste wird geladen…</span>
                ) : data ? (
                  <>
                    <span className="text-dark dark:text-dark-text font-semibold">
                      {data.total}
                    </span>{" "}
                    {data.total === 1 ? "Termin" : "Termine"}
                    {scheduleFilter === "active" && " · aktuell & geplant"}
                    {scheduleFilter === "past" && " · vergangen"}
                    {scheduleFilter === "all" && " · alle Zeiträume"}
                  </>
                ) : null}
              </p>
              <div className="flex items-center gap-2">
                <DashboardListViewToggle
                  view={view}
                  onChange={handleViewChange}
                />
                <Button
                  onClick={() => setSelectionMode(true)}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  <SquareDashed className="h-4 w-4" />
                  Auswählen
                </Button>
              </div>
            </div>
            {filterControlsRow ? (
              <div className="min-w-0">{filterControlsRow}</div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3 sm:hidden">
            <p className="text-sm text-gray-600 tabular-nums dark:text-gray-400">
              {isLoading ? (
                <span className="text-gray-500">Liste wird geladen…</span>
              ) : data ? (
                <>
                  <span className="text-dark dark:text-dark-text font-semibold">
                    {data.total}
                  </span>{" "}
                  {data.total === 1 ? "Termin" : "Termine"}
                  {scheduleFilter === "active" && " · aktuell & geplant"}
                  {scheduleFilter === "past" && " · vergangen"}
                  {scheduleFilter === "all" && " · alle Zeiträume"}
                </>
              ) : null}
            </p>
            <div className="flex items-center gap-2">
              <DashboardListViewToggle
                view={view}
                onChange={handleViewChange}
              />
              <Button
                onClick={() => setSelectionMode(true)}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                <SquareDashed className="h-4 w-4" />
                Auswählen
              </Button>
            </div>
          </div>

          <div className="mt-2 sm:hidden">
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="dark:border-dark-border flex w-full items-center justify-between gap-2 rounded-md border border-gray-200/80 px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              <span className="flex items-center gap-2">
                <FilterIcon className="h-4 w-4 text-gray-400" />
                Zeitraum, Status, Bezirk, Sortierung
              </span>
              {adjustedFilterCount > 0 ? (
                <span className="dark:bg-dark-border rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 tabular-nums dark:text-gray-200">
                  {adjustedFilterCount}
                </span>
              ) : null}
            </button>
            {filtersOpen ? (
              <div className="dark:border-dark-border mt-2 space-y-3 rounded-md border border-gray-200/80 p-3">
                {filterControlsRow}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {selectionMode && (
        <div className="dark:border-dark-border flex flex-wrap items-center gap-3 gap-y-2 border-b border-gray-200/80 pb-2">
          <span className="text-dark dark:text-dark-text text-sm font-medium tabular-nums">
            {selectedIds.size} ausgewählt
          </span>

          <div className="dark:border-dark-border flex items-center gap-2 border-l border-gray-200/90 pl-3">
            <button
              type="button"
              onClick={selectAll}
              className="hover:text-primary text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              Alle
            </button>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <button
              type="button"
              onClick={deselectAll}
              className="hover:text-primary text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              Keine
            </button>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {selectedIds.size === 1 && (
              <Button
                onClick={handleDuplicate}
                disabled={duplicateMutation.isPending}
                variant="outline"
                size="sm"
                isLoading={duplicateMutation.isPending}
              >
                <CopyIcon className="h-4 w-4" />
                Duplizieren
              </Button>
            )}

            {selectedIds.size > 1 && (
              <Button
                onClick={handleBulkDuplicate}
                disabled={bulkDuplicateMutation.isPending}
                variant="outline"
                size="sm"
                isLoading={bulkDuplicateMutation.isPending}
              >
                <CopyIcon className="h-4 w-4" />
                {selectedIds.size} duplizieren
              </Button>
            )}

            <Button
              onClick={() => setShowStatusChange(true)}
              disabled={selectedIds.size === 0}
              variant="outline"
              size="sm"
            >
              <PencilIcon className="h-4 w-4" />
              Status
            </Button>

            <Button
              onClick={() => setShowCancelConfirm(true)}
              disabled={selectedIds.size === 0 || bulkCancelMutation.isPending}
              variant="outline"
              size="sm"
              isLoading={bulkCancelMutation.isPending}
            >
              <BanIcon className="h-4 w-4" />
              Absagen
            </Button>

            <Button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={selectedIds.size === 0 || bulkDeleteMutation.isPending}
              variant="danger"
              size="sm"
              isLoading={bulkDeleteMutation.isPending}
            >
              <TrashIcon className="h-4 w-4" />
              Löschen
            </Button>

            <Button onClick={exitSelectionMode} variant="outline" size="sm">
              <X className="h-4 w-4" />
              Abbrechen
            </Button>
          </div>
        </div>
      )}

      {view === "table" ? (
        <DataTable
          data={data?.events}
          columns={columns}
          getRowId={(event) => event.id}
          isLoading={isLoading}
          rowNoun={["Termin", "Termine"]}
          searchPlaceholder="Titel oder Ort suchen…"
          pageSizeOptions={[25, 50, 100]}
          emptyState={
            <>
              <SquareDashed className="mx-auto h-10 w-10 text-gray-400/80 dark:text-gray-500" />
              <h3 className="text-dark dark:text-dark-text mt-4 text-lg font-semibold">
                Keine Termine gefunden
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Passe Zeitraum, Status oder Suche an.
              </p>
            </>
          }
          sorting={sorting}
          onSortingChange={(updater) => {
            setSorting(
              typeof updater === "function" ? updater(sorting) : updater,
            );
            setPage(1);
          }}
          manualSorting
          columnFilters={columnFilters}
          onColumnFiltersChange={(updater) => {
            const next =
              typeof updater === "function" ? updater(columnFilters) : updater;
            const read = (id: string) =>
              next.find((filter) => filter.id === id)?.value as
                string[] | undefined;
            // Der Server kennt nur einen Status je Abfrage; die Mehrfachauswahl
            // der Spalte wird darum auf den ersten Wert eingedampft. Bezirke
            // nimmt er dagegen als Liste entgegen.
            const status = read("status");
            setStatusFilter(
              status?.length ? (status[0] as ContentStatus) : "all",
            );
            setBezirkFilter(read("district") ?? []);
            setPage(1);
          }}
          manualFiltering
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          pagination={pagination}
          onPaginationChange={(updater) => {
            const next =
              typeof updater === "function" ? updater(pagination) : updater;
            setTablePageSize(next.pageSize);
            setPage(next.pageIndex + 1);
          }}
          manualPagination
          rowCount={data?.total ?? 0}
        />
      ) : (
        <>
          {isLoading && (
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="dark:border-dark-border dark:bg-dark-surface h-52 animate-pulse rounded-lg border border-gray-200/70 bg-gray-100"
                />
              ))}
            </div>
          )}

          {!isLoading && data?.events && data.events.length > 0 && (
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.events.map((event) => (
                <div key={event.id} className="relative">
                  {selectionMode && (
                    <div
                      className={`absolute inset-0 z-10 cursor-pointer rounded-lg border-2 transition-colors ${
                        selectedIds.has(event.id)
                          ? "border-primary bg-primary/10"
                          : "border-transparent hover:border-gray-300 hover:bg-gray-50/50 dark:hover:border-gray-600"
                      }`}
                      onClick={() => toggleSelection(event.id)}
                    >
                      <div className="absolute top-3 left-3">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded border-2 transition-colors ${
                            selectedIds.has(event.id)
                              ? "border-primary bg-primary text-white"
                              : "dark:bg-dark-surface border-gray-300 bg-white dark:border-gray-600"
                          }`}
                        >
                          {selectedIds.has(event.id) && (
                            <CheckIcon className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <DashboardEventCard
                    id={event.id}
                    slug={event.slug}
                    title={event.title}
                    date={new Date(event.eventDate)}
                    location={event.location?.city ?? ""}
                    category={event.category}
                    district={event.bezirk?.number}
                    status={event.status}
                    cancelled={event.cancelled}
                    createdBy={event.createdBy}
                    createdAt={new Date(event.createdAt)}
                  />
                </div>
              ))}
            </div>
          )}

          {!isLoading && data?.events && data.events.length === 0 && (
            <div className="dark:border-dark-border border-t border-gray-200/80 py-14 text-center">
              <SquareDashed className="mx-auto h-10 w-10 text-gray-400/80 dark:text-gray-500" />
              <h3 className="text-dark dark:text-dark-text mt-4 text-lg font-semibold">
                Keine Termine gefunden
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {statusFilter !== "all"
                  ? "Für diese Statusfilter gibt es keine Treffer."
                  : scheduleFilter === "active"
                    ? "Keine Termine mehr im aktuellen Zeitraum. Versuche „Alle Zeiträume“ oder „Vergangen“, oder lege einen neuen Termin an."
                    : scheduleFilter === "past"
                      ? "Keine vergangenen Termine gefunden."
                      : "Es gibt noch keine Termine."}
              </p>
            </div>
          )}

          {view === "cards" && data && data.pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="dark:border-dark-border dark:bg-dark-surface dark:hover:bg-dark-background-secondary rounded-lg border border-gray-200/90 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>

              <span className="text-dark dark:text-dark-text text-sm tabular-nums">
                Seite {page} von {data.pages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="dark:border-dark-border dark:bg-dark-surface dark:hover:bg-dark-background-secondary rounded-lg border border-gray-200/90 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      {showDeleteConfirm && (
        <ScrollableModal>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h3 className="text-dark dark:text-dark-text text-lg font-bold">
                Events löschen?
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Möchtest du wirklich {selectedIds.size} Event(s) unwiderruflich
                löschen?
              </p>
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {bulkDeleteMutation.isPending ? "Löschen..." : "Löschen"}
                </button>
              </div>
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}

      {showCancelConfirm && (
        <ScrollableModal>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h3 className="text-dark dark:text-dark-text text-lg font-bold">
                Events absagen?
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Möchtest du wirklich {selectedIds.size} Event(s) als abgesagt
                markieren?
              </p>
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleBulkCancel}
                  disabled={bulkCancelMutation.isPending}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                >
                  {bulkCancelMutation.isPending ? "Absagen..." : "Absagen"}
                </button>
              </div>
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}

      {showStatusChange && (
        <ScrollableModal>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h3 className="text-dark dark:text-dark-text text-lg font-bold">
                Status ändern
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Wähle den neuen Status für {selectedIds.size} Event(s):
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {statusFilters
                  .filter((s) => s.value !== "all")
                  .map((status) => (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() =>
                        setNewStatus(status.value as ContentStatus)
                      }
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        newStatus === status.value
                          ? "bg-primary text-white"
                          : "dark:bg-dark-background-secondary dark:text-dark-text bg-gray-100 text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
              </div>
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusChange(false);
                    setNewStatus(null);
                  }}
                  className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleBulkStatusChange}
                  disabled={!newStatus || bulkStatusChangeMutation.isPending}
                  className="bg-primary hover:bg-primary-dark rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
                >
                  {bulkStatusChangeMutation.isPending
                    ? "Ändern..."
                    : "Status ändern"}
                </button>
              </div>
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}
    </div>
  );
}
