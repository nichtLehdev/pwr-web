"use client";
import { Select } from "@/app/_components/ui";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import type { PermissionKey } from "@/lib/permissions";
import { DashboardPage } from "@/app/_components/dashboard";
import {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui/data-table";
import { useToast } from "@/app/_components/ui/toast";
import {
  ContentStatus,
  DownloadCategory,
  FileType,
} from "~/generated/prisma/enums";
import { CheckIcon, EditIcon, PlusIcon, SearchIcon } from "lucide-react";
import { DownloadIcon, TrashIcon } from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import { Tag, type TagTone } from "@/app/_components/programmheft/tag";

// Dashboard access is now controlled by permissions

type DashboardDownload =
  RouterOutputs["materials"]["getDownloads"]["downloads"][number];

const column = createDataTableColumnHelper<DashboardDownload>();

const statusLabels: Record<ContentStatus, string> = {
  DRAFT: "Entwurf",
  PENDING: "Ausstehend",
  APPROVED: "Freigegeben",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

/**
 * Spiegelt die Zuordnung aus `content-status.tsx` — derselbe Status muss
 * überall gleich aussehen. `Tag` hat inzwischen einen fünften, umrandeten
 * Ton (`muted`): Entwurf und Archiviert sind reine Ablagezustände ohne
 * Handlungsbedarf und standen bisher gefüllt, also so laut wie
 * „Veröffentlicht".
 *
 * Gefüllt heißt „das musst du sehen", umrandet „das ist nur der Stand".
 *
 * Dass diese Tabelle hier überhaupt doppelt steht, bleibt ein offener Punkt —
 * richtig wäre `ContentStatusBadge` aus `content-status.tsx`.
 */
const statusTone: Record<ContentStatus, TagTone> = {
  DRAFT: "muted",
  PENDING: "orange",
  APPROVED: "ink",
  REJECTED: "cancelled",
  ARCHIVED: "muted",
};

const categoryLabels: Record<DownloadCategory, string> = {
  BLECHBLATT: "Rheinisches Blechblatt",
  NOTEN: "Noten",
  UEBUNGEN: "Übungen",
  FORMULARE: "Formulare",
  SONSTIGES: "Sonstiges",
};

const fileTypeLabels: Record<FileType, string> = {
  PDF: "PDF",
  DOCX: "Word",
  XLSX: "Excel",
  ZIP: "ZIP",
  MP3: "Audio",
};

const fileTypeIcons: Record<FileType, string> = {
  PDF: "📄",
  DOCX: "📝",
  XLSX: "📊",
  ZIP: "📦",
  MP3: "🎵",
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DashboardDownloadsPage() {
  const { data: session, isPending } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<DownloadCategory>("SONSTIGES");
  const [newFileType, setNewFileType] = useState<FileType>("PDF");
  const [newTags, setNewTags] = useState("");
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");
  const [uploadedFileSize, setUploadedFileSize] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] =
    useState<DownloadCategory>("SONSTIGES");
  const [editTags, setEditTags] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editError, setEditError] = useState("");

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const {
    hasDashboardAccess,
    hasPermission,
    isLoading: permissionsLoading,
  } = usePermissions();

  const hasApprovePermission = hasPermission(
    "downloads.approve" as PermissionKey,
  );
  const hasDeletePermission =
    hasPermission("downloads.delete" as PermissionKey) ||
    hasPermission("downloads.manage" as PermissionKey);

  const utils = api.useUtils();

  // Die ganze Liste auf einmal: Kategorie, Status und Suche sind jetzt Filter
  // der Tabelle und müssen über alle Zeilen greifen, nicht nur über eine Seite.
  const { data, isLoading } = api.materials.getDownloads.useQuery(
    { page: 1, limit: 100, includeAll: true },
    { enabled: !!profile },
  );

  const createMutation = api.materials.createDownload.useMutation({
    onSuccess: () => {
      void utils.materials.getDownloads.invalidate();
      resetUploadForm();
      setShowUploadModal(false);
      toast.success("Download erfolgreich erstellt");
    },
    onError: (error) => {
      setUploadError(error.message);
      toast.error("Fehler beim Erstellen: " + error.message);
    },
  });

  const deleteMutation = api.materials.deleteDownload.useMutation({
    onSuccess: () => {
      void utils.materials.getDownloads.invalidate();
      setShowDeleteModal(null);
      toast.success("Download erfolgreich gelöscht");
    },
    onError: (error) => {
      toast.error("Fehler beim Löschen: " + error.message);
    },
  });

  const reviewMutation = api.materials.reviewDownload.useMutation({
    onSuccess: (_, variables) => {
      void utils.materials.getDownloads.invalidate();
      const statusText =
        variables.status === "APPROVED" ? "freigegeben" : "abgelehnt";
      toast.success(`Download wurde ${statusText}`);
    },
    onError: (error) => {
      toast.error("Fehler bei der Überprüfung: " + error.message);
    },
  });

  const updateMutation = api.materials.updateDownload.useMutation({
    onSuccess: () => {
      void utils.materials.getDownloads.invalidate();
      setShowEditModal(null);
      toast.success("Download erfolgreich aktualisiert");
    },
    onError: (error) => {
      setEditError(error.message);
      toast.error("Fehler beim Aktualisieren: " + error.message);
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/downloads");
    }
  }, [isPending, session]);

  useEffect(() => {
    if (!permissionsLoading && !hasDashboardAccess && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/");
    }
  }, [permissionsLoading, hasDashboardAccess]);

  const resetUploadForm = () => {
    setNewTitle("");
    setNewDescription("");
    setNewCategory("SONSTIGES");
    setNewFileType("PDF");
    setNewTags("");
    setUploadedFileUrl("");
    setUploadedFileSize(0);
    setUploadError("");
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openEditModal = (
    download: NonNullable<typeof data>["downloads"][number],
  ) => {
    setEditTitle(download.title);
    setEditDescription(download.description ?? "");
    setEditCategory(download.category);
    setEditTags(download.tags?.join(", ") ?? "");
    setEditIsPublic(download.isPublic);
    setEditError("");
    setShowEditModal(download.id);
  };

  const handleUpdate = () => {
    if (!showEditModal || !editTitle) return;

    const tagsArray = editTags
      ? editTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : undefined;

    updateMutation.mutate({
      id: showEditModal,
      title: editTitle,
      description: editDescription || undefined,
      category: editCategory,
      tags: tagsArray,
      isPublic: editIsPublic,
    });
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement> | File,
  ) => {
    const file = e instanceof File ? e : e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setUploadError("Die Datei ist zu groß. Maximal 50MB erlaubt.");
      return;
    }

    setUploadError("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "downloads");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload fehlgeschlagen");
      }

      const data = (await response.json()) as {
        url: string;
        filename: string;
        size: number;
        extension: string;
      };

      setUploadedFileUrl(data.url);
      setUploadedFileSize(data.size);

      const ext = data.extension.toLowerCase();
      if (ext === "pdf") setNewFileType("PDF");
      else if (["doc", "docx"].includes(ext)) setNewFileType("DOCX");
      else if (["xls", "xlsx"].includes(ext)) setNewFileType("XLSX");
      else if (ext === "zip") setNewFileType("ZIP");
      else if (["mp3", "wav", "ogg"].includes(ext)) setNewFileType("MP3");

      if (!newTitle) {
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        setNewTitle(baseName);
      }
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Upload fehlgeschlagen",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      void handleFileUpload(file);
    }
  };

  const handleCreate = () => {
    if (!uploadedFileUrl || !newTitle) return;

    const tagsArray = newTags
      ? newTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : undefined;

    createMutation.mutate({
      title: newTitle,
      description: newDescription || undefined,
      category: newCategory,
      fileUrl: uploadedFileUrl,
      fileType: newFileType,
      fileSize: uploadedFileSize,
      tags: tagsArray,
      isPublic: true,
    });
  };

  const isReviewer = hasApprovePermission;
  const canDelete = hasDeletePermission;

  const columns = useMemo<DataTableColumn<DashboardDownload>[]>(
    () =>
      column.columns([
        column.accessor((download) => download.title, {
          id: "title",
          header: "Datei",
          meta: { alwaysVisible: true },
          cell: ({ row }) => {
            const download = row.original;
            return (
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {fileTypeIcons[download.fileType]}
                </span>
                <div className="min-w-0">
                  <p className="text-ink dark:text-night-text font-medium">
                    {download.title}
                  </p>
                  <p className="text-dark dark:text-night-muted text-sm">
                    {fileTypeLabels[download.fileType]}
                    {download.fileSize &&
                      ` • ${formatFileSize(download.fileSize)}`}
                  </p>
                </div>
              </div>
            );
          },
        }),
        column.accessor((download) => categoryLabels[download.category], {
          id: "category",
          header: "Kategorie",
          meta: { filterVariant: "set" },
        }),
        column.accessor((download) => fileTypeLabels[download.fileType], {
          id: "fileType",
          header: "Typ",
          meta: { filterVariant: "set" },
        }),
        column.accessor((download) => download.fileSize ?? 0, {
          id: "fileSize",
          header: "Größe",
          meta: { align: "right", filterVariant: "number", label: "Größe" },
          cell: ({ getValue }) =>
            getValue() ? formatFileSize(getValue()) : "—",
        }),
        column.accessor((download) => statusLabels[download.status], {
          id: "status",
          header: "Status",
          meta: { filterVariant: "set" },
          cell: ({ row, getValue }) => (
            <Tag tone={statusTone[row.original.status]}>{getValue()}</Tag>
          ),
        }),
        column.accessor(
          (download) => download.uploadedBy?.displayName ?? "Unbekannt",
          {
            id: "uploadedBy",
            header: "Hochgeladen von",
            meta: { filterVariant: "set" },
          },
        ),
        column.display({
          id: "actions",
          header: "Aktionen",
          meta: { align: "right", label: "Aktionen" },
          cell: ({ row }) => {
            const download = row.original;
            return (
              <div className="flex items-center justify-end gap-2">
                <a
                  href={download.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-dark hover:bg-rule/60 hover:text-ink dark:text-night-muted dark:hover:bg-night-rule dark:hover:text-night-text p-1"
                  title="Herunterladen"
                >
                  <DownloadIcon className="h-5 w-5" />
                </a>
                {isReviewer && (
                  <button
                    onClick={() => openEditModal(download)}
                    className="text-dark hover:bg-rule/60 hover:text-ink dark:text-night-muted dark:hover:bg-night-rule dark:hover:text-night-text p-1"
                    title="Bearbeiten"
                  >
                    <EditIcon className="h-5 w-5" />
                  </button>
                )}
                {isReviewer && download.status === ContentStatus.PENDING && (
                  <button
                    onClick={() =>
                      reviewMutation.mutate({
                        id: download.id,
                        status: ContentStatus.APPROVED,
                      })
                    }
                    disabled={reviewMutation.isPending}
                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                    title="Freigeben"
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => setShowDeleteModal(download.id)}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Löschen"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            );
          },
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isReviewer, canDelete, reviewMutation.isPending],
  );

  if (isPending || profileLoading || permissionsLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !hasDashboardAccess) {
    return null;
  }

  return (
    <>
      <DashboardPage
        title="Downloads verwalten"
        description="Lade Dateien hoch und verwalte Downloads"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Downloads" },
        ]}
        actions={
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-primary hover:bg-primary-dark text-ink semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Neuer Download
          </button>
        }
      >
        <DataTable
          data={data?.downloads}
          columns={columns}
          getRowId={(download) => download.id}
          isLoading={isLoading}
          rowNoun={["Download", "Downloads"]}
          searchPlaceholder="Titel oder Beschreibung suchen…"
          initialSorting={[{ id: "title", desc: false }]}
          emptyState={
            <>
              <SearchIcon className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
              <p className="text-dark dark:text-night-muted mt-4">
                Keine Downloads gefunden
              </p>
            </>
          }
        />
      </DashboardPage>

      {/* Upload Modal */}
      {showUploadModal && (
        <ScrollableModal>
          <ScrollableModalCard maxW="lg">
            <ScrollableModalBody>
              <h2 className="text-ink dark:text-night-text mb-4 text-xl font-semibold">
                Neuer Download
              </h2>

              <div className="space-y-4">
                {/* File Upload with Drag & Drop */}
                <div>
                  <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                    Datei
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative cursor-pointer border-2 border-dashed p-6 text-center transition-colors ${
                      isDragging
                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                        : uploadedFileUrl
                          ? "border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-900/20"
                          : "border-ink dark:border-night-text hover:bg-rule/25 dark:hover:bg-night-raised"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.mp3,.wav,.ogg"
                      className="hidden"
                    />
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
                        <p className="text-dark dark:text-night-muted text-sm">
                          Lädt hoch...
                        </p>
                      </div>
                    ) : uploadedFileUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckIcon className="h-10 w-10 text-green-500" />
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                          Datei hochgeladen
                        </p>
                        <p className="text-dark dark:text-night-muted text-xs">
                          Klicken oder ziehen, um eine andere Datei auszuwählen
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <PlusIcon
                          className={`h-10 w-10 ${isDragging ? "text-primary" : "text-dark dark:text-night-muted"}`}
                        />
                        <p className="text-ink dark:text-night-text text-sm font-medium">
                          {isDragging
                            ? "Datei hier ablegen"
                            : "Datei hierher ziehen"}
                        </p>
                        <p className="text-dark dark:text-night-muted text-xs">
                          oder klicken zum Auswählen
                        </p>
                        <p className="text-dark dark:text-night-muted mt-1 text-xs">
                          PDF, Word, Excel, ZIP, Audio (max. 50MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                    Titel *
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper w-full border px-4 py-2"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                    Beschreibung
                  </label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={2}
                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper w-full border px-4 py-2"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                    Kategorie
                  </label>
                  <Select
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as DownloadCategory)
                    }
                  >
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="Kommagetrennte Tags, z.B. noten, ostern, chor"
                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper w-full border px-4 py-2"
                  />
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
                    Mehrere Tags mit Komma trennen
                  </p>
                </div>

                {uploadError && (
                  <p className="text-sm text-red-600">{uploadError}</p>
                )}
              </div>
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    resetUploadForm();
                    setShowUploadModal(false);
                  }}
                  className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-11 border px-4 py-2 text-sm font-semibold"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleCreate}
                  disabled={
                    !uploadedFileUrl || !newTitle || createMutation.isPending
                  }
                  className="bg-primary hover:bg-primary-dark text-ink min-h-11 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {createMutation.isPending ? "Speichern..." : "Speichern"}
                </button>
              </div>
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <ScrollableModal>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h3 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
                Download löschen
              </h3>
              <p className="text-dark dark:text-night-muted mb-4">
                Bist du sicher, dass du diesen Download löschen möchtest? Diese
                Aktion kann nicht rückgängig gemacht werden.
              </p>
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-11 border px-4 py-2 text-sm font-semibold"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => deleteMutation.mutate({ id: showDeleteModal })}
                  disabled={deleteMutation.isPending}
                  className="min-h-11 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Löschen..." : "Löschen"}
                </button>
              </div>
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <ScrollableModal>
          <ScrollableModalCard maxW="lg">
            <ScrollableModalBody>
              <h2 className="text-ink dark:text-night-text mb-4 text-xl font-semibold">
                Download bearbeiten
              </h2>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                    Titel *
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper w-full border px-4 py-2"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                    Beschreibung
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper w-full border px-4 py-2"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                    Kategorie
                  </label>
                  <Select
                    value={editCategory}
                    onChange={(e) =>
                      setEditCategory(e.target.value as DownloadCategory)
                    }
                  >
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="Kommagetrennte Tags, z.B. noten, ostern, chor"
                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper w-full border px-4 py-2"
                  />
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
                    Mehrere Tags mit Komma trennen
                  </p>
                </div>

                {/* Public Toggle */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="editIsPublic"
                    checked={editIsPublic}
                    onChange={(e) => setEditIsPublic(e.target.checked)}
                    className="text-primary border-ink dark:border-night-text h-4 w-4 border"
                  />
                  <label
                    htmlFor="editIsPublic"
                    className="text-ink dark:text-night-text text-sm font-medium"
                  >
                    Öffentlich sichtbar
                  </label>
                </div>

                {editError && (
                  <p className="text-sm text-red-600">{editError}</p>
                )}
              </div>
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(null)}
                  className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-11 border px-4 py-2 text-sm font-semibold"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={!editTitle || updateMutation.isPending}
                  className="bg-primary hover:bg-primary-dark text-ink min-h-11 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Speichern..." : "Speichern"}
                </button>
              </div>
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}
    </>
  );
}
