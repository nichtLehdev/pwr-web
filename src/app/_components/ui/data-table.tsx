"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  columnFacetingFeature,
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_arrHas,
  filterFn_inDateRange,
  filterFn_inNumberRange,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type OnChangeFn,
  type PaginationState,
  type RowData,
  type SortingState,
  type Table,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  Columns3Icon,
  FilterIcon,
  FilterXIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

/**
 * Which filter the funnel in a column header opens.
 *
 * `set` is the AG-Grid-style checkbox list: it offers exactly the values still
 * present after the *other* columns' filters, so the list never suggests a
 * value that would produce an empty result.
 */
export type DataTableFilterVariant = "text" | "set" | "number" | "date";

export interface DataTableColumnMeta {
  /** Horizontal alignment of header and cells. Defaults to `left`. */
  align?: "left" | "center" | "right";
  /** Filter UI offered in the header. Omit to fall back to `text`. */
  filterVariant?: DataTableFilterVariant;
  /**
   * Fixed options for a `set` filter, in the order they should be listed.
   * Without this the distinct cell values are used — right for free text, wrong
   * for enums that need a German label.
   */
  filterOptions?: { value: string; label: string }[];
  /** Label for the column menu when `header` is not a plain string. */
  label?: string;
  /** Extra classes for the `<th>`. */
  headerClassName?: string;
  /** Extra classes for every `<td>` of this column. */
  cellClassName?: string;
  /** Keeps the column out of the show/hide menu. */
  alwaysVisible?: boolean;
}

/**
 * The feature set every dashboard table shares. Registered once at module
 * scope — v9 stitches features in statically, so re-creating it per render
 * would rebuild every row model on every keystroke.
 */
export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnFacetingFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: {
    includesString: filterFn_includesString,
    arrHas: filterFn_arrHas,
    inNumberRange: filterFn_inNumberRange,
    inDateRange: filterFn_inDateRange,
  },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
  columnMeta: {} as DataTableColumnMeta,
});

export type DataTableFeatures = typeof dataTableFeatures;

/** A column definition for {@link DataTable}. */
export type DataTableColumn<TData extends RowData> = ColumnDef<
  DataTableFeatures,
  TData,
  // TanStack's own `columns()` helper widens here too: every column carries its
  // own value type, and one array type cannot name them all.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>;

/**
 * Column helper bound to the shared feature set, so `meta` is typed as
 * {@link DataTableColumnMeta} instead of the global fallback.
 */
export function createDataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>();
}

/** Stable empty array — a fresh `?? []` fallback invalidates every row model. */
const EMPTY_ROWS: never[] = [];

const DEFAULT_PAGE_SIZE_OPTIONS = [25, 50, 100, 250];

function alignClass(align: DataTableColumnMeta["align"]): string {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

function columnLabel<TData extends RowData>(
  column: Column<DataTableFeatures, TData>,
): string {
  const meta = column.columnDef.meta;
  if (meta?.label) return meta.label;
  const header = column.columnDef.header;
  return typeof header === "string" ? header : column.id;
}

/* -------------------------------------------------------------------------- */
/* Popover                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Header menus live in a portal on `position: fixed`. The table scrolls inside
 * `overflow-x-auto`, which would clip a menu anchored in a header cell, and on
 * a narrow viewport the funnel of the last column sits at the very edge.
 */
function Popover({
  anchor,
  onClose,
  align = "start",
  children,
}: {
  anchor: HTMLElement | null;
  onClose: () => void;
  align?: "start" | "end";
  children: ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!anchor) return;
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const card = cardRef.current;
      const width = card?.offsetWidth ?? 256;
      const height = card?.offsetHeight ?? 256;
      const margin = 8;

      let left = align === "end" ? rect.right - width : rect.left;
      left = Math.min(
        Math.max(margin, left),
        Math.max(margin, window.innerWidth - width - margin),
      );

      let top = rect.bottom + 4;
      if (top + height > window.innerHeight - margin) {
        // Flip above the header when there is no room below it.
        top = Math.max(margin, rect.top - height - 4);
      }
      setPosition({ top, left });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor, align]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (cardRef.current?.contains(target)) return;
      if (anchor?.contains(target)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [anchor, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={cardRef}
      role="dialog"
      style={{
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        visibility: position ? "visible" : "hidden",
      }}
      className="dark:border-dark-border dark:bg-dark-surface fixed z-50 w-64 rounded-lg border border-gray-200 bg-white p-3 text-sm normal-case shadow-xl"
    >
      {children}
    </div>,
    document.body,
  );
}

/* -------------------------------------------------------------------------- */
/* Column filters                                                             */
/* -------------------------------------------------------------------------- */

const inputClass =
  "dark:border-dark-border dark:bg-dark-background dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:ring-1 focus:outline-none";

function SetFilter<TData extends RowData>({
  column,
}: {
  column: Column<DataTableFeatures, TData>;
}) {
  const [query, setQuery] = useState("");
  const selected = (column.getFilterValue() as string[] | undefined) ?? [];

  const options = useMemo(() => {
    const configured = column.columnDef.meta?.filterOptions;
    if (configured) return configured;
    const facets = column.getFacetedUniqueValues();
    return [...facets.keys()]
      .filter((value) => value !== null && value !== undefined && value !== "")
      .map((value) => ({ value: String(value), label: String(value) }))
      .sort((a, b) => a.label.localeCompare(b.label, "de"));
  }, [column]);

  const visible = options.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase()),
  );

  const setSelection = (values: string[]) =>
    column.setFilterValue(values.length > 0 ? values : undefined);

  const toggle = (value: string) =>
    setSelection(
      selected.includes(value)
        ? selected.filter((entry) => entry !== value)
        : [...selected, value],
    );

  return (
    <div className="space-y-2">
      {options.length > 8 && (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Werte durchsuchen"
          aria-label="Werte durchsuchen"
          className={inputClass}
        />
      )}
      <div className="flex gap-3 text-xs">
        <button
          type="button"
          onClick={() => setSelection(visible.map((option) => option.value))}
          className="text-primary hover:underline"
        >
          Alle
        </button>
        <button
          type="button"
          onClick={() => setSelection([])}
          className="dark:text-dark-muted text-gray-500 hover:underline"
        >
          Keine
        </button>
      </div>
      <ul className="dark:border-dark-border max-h-56 space-y-1 overflow-y-auto rounded-md border border-gray-100 p-1">
        {visible.length === 0 ? (
          <li className="dark:text-dark-muted px-1 py-2 text-xs text-gray-500">
            Keine Werte
          </li>
        ) : (
          visible.map((option) => (
            <li key={option.value}>
              <label className="dark:hover:bg-dark-background-secondary flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={() => toggle(option.value)}
                  className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                />
                <span className="dark:text-dark-text truncate text-sm text-gray-700">
                  {option.label}
                </span>
              </label>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function RangeFilter<TData extends RowData>({
  column,
  type,
}: {
  column: Column<DataTableFeatures, TData>;
  type: "number" | "date";
}) {
  const value = (column.getFilterValue() as [string, string] | undefined) ?? [
    "",
    "",
  ];

  const update = (index: 0 | 1, next: string) => {
    const range: [string, string] =
      index === 0 ? [next, value[1] ?? ""] : [value[0] ?? "", next];
    column.setFilterValue(
      range[0] === "" && range[1] === "" ? undefined : range,
    );
  };

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="dark:text-dark-muted mb-1 block text-xs text-gray-500">
          {type === "date" ? "Von" : "Mindestens"}
        </span>
        <input
          type={type === "date" ? "date" : "number"}
          value={value[0] ?? ""}
          onChange={(event) => update(0, event.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="dark:text-dark-muted mb-1 block text-xs text-gray-500">
          {type === "date" ? "Bis" : "Höchstens"}
        </span>
        <input
          type={type === "date" ? "date" : "number"}
          value={value[1] ?? ""}
          onChange={(event) => update(1, event.target.value)}
          className={inputClass}
        />
      </label>
    </div>
  );
}

function TextFilter<TData extends RowData>({
  column,
}: {
  column: Column<DataTableFeatures, TData>;
}) {
  const value = (column.getFilterValue() as string | undefined) ?? "";
  return (
    <input
      autoFocus
      type="search"
      value={value}
      onChange={(event) =>
        column.setFilterValue(event.target.value || undefined)
      }
      placeholder="Enthält …"
      aria-label="Spalte filtern"
      className={inputClass}
    />
  );
}

function ColumnFilterMenu<TData extends RowData>({
  column,
}: {
  column: Column<DataTableFeatures, TData>;
}) {
  // The trigger element, not a boolean: the portalled menu positions itself
  // against it, and a ref cannot be read during render.
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const open = anchor !== null;
  const variant = column.columnDef.meta?.filterVariant ?? "text";
  const isFiltered = column.getIsFiltered();

  return (
    <>
      <button
        type="button"
        aria-label={`${columnLabel(column)} filtern`}
        aria-expanded={open}
        onClick={(event) => setAnchor(open ? null : event.currentTarget)}
        className={`shrink-0 rounded p-1 transition-colors ${
          isFiltered
            ? "text-primary bg-primary/10"
            : "dark:hover:bg-dark-background dark:hover:text-dark-text text-gray-400 hover:bg-gray-200 hover:text-gray-700"
        }`}
      >
        <FilterIcon className="h-3.5 w-3.5" />
      </button>
      {open && (
        <Popover anchor={anchor} onClose={() => setAnchor(null)} align="end">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="dark:text-dark-text text-xs font-semibold tracking-wide text-gray-700 uppercase">
              {columnLabel(column)}
            </span>
            <button
              type="button"
              onClick={() => setAnchor(null)}
              aria-label="Schließen"
              className="dark:text-dark-muted text-gray-400 hover:text-gray-600"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
          {variant === "set" ? (
            <SetFilter column={column} />
          ) : variant === "number" || variant === "date" ? (
            <RangeFilter column={column} type={variant} />
          ) : (
            <TextFilter column={column} />
          )}
          {isFiltered && (
            <button
              type="button"
              onClick={() => column.setFilterValue(undefined)}
              className="dark:text-dark-muted mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700"
            >
              <FilterXIcon className="h-3.5 w-3.5" />
              Filter entfernen
            </button>
          )}
        </Popover>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Column visibility                                                          */
/* -------------------------------------------------------------------------- */

function ColumnVisibilityMenu<TData extends RowData>({
  table,
}: {
  table: Table<DataTableFeatures, TData>;
}) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const open = anchor !== null;
  const hideable = table
    .getAllLeafColumns()
    .filter(
      (column) => column.getCanHide() && !column.columnDef.meta?.alwaysVisible,
    );

  if (hideable.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={(event) => setAnchor(open ? null : event.currentTarget)}
        aria-expanded={open}
        className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <Columns3Icon className="h-4 w-4" />
        Spalten
      </button>
      {open && (
        <Popover anchor={anchor} onClose={() => setAnchor(null)} align="end">
          <p className="dark:text-dark-text mb-2 text-xs font-semibold tracking-wide text-gray-700 uppercase">
            Spalten anzeigen
          </p>
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {hideable.map((column) => (
              <li key={column.id}>
                <label className="dark:hover:bg-dark-background-secondary flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={column.getIsVisible()}
                    onChange={column.getToggleVisibilityHandler()}
                    className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                  />
                  <span className="dark:text-dark-text truncate text-sm text-gray-700">
                    {columnLabel(column)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Popover>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* DataTable                                                                  */
/* -------------------------------------------------------------------------- */

export interface DataTableProps<TData extends RowData> {
  data: TData[] | undefined;
  columns: DataTableColumn<TData>[];
  /** Stable row identity — falls back to the array index. */
  getRowId?: (row: TData, index: number) => string;
  isLoading?: boolean;
  /** Shown instead of the body when there are no rows at all. */
  emptyState?: ReactNode;
  /** Shown when rows exist but every one is filtered away. */
  noMatchState?: ReactNode;
  /** Renders the search box above the table. Defaults to `true`. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Extra controls rendered in the toolbar, right of the search box. */
  toolbar?: ReactNode;
  /** Set to `false` to render every row at once. */
  paginated?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  initialSorting?: SortingState;
  initialColumnVisibility?: ColumnVisibilityState;
  /** Called for a click anywhere in the row. */
  onRowClick?: (row: TData) => void;
  /** Extra classes for one row, e.g. to tint cancelled records. */
  rowClassName?: (row: TData) => string | undefined;
  /** Caption for the row counter, singular and plural. */
  rowNoun?: [singular: string, plural: string];
  /** Hides the row counter and pager, for tables that carry their own. */
  hideFooter?: boolean;
  /**
   * Stacked card for one row, used below `md` instead of the table.
   *
   * A wide table only reaches a phone through horizontal scrolling, and columns
   * scrolled past the edge are columns nobody reads. Tables with more than a
   * handful of columns should hand over a card here; sorting, filters and the
   * pager stay above and below it either way.
   */
  renderMobileRow?: (row: TData) => ReactNode;
  className?: string;

  /*
   * Server-side mode. A table whose rows arrive one page at a time cannot sort
   * or filter in the browser without silently limiting itself to the current
   * page, so those slices are handed to the caller, who turns them into query
   * input. Pass the state, its setter and the matching `manual*` flag together.
   */
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  manualSorting?: boolean;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  manualFiltering?: boolean;
  /** Controlled search term, for a search that runs on the server. */
  search?: string;
  onSearchChange?: (value: string) => void;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  manualPagination?: boolean;
  /** Total number of matching rows on the server, for the pager and counter. */
  rowCount?: number;
}

export function DataTable<TData extends RowData>({
  data,
  columns,
  getRowId,
  isLoading = false,
  emptyState,
  noMatchState,
  searchable = true,
  searchPlaceholder = "Tabelle durchsuchen",
  toolbar,
  paginated = true,
  pageSize = 25,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  initialSorting,
  initialColumnVisibility,
  onRowClick,
  rowClassName,
  rowNoun = ["Eintrag", "Einträge"],
  hideFooter = false,
  renderMobileRow,
  className,
  sorting: sortingProp,
  onSortingChange,
  manualSorting,
  columnFilters: columnFiltersProp,
  onColumnFiltersChange,
  manualFiltering,
  search,
  onSearchChange,
  pagination: paginationProp,
  onPaginationChange,
  manualPagination,
  rowCount,
}: DataTableProps<TData>) {
  const rows = data ?? EMPTY_ROWS;
  const serverSearch = search !== undefined;

  // The search box keeps its own value and pushes it on a timer: re-filtering
  // a few thousand rows on every keystroke is what makes a table feel slow,
  // and in server mode every keystroke would otherwise be a request.
  const [searchInput, setSearchInput] = useState(search ?? "");
  const [globalFilter, setGlobalFilter] = useState(search ?? "");
  useEffect(() => {
    const timer = setTimeout(() => {
      setGlobalFilter(searchInput);
      if (serverSearch) onSearchChange?.(searchInput);
    }, 250);
    return () => clearTimeout(timer);
    // `onSearchChange` is a fresh closure on every render of most callers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, serverSearch]);

  const initialState = useMemo(
    () => ({
      ...(initialSorting ? { sorting: initialSorting } : {}),
      ...(initialColumnVisibility
        ? { columnVisibility: initialColumnVisibility }
        : {}),
      pagination: { pageIndex: 0, pageSize },
    }),
    // Seeds the starting state only; re-running it on a data change would
    // throw the reader back to page one mid-scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const table = useTable<DataTableFeatures, TData>({
    features: dataTableFeatures,
    data: rows,
    columns,
    getRowId,
    initialState,
    globalFilterFn: "includesString",
    // Dritter Klick hebt die Sortierung wieder auf. Serverseitig sortierte
    // Tabellen müssen die leere Sortierung annehmen und auf ihre eigene
    // Standardordnung zurückfallen — verwirft ihr `onSortingChange` sie
    // stattdessen, hängt die Spalte auf "absteigend" fest und reagiert auf
    // keinen weiteren Klick mehr.
    enableSortingRemoval: true,
    manualSorting,
    manualFiltering,
    manualPagination,
    rowCount,
    state: {
      // In server mode the table must not also filter the fetched page, or the
      // search term would be applied twice and hide matches the server found.
      globalFilter: serverSearch ? "" : globalFilter,
      ...(sortingProp ? { sorting: sortingProp } : {}),
      ...(columnFiltersProp ? { columnFilters: columnFiltersProp } : {}),
      ...(paginationProp ? { pagination: paginationProp } : {}),
    },
    onGlobalFilterChange: setGlobalFilter,
    ...(onSortingChange ? { onSortingChange } : {}),
    ...(onColumnFiltersChange ? { onColumnFiltersChange } : {}),
    ...(onPaginationChange ? { onPaginationChange } : {}),
  });

  const filteredCount = manualPagination
    ? (rowCount ?? rows.length)
    : table.getFilteredRowModel().rows.length;
  const totalCount = manualPagination ? (rowCount ?? rows.length) : rows.length;
  const pageRows =
    paginated && !manualPagination
      ? table.getPaginatedRowModel().rows
      : table.getSortedRowModel().rows;
  const sorting = table.state.sorting ?? [];
  const activeFilters = table.state.columnFilters ?? [];
  const canReset = activeFilters.length > 0 || searchInput !== "";

  const resetAll = useCallback(() => {
    table.resetColumnFilters();
    setSearchInput("");
    setGlobalFilter("");
    if (serverSearch) onSearchChange?.("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, serverSearch]);

  const columnCount = table.getVisibleLeafColumns().length;
  const emptyContent = emptyState ?? (
    <span className="dark:text-dark-muted text-sm text-gray-500">
      Keine Daten vorhanden.
    </span>
  );
  const noMatchContent = noMatchState ?? (
    <span className="dark:text-dark-muted text-sm text-gray-500">
      Keine Treffer für die aktuellen Filter.
    </span>
  );
  const pageIndex = table.state.pagination?.pageIndex ?? 0;
  const currentPageSize = table.state.pagination?.pageSize ?? pageSize;

  return (
    <div className={className}>
      {(searchable || toolbar) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {searchable && (
            <div className="relative min-w-[200px] flex-1">
              <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm focus:ring-1 focus:outline-none"
              />
            </div>
          )}
          {canReset && (
            <button
              type="button"
              onClick={resetAll}
              className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <FilterXIcon className="h-4 w-4" />
              Filter zurücksetzen
            </button>
          )}
          <ColumnVisibilityMenu table={table} />
          {toolbar}
        </div>
      )}

      <div className="dark:bg-dark-surface dark:border-dark-border overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {renderMobileRow && (
          <div className="md:hidden">
            {isLoading ? (
              <p className="dark:text-dark-muted px-4 py-10 text-center text-sm text-gray-500">
                Lade…
              </p>
            ) : pageRows.length === 0 ? (
              <div className="px-4 py-10 text-center">
                {rows.length === 0 ? emptyContent : noMatchContent}
              </div>
            ) : (
              <ul className="dark:divide-dark-border divide-y divide-gray-200">
                {pageRows.map((row) => (
                  <li
                    key={row.id}
                    onClick={
                      onRowClick ? () => onRowClick(row.original) : undefined
                    }
                    className={`px-4 py-3 ${onRowClick ? "cursor-pointer" : ""} ${
                      rowClassName?.(row.original) ?? ""
                    }`}
                  >
                    {renderMobileRow(row.original)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div
          className={`overflow-x-auto ${renderMobileRow ? "hidden md:block" : ""}`}
        >
          <table className="w-full text-left text-sm">
            <thead className="dark:bg-dark-background-secondary dark:text-dark-muted bg-gray-50 text-xs tracking-wide text-gray-500 uppercase">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta;
                    const canSort = header.column.getCanSort();
                    const canFilter = header.column.getCanFilter();
                    const sorted = canSort
                      ? header.column.getIsSorted()
                      : false;
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        colSpan={header.colSpan}
                        aria-sort={
                          sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : canSort
                                ? "none"
                                : undefined
                        }
                        className={`px-4 py-2.5 font-medium ${alignClass(meta?.align)} ${meta?.headerClassName ?? ""}`}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={`flex items-center gap-1 ${
                              meta?.align === "right"
                                ? "justify-end"
                                : meta?.align === "center"
                                  ? "justify-center"
                                  : ""
                            }`}
                          >
                            {canSort ? (
                              <button
                                type="button"
                                onClick={header.column.getToggleSortingHandler()}
                                title="Sortieren — Umschalt+Klick sortiert nach mehreren Spalten"
                                className="dark:hover:text-dark-text inline-flex min-w-0 items-center gap-1 hover:text-gray-800"
                              >
                                <span className="truncate">
                                  <table.FlexRender header={header} />
                                </span>
                                {sorted === "asc" ? (
                                  <ArrowUpIcon className="text-primary h-3.5 w-3.5 shrink-0" />
                                ) : sorted === "desc" ? (
                                  <ArrowDownIcon className="text-primary h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <ChevronsUpDownIcon className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                                )}
                                {sorting.length > 1 &&
                                  header.column.getSortIndex() > -1 && (
                                    <span className="text-primary text-[10px]">
                                      {header.column.getSortIndex() + 1}
                                    </span>
                                  )}
                              </button>
                            ) : (
                              <span className="min-w-0 truncate">
                                <table.FlexRender header={header} />
                              </span>
                            )}
                            {canFilter && (
                              <ColumnFilterMenu column={header.column} />
                            )}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="dark:divide-dark-border divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="dark:text-dark-muted px-4 py-10 text-center text-sm text-gray-500"
                  >
                    Lade…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="px-4 py-10 text-center">
                    {rows.length === 0 ? emptyContent : noMatchContent}
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={
                      onRowClick ? () => onRowClick(row.original) : undefined
                    }
                    className={`dark:hover:bg-dark-background-secondary hover:bg-gray-50 ${
                      onRowClick ? "cursor-pointer" : ""
                    } ${rowClassName?.(row.original) ?? ""}`}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta;
                      return (
                        <td
                          key={cell.id}
                          className={`dark:text-dark-text px-4 py-3 align-middle text-gray-700 ${alignClass(meta?.align)} ${meta?.cellClassName ?? ""}`}
                        >
                          <table.FlexRender cell={cell} />
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!hideFooter && !isLoading && totalCount > 0 && (
        <div className="dark:text-dark-muted mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
          <span>
            {filteredCount} {filteredCount === 1 ? rowNoun[0] : rowNoun[1]}
            {canReset && filteredCount !== totalCount
              ? ` von ${totalCount}`
              : ""}
          </span>
          {paginated && totalCount > Math.min(...pageSizeOptions) && (
            <div className="flex flex-wrap items-center gap-2">
              <label>
                <span className="sr-only">Zeilen pro Seite</span>
                <select
                  value={currentPageSize}
                  onChange={(event) =>
                    table.setPageSize(Number(event.target.value))
                  }
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text rounded-md border border-gray-300 px-2 py-1 text-sm"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size} pro Seite
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-md border border-gray-300 bg-white px-3 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white dark:hover:bg-gray-700 dark:disabled:hover:bg-transparent"
              >
                Zurück
              </button>
              <span className="whitespace-nowrap">
                Seite {pageIndex + 1} von {Math.max(1, table.getPageCount())}
              </span>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-md border border-gray-300 bg-white px-3 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white dark:hover:bg-gray-700 dark:disabled:hover:bg-transparent"
              >
                Weiter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
