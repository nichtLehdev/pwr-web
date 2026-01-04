"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { useToast } from "@/app/_components/ui/toast";
import {
  UserRole,
  ContentStatus,
  DownloadCategory,
  FileType,
} from "~/generated/prisma/enums";
import { CheckIcon, EditIcon, PlusIcon, SearchIcon } from "lucide-react";
import { DownloadIcon, TrashIcon } from "lucide-react";

const DASHBOARD_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.LPW,
  UserRole.RPW,
  UserRole.OBLEUTE,
];

const REVIEWER_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.LPW, UserRole.RPW];

const statusLabels: Record<ContentStatus, string> = {
  DRAFT: "Entwurf",
  PENDING: "Ausstehend",
  APPROVED: "Freigegeben",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

const statusColors: Record<ContentStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  PENDING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  ARCHIVED: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
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

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DownloadCategory | "">(
    "",
  );
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "">("");
  const [page, setPage] = useState(1);
  const limit = 20;

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

  const utils = api.useUtils();

  const { data, isLoading } = api.materials.getDownloads.useQuery(
    {
      page,
      limit,
      category: categoryFilter || undefined,
      search: search || undefined,
      includeAll: true,
    },
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
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!DASHBOARD_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        redirect("/");
      }
    }
  }, [profile, profileLoading]);

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

  if (isPending || profileLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !DASHBOARD_ROLES.includes(profile.role)) {
    return null;
  }

  const isReviewer = REVIEWER_ROLES.includes(profile.role);
  const canDelete =
    profile.role === UserRole.ADMIN || profile.role === UserRole.LPW;

  const filteredDownloads = statusFilter
    ? data?.downloads.filter((d) => d.status === statusFilter)
    : data?.downloads;

  return (
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/dashboard"
                className="dark:text-dark-muted dark:hover:text-primary hover:text-primary text-gray-500"
              >
                Dashboard
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">Downloads</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
              Downloads verwalten
            </h1>
            <p className="dark:text-dark-muted mt-2 text-gray-600">
              Lade Dateien hoch und verwalte Downloads
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Neuer Download
          </button>
        </div>

        {/* Filters */}
        <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Suchen..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as DownloadCategory | "");
                setPage(1);
              }}
              className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
            >
              <option value="">Alle Kategorien</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            {isReviewer && (
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as ContentStatus | "");
                  setPage(1);
                }}
                className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
              >
                <option value="">Alle Status</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Downloads List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
          </div>
        ) : !filteredDownloads?.length ? (
          <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <SearchIcon
              className="mx-auto h-12 w-12 text-gray-400"
              />
            <p className="dark:text-dark-muted mt-4 text-gray-500">
              Keine Downloads gefunden
            </p>
          </div>
        ) : (
          <div className="dark:bg-dark-surface dark:border-dark-border overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="dark:divide-dark-border min-w-full divide-y divide-gray-200">
              <thead className="dark:bg-dark-background-secondary bg-gray-50">
                <tr>
                  <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Datei
                  </th>
                  <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Kategorie
                  </th>
                  <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="dark:text-dark-text px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Hochgeladen von
                  </th>
                  <th className="dark:text-dark-text px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="dark:divide-dark-border divide-y divide-gray-200">
                {filteredDownloads.map((download) => (
                  <tr
                    key={download.id}
                    className="dark:hover:bg-dark-background-secondary hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {fileTypeIcons[download.fileType]}
                        </span>
                        <div>
                          <p className="dark:text-dark-text font-medium text-gray-900">
                            {download.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {fileTypeLabels[download.fileType]}
                            {download.fileSize &&
                              ` • ${formatFileSize(download.fileSize)}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="dark:text-dark-muted text-sm text-gray-600">
                        {categoryLabels[download.category]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[download.status]}`}
                      >
                        {statusLabels[download.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="dark:text-dark-muted text-sm text-gray-600">
                        {download.uploadedBy?.displayName ?? "Unbekannt"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {/* Download link */}
                        <a
                          href={download.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="dark:hover:bg-dark-border rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          title="Herunterladen"
                        >
                          <DownloadIcon
                            className="h-5 w-5"
                          />
                        </a>

                        {/* Edit button for reviewers */}
                        {isReviewer && (
                          <button
                            onClick={() => openEditModal(download)}
                            className="dark:hover:bg-dark-border rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Bearbeiten"
                          >
                            <EditIcon
                              className="h-5 w-5"
                            />
                          </button>
                        )}

                        {/* Approve button for reviewers */}
                        {isReviewer &&
                          download.status === ContentStatus.PENDING && (
                            <button
                              onClick={() =>
                                reviewMutation.mutate({
                                  id: download.id,
                                  status: ContentStatus.APPROVED,
                                })
                              }
                              disabled={reviewMutation.isPending}
                              className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                              title="Freigeben"
                            >
                              <CheckIcon
                                className="h-5 w-5"
                              />
                            </button>
                          )}

                        {/* Delete button */}
                        {canDelete && (
                          <button
                            onClick={() => setShowDeleteModal(download.id)}
                            className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Löschen"
                          >
                            <TrashIcon
                              className="h-5 w-5"
                            />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="dark:text-dark-muted text-sm text-gray-600">
              Seite {page} von {data.pages} ({data.total} Downloads)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="dark:bg-dark-surface dark:border-dark-border dark:hover:bg-dark-border rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:text-gray-300"
              >
                Zurück
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="dark:bg-dark-surface dark:border-dark-border dark:hover:bg-dark-border rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:text-gray-300"
              >
                Weiter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="dark:bg-dark-surface w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="dark:text-dark-text mb-4 text-xl font-semibold text-gray-900">
              Neuer Download
            </h2>

            <div className="space-y-4">
              {/* File Upload with Drag & Drop */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Datei
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5 dark:bg-primary/10"
                      : uploadedFileUrl
                        ? "border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-900/20"
                        : "dark:border-dark-border border-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
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
                      <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Lädt hoch...
                      </p>
                    </div>
                  ) : uploadedFileUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <CheckIcon
                        className="h-10 w-10 text-green-500"
                      />
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        Datei hochgeladen
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Klicken oder ziehen, um eine andere Datei auszuwählen
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <PlusIcon
                        className={`h-10 w-10 ${isDragging ? "text-primary" : "text-gray-400"}`}
                      />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {isDragging
                          ? "Datei hier ablegen"
                          : "Datei hierher ziehen"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        oder klicken zum Auswählen
                      </p>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        PDF, Word, Excel, ZIP, Audio (max. 50MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Titel *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Beschreibung
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Kategorie
                </label>
                <select
                  value={newCategory}
                  onChange={(e) =>
                    setNewCategory(e.target.value as DownloadCategory)
                  }
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Tags
                </label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="Kommagetrennte Tags, z.B. noten, ostern, chor"
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                />
                <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                  Mehrere Tags mit Komma trennen
                </p>
              </div>

              {uploadError && (
                <p className="text-sm text-red-600">{uploadError}</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  resetUploadForm();
                  setShowUploadModal(false);
                }}
                className="dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-border rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreate}
                disabled={
                  !uploadedFileUrl || !newTitle || createMutation.isPending
                }
                className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {createMutation.isPending ? "Speichern..." : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="dark:bg-dark-surface w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Download löschen
            </h3>
            <p className="dark:text-dark-muted mb-4 text-gray-600">
              Bist du sicher, dass du diesen Download löschen möchtest? Diese
              Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-border rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={() => deleteMutation.mutate({ id: showDeleteModal })}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Löschen..." : "Löschen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="dark:bg-dark-surface w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="dark:text-dark-text mb-4 text-xl font-semibold text-gray-900">
              Download bearbeiten
            </h2>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Titel *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Beschreibung
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Kategorie
                </label>
                <select
                  value={editCategory}
                  onChange={(e) =>
                    setEditCategory(e.target.value as DownloadCategory)
                  }
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Tags
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="Kommagetrennte Tags, z.B. noten, ostern, chor"
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                />
                <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
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
                  className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                />
                <label
                  htmlFor="editIsPublic"
                  className="dark:text-dark-text text-sm font-medium text-gray-700"
                >
                  Öffentlich sichtbar
                </label>
              </div>

              {editError && <p className="text-sm text-red-600">{editError}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(null)}
                className="dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-border rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleUpdate}
                disabled={!editTitle || updateMutation.isPending}
                className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {updateMutation.isPending ? "Speichern..." : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
