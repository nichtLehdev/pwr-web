"use client";

import { useCallback, useMemo, useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import type { PermissionKey } from "@/lib/permissions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDistrictColor } from "@/lib/district-color";
import { postPath } from "@/lib/slug";
import DashboardPostCard from "./dashboard-post-card";
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
import type { ContentStatus, PostCategory } from "~/generated/prisma/client";
import { useToast } from "@/app/_components/ui/toast";
import { Button, Select } from "@/app/_components/ui";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ExternalLinkIcon,
  PinIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  FilterIcon,
  PencilIcon,
  SquareDashed,
  TrashIcon,
  X,
} from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import { cn } from "@/lib/utils";

type DashboardPostsListProps = Record<string, never>;

type DashboardPost =
  RouterOutputs["posts"]["getDashboardPosts"]["posts"][number];

/** Die Standardordnung der Liste — auch das Ziel des dritten Sortierklicks. */
const DEFAULT_SORTING = { id: "createdAt", desc: true } as const;

/** Die Spalten, nach denen der Server sortieren kann. */
type TableSortColumn = "title" | "publishedAt" | "status" | "createdAt";

const column = createDataTableColumnHelper<DashboardPost>();

const statusFilters: { value: ContentStatus | "all"; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "DRAFT", label: "Entwürfe" },
  { value: "PENDING", label: "Zur Prüfung" },
  { value: "APPROVED", label: "Veröffentlicht" },
  { value: "REJECTED", label: "Abgelehnt" },
  { value: "ARCHIVED", label: "Archiviert" },
];

const categoryFilters: { value: PostCategory | "all"; label: string }[] = [
  { value: "all", label: "Alle Kategorien" },
  { value: "MAGAZIN", label: "Magazin" },
  { value: "EVENT", label: "Event" },
  { value: "AUSBILDUNG", label: "Ausbildung" },
  { value: "BEZIRKE", label: "Bezirke" },
  { value: "ANDERE", label: "Andere" },
];

const sortOptions: {
  value: "publishedAt" | "title" | "createdAt" | "status";
  label: string;
}[] = [
  { value: "publishedAt", label: "Veröffentlicht" },
  { value: "title", label: "Titel" },
  { value: "createdAt", label: "Erstellt am" },
  { value: "status", label: "Status" },
];

export default function DashboardPostsList({}: DashboardPostsListProps) {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const hasApprovePermission = hasPermission("posts.approve" as PermissionKey);
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "all">(
    "all",
  );
  const [categoryFilter, setCategoryFilter] = useState<PostCategory | "all">(
    "all",
  );
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
  const [view, setView] = useDashboardListView("dashboard-posts-view");
  // Nur die Tabellenansicht sucht: in der Kartenansicht gäbe es kein Feld dazu,
  // und ein Filter ohne sichtbaren Schalter ist ein Filter, den niemand findet.
  const [search, setSearch] = useState("");
  const [tablePageSize, setTablePageSize] = useState(25);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [newStatus, setNewStatus] = useState<ContentStatus | null>(null);
  // Karten füllen ein Raster, Tabellenzeilen eine Seite — beide brauchen
  // eine andere Seitengröße.
  const limit = view === "table" ? tablePageSize : 12;

  const utils = api.useUtils();

  const { data: bezirke } = api.bezirke.getAll.useQuery();

  const { data, isLoading, error } = api.posts.getDashboardPosts.useQuery({
    page,
    limit,
    status: statusFilter === "all" ? undefined : statusFilter,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    sortBy,
    sortOrder,
    bezirkId: bezirkFilter.length ? bezirkFilter : undefined,
    search: view === "table" && search ? search : undefined,
  });

  const bulkDeleteMutation = api.posts.bulkDelete.useMutation({
    onSuccess: (result) => {
      void utils.posts.getDashboardPosts.invalidate();
      setSelectedIds(new Set());
      setSelectionMode(false);
      setShowDeleteConfirm(false);
      toast.success(`${result.deletedCount} Beitrag/Beiträge gelöscht`);
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const duplicateMutation = api.posts.duplicate.useMutation({
    onSuccess: (newPost) => {
      void utils.posts.getDashboardPosts.invalidate();
      toast.success("Beitrag dupliziert");
      router.push(`/dashboard/posts/${newPost.id}/edit`);
    },
    onError: (error) => {
      toast.error(`Fehler beim Duplizieren: ${error.message}`);
    },
  });

  const bulkDuplicateMutation = api.posts.bulkDuplicate.useMutation({
    onSuccess: (result) => {
      void utils.posts.getDashboardPosts.invalidate();
      setSelectedIds(new Set());
      setSelectionMode(false);
      toast.success(`${result.duplicatedCount} Beitrag/Beiträge dupliziert`);
    },
    onError: (error) => {
      toast.error(`Fehler beim Duplizieren: ${error.message}`);
    },
  });

  const bulkStatusChangeMutation = api.posts.bulkStatusChange.useMutation({
    onSuccess: (result) => {
      void utils.posts.getDashboardPosts.invalidate();
      setSelectedIds(new Set());
      setSelectionMode(false);
      setShowStatusChange(false);
      setNewStatus(null);
      toast.success(`${result.updatedCount} Beitrag/Beiträge aktualisiert`);
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const availableFilters = statusFilters.filter((filter) => {
    if (hasApprovePermission) return true;

    // Non-reviewers can't see drafts
    return filter.value !== "DRAFT";
  });
  const adjustedFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0) +
    (bezirkFilter.length > 0 ? 1 : 0) +
    (sortBy !== "createdAt" ? 1 : 0);

  /** Beim Wechsel neu aufsetzen: die Seitengröße unterscheidet sich. */
  const handleViewChange = (next: "cards" | "table") => {
    setView(next);
    setPage(1);
    if (next === "cards") setSearch("");
  };

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

  const categoryColumnOptions = useMemo(
    () =>
      categoryFilters
        .filter((option) => option.value !== "all")
        .map((option) => ({
          value: String(option.value),
          label: option.label,
        })),
    [],
  );

  const columnFilters: ColumnFiltersState = useMemo(
    () => [
      ...(statusFilter === "all"
        ? []
        : [{ id: "status", value: [statusFilter] }]),
      ...(categoryFilter === "all"
        ? []
        : [{ id: "category", value: [categoryFilter] }]),
      ...(bezirkFilter.length ? [{ id: "district", value: bezirkFilter }] : []),
    ],
    [statusFilter, categoryFilter, bezirkFilter],
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

  const columns = useMemo<DataTableColumn<DashboardPost>[]>(() => {
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
      column.accessor((post) => post.title, {
        id: "title",
        header: "Titel",
        enableColumnFilter: false,
        meta: { alwaysVisible: true },
        cell: ({ row }) => (
          <div className="flex items-start gap-1.5">
            {row.original.pinned && (
              <PinIcon
                className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-label="Angepinnt"
              />
            )}
            <div className="min-w-0">
              <Link
                href={`/dashboard/posts/${row.original.id}/edit`}
                className="hover:text-primary dark:text-dark-text font-medium text-gray-900"
              >
                {row.original.title}
              </Link>
              {row.original.excerpt && (
                <p className="dark:text-dark-muted line-clamp-1 text-xs text-gray-500">
                  {row.original.excerpt}
                </p>
              )}
            </div>
          </div>
        ),
      }),
      column.accessor((post) => post.category, {
        id: "category",
        header: "Kategorie",
        enableSorting: false,
        meta: { filterVariant: "set", filterOptions: categoryColumnOptions },
        cell: ({ getValue }) =>
          categoryColumnOptions.find((option) => option.value === getValue())
            ?.label ?? getValue(),
      }),
      column.accessor((post) => post.bezirkId ?? "", {
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
      column.accessor((post) => post.status, {
        id: "status",
        header: "Status",
        meta: { filterVariant: "set", filterOptions: statusColumnOptions },
        cell: ({ row }) => <ContentStatusBadge status={row.original.status} />,
      }),
      column.accessor((post) => post.publishedAt, {
        id: "publishedAt",
        header: "Veröffentlicht",
        enableColumnFilter: false,
        meta: { cellClassName: "whitespace-nowrap tabular-nums" },
        cell: ({ getValue }) => {
          const value = getValue();
          return value ? new Date(value).toLocaleDateString("de-DE") : "–";
        },
      }),
      column.accessor((post) => post.createdBy?.displayName ?? "", {
        id: "createdBy",
        header: "Erstellt von",
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ getValue }) => getValue() || "–",
      }),
      column.accessor((post) => post.createdAt, {
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
              href={`/dashboard/posts/${row.original.id}/edit`}
              className="dark:text-dark-muted dark:hover:text-dark-text rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
              title="Bearbeiten"
            >
              <PencilIcon className="h-4 w-4" />
            </Link>
            <Link
              href={postPath({ id: row.original.id, slug: row.original.slug })}
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
    categoryColumnOptions,
    bezirkColumnOptions,
    toggleSelection,
  ]);

  const selectAll = () => {
    if (data?.posts) {
      setSelectedIds(new Set(data.posts.map((p) => p.id)));
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
          Fehler beim Laden der Beiträge: {error.message}
        </p>
      </div>
    );
  }

  const selectClass =
    "dark:border-dark-border dark:bg-dark-background min-h-9 min-w-0 rounded-md border border-gray-200/90 bg-white px-2.5 py-1.5 text-sm text-gray-900 dark:text-dark-text";

  // In der Tabelle sitzen Status, Kategorie und Sortierung in den Spaltenköpfen
  // — beides zugleich wären zwei Schalter für dieselbe Sache.
  const filterControlsRow =
    view === "table" ? null : (
      <div className="-mx-0.5 flex flex-nowrap items-center gap-x-2 overflow-x-auto px-0.5 pb-1 sm:mx-0 sm:gap-x-3 sm:overflow-visible sm:pb-0">
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
        <div className="w-[10.5rem] shrink-0 sm:w-[11.5rem]">
          <Select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value as PostCategory | "all");
              setPage(1);
            }}
            className={cn(selectClass, "w-full")}
            aria-label="Kategorie"
          >
            {categoryFilters.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-[9.75rem] shrink-0 sm:w-[10.75rem]">
          <Select
            value={bezirkFilter[0] ?? "all"}
            onChange={(e) => {
              setBezirkFilter(e.target.value === "all" ? [] : [e.target.value]);
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
                  "publishedAt" | "title" | "createdAt" | "status",
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
      </div>
    );

  return (
    <div className="space-y-3">
      {!selectionMode && (
        <div className="dark:border-dark-border border-b border-gray-200/80 pb-2">
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
                    {data.total === 1 ? "Beitrag" : "Beiträge"}
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
            <div className="min-w-0">{filterControlsRow}</div>
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
                  {data.total === 1 ? "Beitrag" : "Beiträge"}
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

          <div className={cn("mt-2 sm:hidden", !filterControlsRow && "hidden")}>
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="dark:border-dark-border flex w-full items-center justify-between gap-2 rounded-md border border-gray-200/80 px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              <span className="flex items-center gap-2">
                <FilterIcon className="h-4 w-4 text-gray-400" />
                Status, Kategorie, Bezirk, Sortierung
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

      {/* Loading State */}
      {view === "table" ? (
        <DataTable
          data={data?.posts}
          columns={columns}
          getRowId={(post) => post.id}
          isLoading={isLoading}
          rowNoun={["Beitrag", "Beiträge"]}
          searchPlaceholder="Titel oder Anrisstext suchen…"
          pageSizeOptions={[25, 50, 100]}
          emptyState={
            <>
              <SquareDashed className="mx-auto h-10 w-10 text-gray-400/80 dark:text-gray-500" />
              <h3 className="text-dark dark:text-dark-text mt-4 text-lg font-semibold">
                Keine Beiträge gefunden
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Passe Status, Kategorie oder Suche an.
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
            // Der Server kennt je Abfrage nur einen Status und eine Kategorie;
            // die Mehrfachauswahl der Spalte wird auf den ersten Wert eingedampft.
            const status = read("status");
            const category = read("category");
            setStatusFilter(
              status?.length ? (status[0] as ContentStatus) : "all",
            );
            setCategoryFilter(
              category?.length ? (category[0] as PostCategory) : "all",
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="dark:border-dark-border dark:bg-dark-surface h-52 animate-pulse rounded-lg border border-gray-200/70 bg-gray-100"
                />
              ))}
            </div>
          )}

          {/* Posts Grid */}
          {!isLoading && data?.posts && data.posts.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.posts.map((post) => (
                <div key={post.id} className="relative h-full">
                  {selectionMode && (
                    <div
                      className={`absolute inset-0 z-10 cursor-pointer rounded-lg border-2 transition-colors ${
                        selectedIds.has(post.id)
                          ? "border-primary bg-primary/10"
                          : "border-transparent hover:border-gray-300 hover:bg-gray-50/50 dark:hover:border-gray-600"
                      }`}
                      onClick={() => toggleSelection(post.id)}
                    >
                      <div className="absolute top-3 left-3">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded border-2 transition-colors ${
                            selectedIds.has(post.id)
                              ? "border-primary bg-primary text-white"
                              : "dark:bg-dark-surface border-gray-300 bg-white dark:border-gray-600"
                          }`}
                        >
                          {selectedIds.has(post.id) && (
                            <CheckIcon className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <DashboardPostCard
                    id={post.id}
                    title={post.title}
                    excerpt={post.excerpt}
                    category={post.category}
                    district={post.bezirk?.number}
                    status={post.status}
                    pinned={post.pinned}
                    createdBy={post.createdBy}
                    createdAt={new Date(post.createdAt)}
                    publishedAt={
                      post.publishedAt ? new Date(post.publishedAt) : null
                    }
                    reviewer={post.reviewer}
                    reviewDate={
                      post.reviewDate ? new Date(post.reviewDate) : null
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && data?.posts && data.posts.length === 0 && (
            <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200/80 py-12 text-center">
              <X className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="text-dark dark:text-dark-text mt-4 text-lg font-semibold">
                Keine Beiträge gefunden
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {statusFilter !== "all" || categoryFilter !== "all"
                  ? "Es gibt keine Beiträge mit diesen Filtern."
                  : "Es gibt noch keine Beiträge."}
              </p>
            </div>
          )}

          {/* Pagination */}
          {view === "cards" && data && data.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>

              <span className="text-dark dark:text-dark-text text-sm">
                Seite {page} von {data.pages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
              >
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Delete Confirmation Modal */}
        </>
      )}

      {showDeleteConfirm && (
        <ScrollableModal>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h3 className="text-dark dark:text-dark-text text-lg font-bold">
                Beiträge löschen?
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Möchtest du wirklich {selectedIds.size} Beitrag/Beiträge
                unwiderruflich löschen?
              </p>
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Abbrechen
                </button>
                <button
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

      {/* Status Change Modal */}
      {showStatusChange && (
        <ScrollableModal>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h3 className="text-dark dark:text-dark-text text-lg font-bold">
                Status ändern
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Wähle den neuen Status für {selectedIds.size} Beitrag/Beiträge:
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {statusFilters
                  .filter((s) => s.value !== "all")
                  .map((status) => (
                    <button
                      key={status.value}
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
                  onClick={() => {
                    setShowStatusChange(false);
                    setNewStatus(null);
                  }}
                  className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleBulkStatusChange}
                  disabled={!newStatus || bulkStatusChangeMutation.isPending}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
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
