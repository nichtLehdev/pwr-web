"use client";

import { useState, useRef, useCallback } from "react";
import { api } from "@/trpc/react";
import { DownloadCategory, FileType } from "~/generated/prisma/enums";
import { ArrowUpIcon, CheckIcon, X } from "lucide-react";

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

interface DownloadPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (title: string, url: string, fileType: string) => void;
}

export default function DownloadPickerModal({
  isOpen,
  onClose,
  onSelect,
}: DownloadPickerModalProps) {
  const [activeTab, setActiveTab] = useState<"library" | "create">("library");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DownloadCategory | "">(
    "",
  );
  const [selectedDownload, setSelectedDownload] = useState<{
    id: string;
    title: string;
    fileUrl: string;
    fileType: FileType;
    description: string | null;
  } | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<DownloadCategory>("SONSTIGES");
  const [newFileType, setNewFileType] = useState<FileType>("PDF");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");
  const [uploadedFileSize, setUploadedFileSize] = useState(0);

  const {
    data: downloadsData,
    isLoading,
    refetch,
  } = api.materials.getDownloads.useQuery(
    {
      page: 1,
      limit: 50,
      category: categoryFilter || undefined,
      search: search || undefined,
      includeAll: true,
    },
    { enabled: isOpen },
  );

  const createDownloadMutation = api.materials.createDownload.useMutation({
    onSuccess: async (newDownload) => {
      await refetch();
      setSelectedDownload({
        id: newDownload.id,
        title: newDownload.title,
        fileUrl: newDownload.fileUrl,
        fileType: newDownload.fileType,
        description: newDownload.description,
      });
      setActiveTab("library");
      resetCreateForm();
    },
    onError: (err) => {
      setUploadError(err.message || "Fehler beim Erstellen des Downloads");
    },
  });

  const resetCreateForm = () => {
    setNewTitle("");
    setNewDescription("");
    setNewCategory("SONSTIGES");
    setNewFileType("PDF");
    setUploadedFileUrl("");
    setUploadedFileSize(0);
    setUploadError("");
    setIsUploading(false);
  };

  const processFile = useCallback(
    async (file: File) => {
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
          mimeType: string;
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
        else setNewFileType("PDF");

        if (!newTitle) {
          setNewTitle(file.name.replace(/\.[^/.]+$/, ""));
        }

        setIsUploading(false);
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Upload fehlgeschlagen",
        );
        setIsUploading(false);
      }
    },
    [newTitle],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await processFile(file);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (!file) return;
      await processFile(file);
    },
    [processFile],
  );

  const handleCreateDownload = () => {
    if (!newTitle.trim() || !uploadedFileUrl) {
      setUploadError("Bitte Titel und Datei angeben.");
      return;
    }

    createDownloadMutation.mutate({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      category: newCategory,
      fileUrl: uploadedFileUrl,
      fileType: newFileType,
      fileSize: uploadedFileSize,
      isPublic: true,
    });
  };

  const handleInsert = () => {
    if (selectedDownload) {
      onSelect(
        selectedDownload.title,
        selectedDownload.fileUrl,
        selectedDownload.fileType,
      );
      onClose();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50">
      <div className="dark:bg-dark-surface max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="dark:border-dark-border flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Download einfügen
          </h2>
          <button
            onClick={onClose}
            className="dark:hover:bg-dark-background-secondary rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400"
          >
            <X
              className="h-5 w-5"
            />
          </button>
        </div>

        {/* Tabs */}
        <div className="dark:border-dark-border flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("library")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "library"
                ? "border-primary text-primary border-b-2"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Vorhandene Downloads
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "create"
                ? "border-primary text-primary border-b-2"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Neuen Download erstellen
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {activeTab === "library" ? (
            <div>
              {/* Filters */}
              <div className="mb-4 flex gap-3">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Downloads durchsuchen..."
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(e.target.value as DownloadCategory | "")
                  }
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                >
                  <option value="">Alle Kategorien</option>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Downloads List */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
                </div>
              ) : downloadsData?.downloads.length === 0 ? (
                <div className="py-12 text-center">
                  <X
                    className="mx-auto h-12 w-12 text-gray-400"
                  />
                  <p className="mt-4 text-gray-500 dark:text-gray-400">
                    Keine Downloads gefunden
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {downloadsData?.downloads.map((download) => (
                    <button
                      key={download.id}
                      onClick={() =>
                        setSelectedDownload({
                          id: download.id,
                          title: download.title,
                          fileUrl: download.fileUrl,
                          fileType: download.fileType,
                          description: download.description,
                        })
                      }
                      className={`flex w-full items-center gap-4 rounded-lg border-2 p-4 text-left transition-all ${
                        selectedDownload?.id === download.id
                          ? "border-primary bg-primary/5"
                          : "dark:bg-dark-background-secondary dark:hover:border-dark-border border-transparent bg-gray-50 hover:border-gray-200"
                      }`}
                    >
                      <span className="text-2xl">
                        {fileTypeIcons[download.fileType]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="dark:text-dark-text truncate font-medium text-gray-900">
                          {download.title}
                        </p>
                        {download.description && (
                          <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                            {download.description}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                          <span>{fileTypeLabels[download.fileType]}</span>
                          <span>•</span>
                          <span>{categoryLabels[download.category]}</span>
                          {download.fileSize && (
                            <>
                              <span>•</span>
                              <span>{formatFileSize(download.fileSize)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {selectedDownload?.id === download.id && (
                        <div className="bg-primary rounded-full p-1">
                          <CheckIcon
                            className="h-4 w-4 text-white"
                          />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                  Datei hochladen *
                </label>
                {uploadedFileUrl ? (
                  <div className="dark:border-dark-border dark:bg-dark-background-secondary flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <span className="text-2xl">
                      {fileTypeIcons[newFileType]}
                    </span>
                    <div className="flex-1">
                      <p className="dark:text-dark-text font-medium text-gray-900">
                        Datei hochgeladen
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(uploadedFileSize)} •{" "}
                        {fileTypeLabels[newFileType]}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setUploadedFileUrl("");
                        setUploadedFileSize(0);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X
                        className="h-5 w-5"
                      />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() =>
                      !isUploading && fileInputRef.current?.click()
                    }
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                      isDragging
                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                        : isUploading
                          ? "dark:border-dark-border cursor-not-allowed border-gray-300 opacity-50"
                          : "dark:border-dark-border hover:border-primary dark:hover:bg-dark-background-secondary border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {isUploading ? (
                      <div>
                        <div className="border-t-primary mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-gray-300" />
                        <p className="text-gray-600 dark:text-gray-400">
                          Wird hochgeladen...
                        </p>
                      </div>
                    ) : isDragging ? (
                      <>
                        <ArrowUpIcon
                          className="text-primary mx-auto h-10 w-10"
                        />
                        <p className="text-primary mt-2 font-medium">
                          Datei hier ablegen
                        </p>
                      </>
                    ) : (
                      <>
                        <ArrowUpIcon
                          className="mx-auto h-10 w-10 text-gray-400"
                        />
                        <p className="dark:text-dark-text mt-2 font-medium text-gray-700">
                          Datei hierher ziehen oder klicken
                        </p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          PDF, Word, Excel, ZIP, Audio und mehr bis zu 50MB
                        </p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                />
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
                  placeholder="z.B. Anmeldeformular Landesposaunentag 2025"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Beschreibung (optional)
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Kurze Beschreibung des Downloads..."
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                />
              </div>

              {/* Category and File Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Kategorie
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as DownloadCategory)
                    }
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                  >
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Dateityp
                  </label>
                  <select
                    value={newFileType}
                    onChange={(e) => setNewFileType(e.target.value as FileType)}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                  >
                    {Object.entries(fileTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Error Message */}
              {uploadError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {uploadError}
                </div>
              )}

              {/* Create Button */}
              <button
                onClick={handleCreateDownload}
                disabled={
                  !newTitle.trim() ||
                  !uploadedFileUrl ||
                  createDownloadMutation.isPending
                }
                className="bg-primary hover:bg-primary/90 w-full rounded-lg px-4 py-3 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createDownloadMutation.isPending
                  ? "Wird erstellt..."
                  : "Download erstellen"}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="dark:border-dark-border flex items-center justify-between border-t border-gray-200 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedDownload && activeTab === "library" && (
              <span>Ausgewählt: {selectedDownload.title}</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-background-secondary rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              Abbrechen
            </button>
            {activeTab === "library" && (
              <button
                onClick={handleInsert}
                disabled={!selectedDownload}
                className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                Download einfügen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
