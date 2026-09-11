"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { DashboardPage } from "@/app/_components/dashboard";
import {
  DashboardListViewToggle,
  useDashboardListView,
} from "@/app/_components/dashboard/dashboard-list-view";
import { ContentStatus } from "~/generated/prisma/enums";
import { useToast } from "@/app/_components/ui/toast";
import { Button, Checkbox, Select } from "@/app/_components/ui";
import {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui/data-table";
import ImageWithFallback from "@/app/_components/ui/image-with-fallback";
import ImageCropEditor from "@/app/_components/posts/image-crop-editor";
import {
  CheckIcon,
  DownloadIcon,
  EditIcon,
  EyeIcon,
  ImageIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import type { PaginationState, SortingState } from "@tanstack/react-table";

import { MediaGrid } from "@/app/_components/media/media-grid";
import { MediaEditModal } from "@/app/_components/media/media-edit-modal";
import { MediaUploadModal } from "@/app/_components/media/media-upload-modal";
import { MediaPreviewModal } from "@/app/_components/media/media-preview-modal";
import { MediaDeleteDialog } from "@/app/_components/media/media-delete-dialog";
import { useMediaDownload } from "@/app/_components/media/use-media-download";
import { useReplaceMediaFile } from "@/app/_components/media/use-replace-media-file";
import {
  STATUS_ORDER,
  formatDate,
  formatFileSize,
  getMimeTypeIcon,
  getMimeTypeLabel,
  statusColors,
  statusLabels,
  type MediaItem,
} from "@/app/_components/media/media-shared";

const column = createDataTableColumnHelper<MediaItem>();

/** Die Spalten, nach denen der Server sortieren kann. */
const SORTABLE_COLUMNS = {
  createdAt: "createdAt",
  name: "name",
  size: "size",
  status: "status",
} as const;

type SortableColumn = keyof typeof SORTABLE_COLUMNS;

/**
 * Schnellfilter der Redaktion. Die zwei „fehlt noch“-Filter laufen auf dem
 * Server, damit sie über den gesamten Bestand greifen und nicht nur über die
 * gerade geladene Seite.
 */
type QuickFilter = "all" | "pending" | "missingAlt" | "missingCopyright";

const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "pending", label: "Ausstehend" },
  { value: "missingAlt", label: "Ohne Alt-Text" },
  { value: "missingCopyright", label: "Ohne Urheberangabe" },
];

export default function DashboardMediaPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);
  const toast = useToast();
  const utils = api.useUtils();
  const { downloadOne, downloadMany, isBundling } = useMediaDownload();

  const [view, setView] = useDashboardListView("dashboard:media:view", "cards");

  const [search, setSearch] = useState("");
  const [mimeTypeFilter, setMimeTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "">("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [folderFilter, setFolderFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 24,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [recropId, setRecropId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, { enabled: !!session?.user });

  const {
    hasDashboardAccess,
    hasPermission,
    isLoading: permissionsLoading,
  } = usePermissions();

  const canApprove = hasPermission(PERMISSIONS.MEDIA_APPROVE);
  const canDelete = hasPermission(PERMISSIONS.MEDIA_DELETE) || canApprove;
  const canEdit = hasPermission(PERMISSIONS.MEDIA_EDIT) || canApprove;

  /**
   * Status- und „fehlt noch“-Filter gehen als Abfrageparameter mit. Früher
   * filterte die Seite die geladenen Zeilen im Browser — bei 20 Zeilen pro
   * Seite blieb „Ausstehend“ dann leer, obwohl auf Seite 3 welche lagen.
   */
  const statusArgument = useMemo(() => {
    if (quickFilter === "pending") return [ContentStatus.PENDING];
    if (statusFilter) return [statusFilter];
    return undefined;
  }, [quickFilter, statusFilter]);

  const sortBy = (sorting[0]?.id ?? "createdAt") as SortableColumn;

  const queryInput = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    mimeType: mimeTypeFilter || undefined,
    folder: folderFilter || undefined,
    search: search || undefined,
    status: statusArgument,
    missing:
      quickFilter === "missingAlt"
        ? ("alt" as const)
        : quickFilter === "missingCopyright"
          ? ("copyright" as const)
          : undefined,
    sortBy: SORTABLE_COLUMNS[sortBy] ?? ("createdAt" as const),
    sortOrder: (sorting[0]?.desc === false ? "asc" : "desc") as "asc" | "desc",
    includeAll: true,
  };

  const { data, isLoading } = api.media.getAll.useQuery(queryInput, {
    enabled: !!profile,
  });

  const { data: statistics } = api.media.getStatistics.useQuery(undefined, {
    enabled: !!profile,
  });
  const { data: folders } = api.media.getFolders.useQuery(undefined, {
    enabled: !!profile,
  });

  const mediaList = useMemo(() => data?.media ?? [], [data]);

  const invalidate = () => {
    void utils.media.getAll.invalidate();
    void utils.media.getStatistics.invalidate();
  };

  const deleteMutation = api.media.delete.useMutation({
    onSuccess: () => {
      invalidate();
      setDeleteId(null);
      toast.success("Medium gelöscht");
    },
    onError: (error) => toast.error(error.message),
  });

  const bulkDeleteMutation = api.media.bulkDelete.useMutation({
    onSuccess: (result) => {
      invalidate();
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      toast.success(
        result.skipped > 0
          ? `${result.deleted} gelöscht, ${result.skipped} ohne Berechtigung übersprungen`
          : `${result.deleted} Medien gelöscht`,
      );
    },
    onError: (error) => toast.error(error.message),
  });

  const reviewMutation = api.media.review.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success("Status aktualisiert");
    },
    onError: (error) => toast.error(error.message),
  });

  const bulkReviewMutation = api.media.bulkReview.useMutation({
    onSuccess: (result) => {
      invalidate();
      setSelectedIds(new Set());
      toast.success(`${result.updated} Medien aktualisiert`);
    },
    onError: (error) => toast.error(error.message),
  });

  // Zuschnitt direkt aus der Übersicht (Kachel oder Tabellenzeile). Im
  // Bearbeiten-Dialog steckt derselbe Hook, dort aber über dem Formular.
  const { replace: replaceFile } = useReplaceMediaFile(() => {
    invalidate();
    setRecropId(null);
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/media");
    }
  }, [isPending, session]);

  useEffect(() => {
    if (!permissionsLoading && !hasDashboardAccess && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/");
    }
  }, [permissionsLoading, hasDashboardAccess]);

  const previewItem = mediaList.find((item) => item.id === previewId) ?? null;
  const editItem = mediaList.find((item) => item.id === editId) ?? null;
  const recropItem = mediaList.find((item) => item.id === recropId) ?? null;
  const deleteItem = mediaList.find((item) => item.id === deleteId) ?? null;
  const selectedItems = mediaList.filter((item) => selectedIds.has(item.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPageSelected =
    mediaList.length > 0 && mediaList.every((item) => selectedIds.has(item.id));

  const toggleSelectPage = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allOnPageSelected) {
        mediaList.forEach((item) => next.delete(item.id));
      } else {
        mediaList.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  const resetPage = () =>
    setPagination((current) => ({ ...current, pageIndex: 0 }));

  const columns = useMemo<DataTableColumn<MediaItem>[]>(
    () =>
      column.columns([
        column.display({
          id: "select",
          header: () => (
            <Checkbox
              checked={allOnPageSelected}
              onChange={toggleSelectPage}
              aria-label="Alle auf dieser Seite auswählen"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={selectedIds.has(row.original.id)}
              onChange={() => toggleSelect(row.original.id)}
              aria-label={`${row.original.name} auswählen`}
            />
          ),
          meta: { alwaysVisible: true, headerClassName: "w-10" },
        }),
        column.display({
          id: "preview",
          header: "",
          cell: ({ row }) => (
            <div className="relative h-10 w-10 overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
              {row.original.mimeType.startsWith("image/") ? (
                <ImageWithFallback
                  src={row.original.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-lg">
                  {getMimeTypeIcon(row.original.mimeType)}
                </span>
              )}
            </div>
          ),
          meta: { alwaysVisible: true, headerClassName: "w-14" },
        }),
        column.accessor((item) => item.name, {
          id: "name",
          header: "Name",
          enableColumnFilter: false,
          meta: { alwaysVisible: true },
          cell: ({ row }) => (
            <button
              type="button"
              onClick={() => setPreviewId(row.original.id)}
              className="hover:text-primary max-w-[22ch] truncate text-left font-medium"
              title={row.original.name}
            >
              {row.original.name}
            </button>
          ),
        }),
        column.accessor((item) => item.status, {
          id: "status",
          header: "Status",
          enableColumnFilter: false,
          cell: ({ row }) => (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[row.original.status]}`}
            >
              {statusLabels[row.original.status]}
            </span>
          ),
        }),
        column.accessor((item) => item.alt, {
          id: "alt",
          header: "Alt-Text",
          enableSorting: false,
          enableColumnFilter: false,
          cell: ({ row }) =>
            row.original.alt ? (
              <span className="block max-w-[24ch] truncate">
                {row.original.alt}
              </span>
            ) : (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                fehlt
              </span>
            ),
        }),
        column.accessor(
          (item) => [item.copyright, item.creator].filter(Boolean).join(" · "),
          {
            id: "rights",
            header: "Urheber",
            enableSorting: false,
            enableColumnFilter: false,
            cell: ({ getValue }) =>
              getValue() ? (
                <span className="block max-w-[22ch] truncate">
                  {getValue()}
                </span>
              ) : (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  fehlt
                </span>
              ),
          },
        ),
        column.accessor((item) => item.mimeType, {
          id: "type",
          header: "Typ",
          enableSorting: false,
          enableColumnFilter: false,
          cell: ({ getValue }) => getMimeTypeLabel(getValue()),
        }),
        column.accessor((item) => item.size, {
          id: "size",
          header: "Größe",
          enableColumnFilter: false,
          meta: { align: "right", cellClassName: "tabular-nums" },
          cell: ({ getValue }) => formatFileSize(getValue()),
        }),
        column.accessor((item) => item.uploadedBy?.displayName ?? "—", {
          id: "uploadedBy",
          header: "Hochgeladen von",
          enableSorting: false,
          enableColumnFilter: false,
        }),
        column.accessor((item) => item.createdAt, {
          id: "createdAt",
          header: "Datum",
          enableColumnFilter: false,
          meta: { cellClassName: "whitespace-nowrap tabular-nums" },
          cell: ({ getValue }) => formatDate(getValue()),
        }),
        column.display({
          id: "actions",
          header: "",
          cell: ({ row }) => (
            <div className="flex justify-end gap-0.5">
              <IconAction
                label="Vorschau"
                icon={EyeIcon}
                onClick={() => setPreviewId(row.original.id)}
              />
              <IconAction
                label="Herunterladen"
                icon={DownloadIcon}
                onClick={() => downloadOne(row.original)}
              />
              {canEdit && (
                <IconAction
                  label="Bearbeiten"
                  icon={EditIcon}
                  onClick={() => setEditId(row.original.id)}
                />
              )}
              {canApprove && row.original.status === ContentStatus.PENDING && (
                <IconAction
                  label="Freigeben"
                  icon={CheckIcon}
                  tone="success"
                  onClick={() =>
                    reviewMutation.mutate({
                      id: row.original.id,
                      status: ContentStatus.APPROVED,
                    })
                  }
                />
              )}
              {canDelete && (
                <IconAction
                  label="Löschen"
                  icon={TrashIcon}
                  tone="danger"
                  onClick={() => setDeleteId(row.original.id)}
                />
              )}
            </div>
          ),
          meta: { alwaysVisible: true, align: "right" },
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIds, allOnPageSelected, canEdit, canDelete, canApprove, mediaList],
  );

  if (isPending || profileLoading || permissionsLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !hasDashboardAccess) return null;

  return (
    <>
      <DashboardPage
        title="Medien verwalten"
        description="Bilder hochladen, beschreiben und freigeben"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Medien" },
        ]}
        actions={
          <Button onClick={() => setShowUploadModal(true)}>
            <PlusIcon className="mr-1.5 h-5 w-5" />
            Medien hochladen
          </Button>
        }
      >
        {statistics && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Gesamt" value={statistics.totalMedia} />
            <StatCard
              label="Speicher"
              value={formatFileSize(statistics.totalSize)}
            />
            <StatCard
              label="Ausstehend"
              value={statistics.pendingCount}
              tone={statistics.pendingCount > 0 ? "warning" : "default"}
              onClick={() => {
                setQuickFilter("pending");
                setStatusFilter("");
                resetPage();
              }}
            />
            <StatCard
              label="Ohne Alt-Text"
              value={statistics.missingAltCount}
              tone={statistics.missingAltCount > 0 ? "warning" : "default"}
              onClick={() => {
                setQuickFilter("missingAlt");
                setStatusFilter("");
                resetPage();
              }}
            />
          </div>
        )}

        {/* Filterleiste. Die Auswahlfelder tragen eine feste Breite: als reine
            `w-full`-Elemente in einer Flex-Zeile drängten sie das Suchfeld auf
            34 Pixel zusammen. */}
        <div className="dark:bg-dark-surface dark:border-dark-border mb-4 space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              placeholder="Suchen …"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPage();
              }}
              className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
            />
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <div className="w-40">
                <Select
                  value={mimeTypeFilter}
                  onChange={(event) => {
                    setMimeTypeFilter(event.target.value);
                    resetPage();
                  }}
                >
                  <option value="">Alle Typen</option>
                  <option value="image">Bilder</option>
                  <option value="video">Videos</option>
                  <option value="audio">Audio</option>
                  <option value="application/pdf">PDF</option>
                </Select>
              </div>

              {canApprove && (
                <div className="w-40">
                  <Select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value as ContentStatus | "");
                      setQuickFilter("all");
                      resetPage();
                    }}
                  >
                    <option value="">Alle Status</option>
                    {STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {folders && folders.length > 0 && (
                <div className="w-40">
                  <Select
                    value={folderFilter}
                    onChange={(event) => {
                      setFolderFilter(event.target.value);
                      resetPage();
                    }}
                  >
                    <option value="">Alle Ordner</option>
                    {folders.map((folder) => (
                      <option key={folder} value={folder}>
                        {folder}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <DashboardListViewToggle view={view} onChange={setView} />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setQuickFilter(filter.value);
                  if (filter.value !== "all") setStatusFilter("");
                  resetPage();
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  quickFilter === filter.value
                    ? "bg-primary text-white"
                    : "dark:border-dark-border dark:text-dark-muted border border-gray-300 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sammelaktionen. Erscheint nur mit Auswahl, damit die Leiste sonst
            keinen Platz kostet. */}
        {selectedIds.size > 0 && (
          <div className="dark:bg-dark-surface dark:border-dark-border mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
            <span className="dark:text-dark-text text-sm font-medium text-gray-900">
              {selectedIds.size} ausgewählt
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void downloadMany(selectedItems)}
              disabled={isBundling || selectedItems.length === 0}
              isLoading={isBundling}
            >
              <DownloadIcon className="mr-1.5 h-4 w-4" />
              Herunterladen
            </Button>
            {canApprove && (
              <Button
                variant="success"
                size="sm"
                onClick={() =>
                  bulkReviewMutation.mutate({
                    ids: [...selectedIds],
                    status: ContentStatus.APPROVED,
                  })
                }
                disabled={bulkReviewMutation.isPending}
              >
                <CheckIcon className="mr-1.5 h-4 w-4" />
                Freigeben
              </Button>
            )}
            {canDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <TrashIcon className="mr-1.5 h-4 w-4" />
                Löschen
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => setSelectedIds(new Set())}
            >
              <XIcon className="mr-1.5 h-4 w-4" />
              Auswahl aufheben
            </Button>
          </div>
        )}

        {view === "table" ? (
          <DataTable
            data={mediaList}
            columns={columns}
            getRowId={(item) => item.id}
            isLoading={isLoading}
            rowNoun={["Medium", "Medien"]}
            searchable={false}
            pageSizeOptions={[24, 48, 96]}
            emptyState={
              <span className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                <ImageIcon className="h-8 w-8" />
                Keine Medien gefunden.
              </span>
            }
            sorting={sorting}
            onSortingChange={setSorting}
            manualSorting
            manualFiltering
            pagination={pagination}
            onPaginationChange={setPagination}
            manualPagination
            rowCount={data?.total ?? 0}
          />
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
          </div>
        ) : mediaList.length === 0 ? (
          <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="dark:text-dark-muted mt-4 text-gray-500">
              Keine Medien gefunden
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-3">
              <label className="dark:text-dark-muted flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                <Checkbox
                  checked={allOnPageSelected}
                  onChange={toggleSelectPage}
                />
                Alle auf dieser Seite
              </label>
            </div>

            <MediaGrid
              media={mediaList}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onPreview={(item) => setPreviewId(item.id)}
              onEdit={(item) => setEditId(item.id)}
              onRecrop={(item) => setRecropId(item.id)}
              onDelete={(item) => setDeleteId(item.id)}
              onDownload={(item) => downloadOne(item)}
              onApprove={(item) =>
                reviewMutation.mutate({
                  id: item.id,
                  status: ContentStatus.APPROVED,
                })
              }
              canEdit={canEdit}
              canDelete={canDelete}
              canApprove={canApprove}
            />

            {data && data.pages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="dark:text-dark-muted text-sm text-gray-600">
                  Seite {pagination.pageIndex + 1} von {data.pages} (
                  {data.total} Medien)
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      setPagination((current) => ({
                        ...current,
                        pageIndex: Math.max(0, current.pageIndex - 1),
                      }))
                    }
                    disabled={pagination.pageIndex === 0}
                    variant="outline"
                    size="sm"
                  >
                    Zurück
                  </Button>
                  <Button
                    onClick={() =>
                      setPagination((current) => ({
                        ...current,
                        pageIndex: Math.min(
                          data.pages - 1,
                          current.pageIndex + 1,
                        ),
                      }))
                    }
                    disabled={pagination.pageIndex >= data.pages - 1}
                    variant="outline"
                    size="sm"
                  >
                    Weiter
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DashboardPage>

      {showUploadModal && (
        <MediaUploadModal onClose={() => setShowUploadModal(false)} />
      )}

      {previewItem && (
        <MediaPreviewModal
          media={previewItem}
          canEdit={canEdit}
          onClose={() => setPreviewId(null)}
          onEdit={() => {
            setPreviewId(null);
            setEditId(previewItem.id);
          }}
        />
      )}

      {editItem && (
        <MediaEditModal media={editItem} onClose={() => setEditId(null)} />
      )}

      {deleteItem && (
        <MediaDeleteDialog
          media={deleteItem}
          isDeleting={deleteMutation.isPending}
          onClose={() => setDeleteId(null)}
          onConfirm={() => deleteMutation.mutate({ id: deleteItem.id })}
        />
      )}

      {bulkDeleteOpen && (
        <BulkDeleteDialog
          count={selectedIds.size}
          isDeleting={bulkDeleteMutation.isPending}
          onClose={() => setBulkDeleteOpen(false)}
          onConfirm={() => bulkDeleteMutation.mutate({ ids: [...selectedIds] })}
        />
      )}

      {recropItem?.mimeType.startsWith("image/") && (
        <ImageCropEditor
          imageUrl={recropItem.url}
          onCropComplete={(blob, filename, width, height) =>
            replaceFile(recropItem.id, blob, filename, width, height)
          }
          onClose={() => setRecropId(null)}
        />
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
  onClick,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "warning";
  onClick?: () => void;
}) {
  const content = (
    <>
      <p className="dark:text-dark-muted text-sm text-gray-500">{label}</p>
      <p
        className={`text-2xl font-bold ${
          tone === "warning"
            ? "text-amber-600 dark:text-amber-400"
            : "dark:text-dark-text text-gray-900"
        }`}
      >
        {value}
      </p>
    </>
  );

  const className =
    "dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm";

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`${className} hover:border-primary transition-colors`}
    >
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}

function IconAction({
  label,
  icon: Icon,
  onClick,
  tone = "neutral",
}: {
  label: string;
  icon: typeof EditIcon;
  onClick: () => void;
  tone?: "neutral" | "success" | "danger";
}) {
  const tones = {
    neutral:
      "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700",
    success:
      "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30",
    danger:
      "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30",
  } as const;

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors ${tones[tone]}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function BulkDeleteDialog({
  count,
  onClose,
  onConfirm,
  isDeleting,
}: {
  count: number;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <ScrollableModalShell onClose={isDeleting ? undefined : onClose}>
      <h3 className="dark:text-dark-text mb-3 text-lg font-semibold text-gray-900">
        {count} Medien löschen
      </h3>
      <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
        Die Dateien werden auch von der Festplatte entfernt. Einträge, die
        unmittelbar an einem Bild hängen — Bläserhefte und Folien des
        Startseiten-Karussells — verschwinden mit. Diese Aktion kann nicht
        rückgängig gemacht werden.
      </p>
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isDeleting}
        >
          Abbrechen
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onConfirm}
          disabled={isDeleting}
          isLoading={isDeleting}
        >
          Endgültig löschen
        </Button>
      </div>
    </ScrollableModalShell>
  );
}

function ScrollableModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex min-h-full items-center justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="dark:bg-dark-surface w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
