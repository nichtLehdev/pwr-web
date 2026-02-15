"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import Image from "next/image";
import { UserRole, ContentStatus } from "~/generated/prisma/enums";
import { useToast } from "@/app/_components/ui/toast";
import { CheckIcon, ImageIcon, PlusIcon } from "lucide-react";
import { EditIcon, XIcon } from "lucide-react";
import { TrashIcon } from "lucide-react";
import { Button, Input, Label } from "@/app/_components/ui";

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

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMimeTypeIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType === "application/pdf") return "📄";
  return "📎";
}

function getMimeTypeLabel(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "Bild";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType === "application/pdf") return "PDF";
  return "Datei";
}

export default function DashboardMediaPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [mimeTypeFilter, setMimeTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "">("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [newName, setNewName] = useState("");
  const [newCopyright, setNewCopyright] = useState("");
  const [newCreator, setNewCreator] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    path: string;
    extension: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editName, setEditName] = useState("");
  const [editAlt, setEditAlt] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editCopyright, setEditCopyright] = useState("");
  const [editCreator, setEditCreator] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editError, setEditError] = useState("");

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const utils = api.useUtils();

  const { data, isLoading } = api.media.getAll.useQuery(
    {
      page,
      limit,
      mimeType: mimeTypeFilter || undefined,
      search: search || undefined,
      includeAll: true,
    },
    { enabled: !!profile },
  );

  const { data: statistics } = api.media.getStatistics.useQuery(undefined, {
    enabled: !!profile,
  });

  const createMutation = api.media.create.useMutation({
    onSuccess: () => {
      void utils.media.getAll.invalidate();
      void utils.media.getStatistics.invalidate();
      resetUploadForm();
      setShowUploadModal(false);
      toast.success("Medium erfolgreich hochgeladen");
    },
    onError: (error) => {
      setUploadError(error.message);
      toast.error(error.message);
    },
  });

  const deleteMutation = api.media.delete.useMutation({
    onSuccess: () => {
      void utils.media.getAll.invalidate();
      void utils.media.getStatistics.invalidate();
      setShowDeleteModal(null);
      toast.success("Medium gelöscht");
    },
  });

  const reviewMutation = api.media.review.useMutation({
    onSuccess: () => {
      void utils.media.getAll.invalidate();
      toast.success("Status aktualisiert");
    },
  });

  const updateMutation = api.media.update.useMutation({
    onSuccess: () => {
      void utils.media.getAll.invalidate();
      setShowEditModal(null);
      toast.success("Änderungen gespeichert");
    },
    onError: (error) => {
      setEditError(error.message);
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/media");
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
    setNewName("");
    setNewCopyright("");
    setNewCreator("");
    setUploadedFile(null);
    setUploadError("");
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openEditModal = (media: NonNullable<typeof data>["media"][number]) => {
    setEditName(media.name);
    setEditAlt(media.alt ?? "");
    setEditCaption(media.caption ?? "");
    setEditTitle(media.title ?? "");
    setEditCopyright(media.copyright ?? "");
    setEditCreator(media.creator ?? "");
    setEditTags(typeof media.tags === "string" ? media.tags : "");
    setEditIsPublic(media.isPublic);
    setEditError("");
    setShowEditModal(media.id);
  };

  const handleUpdate = () => {
    if (!showEditModal) return;

    updateMutation.mutate({
      id: showEditModal,
      alt: editAlt || undefined,
      caption: editCaption || undefined,
      title: editTitle || undefined,
      copyright: editCopyright || undefined,
      creator: editCreator || undefined,
      tags: editTags || undefined,
      isPublic: editIsPublic,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
      formData.append("folder", "media");

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
        mimeType: string;
        path: string;
        extension: string;
      };

      setUploadedFile({
        url: data.url,
        filename: data.filename,
        size: data.size,
        mimeType: data.mimeType || file.type,
        path: data.path || data.url,
        extension: data.extension || file.name.split(".").pop() || "",
      });

      if (!newName) {
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        setNewName(baseName);
      }
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Upload fehlgeschlagen",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = () => {
    if (!uploadedFile || !newName) return;

    createMutation.mutate({
      name: newName,
      filename: uploadedFile.filename,
      url: uploadedFile.url,
      path: uploadedFile.path,
      mimeType: uploadedFile.mimeType,
      size: uploadedFile.size,
      extension: uploadedFile.extension,
      copyright: newCopyright || undefined,
      creator: newCreator || undefined,
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

  const filteredMedia = statusFilter
    ? data?.media.filter((m) => m.status === statusFilter)
    : data?.media;

  const previewItem = showPreviewModal
    ? data?.media.find((m) => m.id === showPreviewModal)
    : null;

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
            <li className="dark:text-dark-text text-gray-900">Media</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
              Medien verwalten
            </h1>
            <p className="dark:text-dark-muted mt-2 text-gray-600">
              Lade Bilder und andere Medien hoch
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Neues Medium
          </button>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="dark:text-dark-muted text-sm text-gray-500">
                Gesamt
              </p>
              <p className="dark:text-dark-text text-2xl font-bold text-gray-900">
                {statistics.totalMedia}
              </p>
            </div>
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="dark:text-dark-muted text-sm text-gray-500">
                Bilder
              </p>
              <p className="dark:text-dark-text text-2xl font-bold text-gray-900">
                {statistics.imageCount}
              </p>
            </div>
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="dark:text-dark-muted text-sm text-gray-500">
                Videos
              </p>
              <p className="dark:text-dark-text text-2xl font-bold text-gray-900">
                {statistics.videoCount}
              </p>
            </div>
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="dark:text-dark-muted text-sm text-gray-500">
                Speicher
              </p>
              <p className="dark:text-dark-text text-2xl font-bold text-gray-900">
                {formatFileSize(statistics.totalSize)}
              </p>
            </div>
          </div>
        )}

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

            {/* MIME Type Filter */}
            <select
              value={mimeTypeFilter}
              onChange={(e) => {
                setMimeTypeFilter(e.target.value);
                setPage(1);
              }}
              className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
            >
              <option value="">Alle Typen</option>
              <option value="image">Bilder</option>
              <option value="video">Videos</option>
              <option value="audio">Audio</option>
              <option value="application/pdf">PDF</option>
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

        {/* Media Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
          </div>
        ) : !filteredMedia?.length ? (
          <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="dark:text-dark-muted mt-4 text-gray-500">
              Keine Medien gefunden
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredMedia.map((media) => (
              <div
                key={media.id}
                className="dark:bg-dark-surface dark:border-dark-border group relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Preview */}
                <div
                  className="relative aspect-square cursor-pointer overflow-hidden bg-gray-100 dark:bg-gray-800"
                  onClick={() => setShowPreviewModal(media.id)}
                >
                  {media.mimeType.startsWith("image/") ? (
                    <Image
                      src={media.url}
                      alt={media.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl">
                      {getMimeTypeIcon(media.mimeType)}
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-2 left-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[media.status]}`}
                    >
                      {statusLabels[media.status]}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p
                    className="dark:text-dark-text truncate text-sm font-medium text-gray-900"
                    title={media.name}
                  >
                    {media.name}
                  </p>
                  <p className="dark:text-dark-muted text-xs text-gray-500">
                    {getMimeTypeLabel(media.mimeType)}
                    {media.size && ` • ${formatFileSize(media.size)}`}
                  </p>
                </div>

                {/* Actions Overlay: always visible on touch/mobile, hover on desktop */}
                <div className="absolute right-2 bottom-14 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                  {/* Edit button for reviewers */}
                  {isReviewer && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(media);
                      }}
                      variant="secondary"
                      size="icon"
                      className="bg-gray-600 hover:bg-gray-700"
                      title="Bearbeiten"
                    >
                      <EditIcon className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Approve button for reviewers */}
                  {isReviewer && media.status === ContentStatus.PENDING && (
                    <Button
                      onClick={() =>
                        reviewMutation.mutate({
                          id: media.id,
                          status: ContentStatus.APPROVED,
                        })
                      }
                      disabled={reviewMutation.isPending}
                      variant="success"
                      size="icon"
                      title="Freigeben"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Delete button */}
                  {canDelete && (
                    <Button
                      onClick={() => setShowDeleteModal(media.id)}
                      variant="danger"
                      size="icon"
                      title="Löschen"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="dark:text-dark-muted text-sm text-gray-600">
              Seite {page} von {data.pages} ({data.total} Medien)
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
                size="sm"
              >
                Zurück
              </Button>
              <Button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                variant="outline"
                size="sm"
              >
                Weiter
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="dark:bg-dark-surface w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="dark:text-dark-text mb-4 text-xl font-semibold text-gray-900">
              Neues Medium
            </h2>

            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <Label>Datei</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  accept="image/*,video/*,audio/*,application/pdf"
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2"
                />
                {isUploading && (
                  <p className="mt-1 text-sm text-gray-500">Lädt hoch...</p>
                )}
                {uploadedFile && (
                  <div className="mt-2">
                    <p className="text-sm text-green-600">
                      ✓ Datei hochgeladen
                    </p>
                    {uploadedFile.mimeType.startsWith("image/") && (
                      <div className="relative mt-2 h-32 w-32 overflow-hidden rounded-lg">
                        <Image
                          src={uploadedFile.url}
                          alt="Preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <Label required>Name</Label>
                <Input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              {/* Copyright */}
              <div>
                <Label>Copyright / Urheberrecht</Label>
                <Input
                  type="text"
                  value={newCopyright}
                  onChange={(e) => setNewCopyright(e.target.value)}
                  placeholder="z. B. © 2025 Posaunenwerk"
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary"
                />
              </div>

              {/* Creator / Photographer */}
              <div>
                <Label>Fotograf:in / Urheber:in</Label>
                <Input
                  type="text"
                  value={newCreator}
                  onChange={(e) => setNewCreator(e.target.value)}
                  placeholder="Name des Fotografen oder der Fotografin"
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary"
                />
              </div>

              {uploadError && (
                <p className="text-sm text-red-600">{uploadError}</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                onClick={() => {
                  resetUploadForm();
                  setShowUploadModal(false);
                }}
                variant="outline"
                size="sm"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!uploadedFile || !newName || createMutation.isPending}
                isLoading={createMutation.isPending}
                size="sm"
              >
                Speichern
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowPreviewModal(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {previewItem.mimeType.startsWith("image/") ? (
              <Image
                src={previewItem.url}
                alt={previewItem.name}
                width={1200}
                height={800}
                className="max-h-[80vh] w-auto rounded-lg object-contain"
              />
            ) : previewItem.mimeType.startsWith("video/") ? (
              <video
                src={previewItem.url}
                controls
                className="max-h-[80vh] max-w-full rounded-lg"
              />
            ) : previewItem.mimeType.startsWith("audio/") ? (
              <audio src={previewItem.url} controls className="w-96" />
            ) : (
              <div className="dark:bg-dark-surface rounded-lg bg-white p-8 text-center">
                <span className="text-6xl">
                  {getMimeTypeIcon(previewItem.mimeType)}
                </span>
                <p className="dark:text-dark-text mt-4 text-lg font-medium">
                  {previewItem.name}
                </p>
                <a
                  href={previewItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary mt-2 inline-block hover:underline"
                >
                  Herunterladen
                </a>
              </div>
            )}

            {/* Info */}
            <div className="dark:bg-dark-surface absolute right-0 bottom-0 left-0 rounded-b-lg bg-white/90 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="dark:text-dark-text font-medium text-gray-900">
                    {previewItem.name}
                  </p>
                  <p className="dark:text-dark-muted text-sm text-gray-500">
                    {getMimeTypeLabel(previewItem.mimeType)}
                    {previewItem.size &&
                      ` • ${formatFileSize(previewItem.size)}`}
                    {previewItem.uploadedBy &&
                      ` • ${previewItem.uploadedBy.displayName}`}
                  </p>
                  {(previewItem.copyright || previewItem.creator) && (
                    <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                      {[previewItem.copyright, previewItem.creator]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[previewItem.status]}`}
                >
                  {statusLabels[previewItem.status]}
                </span>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowPreviewModal(null)}
              className="absolute -top-2 -right-2 rounded-full bg-white p-2 shadow-lg hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="dark:bg-dark-surface w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Medium löschen
            </h3>
            <p className="dark:text-dark-muted mb-4 text-gray-600">
              Bist du sicher, dass du dieses Medium löschen möchtest? Diese
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
              Medium bearbeiten
            </h2>

            <div className="space-y-4">
              {/* Preview */}
              {(() => {
                const editItem = data?.media.find(
                  (m) => m.id === showEditModal,
                );
                if (editItem?.mimeType.startsWith("image/")) {
                  return (
                    <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-lg">
                      <Image
                        src={editItem.url}
                        alt={editItem.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  );
                }
                return null;
              })()}

              {/* Name (read-only) */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  disabled
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-muted w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2"
                />
              </div>

              {/* Alt Text */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Alt-Text
                </label>
                <input
                  type="text"
                  value={editAlt}
                  onChange={(e) => setEditAlt(e.target.value)}
                  placeholder="Beschreibung für Screenreader"
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                />
              </div>

              {/* Title */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Titel
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Anzeigetitel"
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                />
              </div>

              {/* Caption */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Bildunterschrift
                </label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  rows={2}
                  placeholder="Optionale Bildunterschrift"
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                />
              </div>

              {/* Copyright */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Copyright / Urheberrecht
                </label>
                <input
                  type="text"
                  value={editCopyright}
                  onChange={(e) => setEditCopyright(e.target.value)}
                  placeholder="z. B. © 2025 Posaunenwerk"
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                />
              </div>

              {/* Creator / Photographer */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Fotograf:in / Urheber:in
                </label>
                <input
                  type="text"
                  value={editCreator}
                  onChange={(e) => setEditCreator(e.target.value)}
                  placeholder="Name des Fotografen oder der Fotografin"
                  className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                />
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
                  placeholder="Kommagetrennte Tags"
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
                  id="editMediaIsPublic"
                  checked={editIsPublic}
                  onChange={(e) => setEditIsPublic(e.target.checked)}
                  className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                />
                <label
                  htmlFor="editMediaIsPublic"
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
                disabled={updateMutation.isPending}
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
