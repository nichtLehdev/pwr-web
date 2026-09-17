"use client";
import { Button, Input, Label, Select, Textarea } from "@/app/_components/ui";
import { cn } from "@/lib/utils";

import { useState, useRef, useCallback } from "react";
import { api } from "@/trpc/react";
import { DownloadCategory, FileType } from "~/generated/prisma/enums";
import { ArrowUpIcon, CheckIcon, X } from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalHeader,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";

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

/** Register-Reihe wie im Medien-Picker: Unterstreichung in Tinte statt Orange. */
function tabClass(active: boolean) {
  return cn(
    "semi-condensed border-b-2 px-6 py-3 text-sm font-semibold transition-colors",
    active
      ? "border-ink text-ink dark:border-night-text dark:text-night-text"
      : "text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text border-transparent",
  );
}

interface DownloadPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    title: string,
    url: string,
    fileType: string,
    downloadId?: string,
  ) => void;
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
        selectedDownload.id,
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
    <ScrollableModal zIndex="z-100">
      <ScrollableModalCard maxW="4xl" className="overflow-hidden">
        <ScrollableModalHeader className="border-rule dark:border-night-rule border-b pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-ink dark:text-night-text text-xl font-semibold">
              Download einfügen
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              className="text-dark hover:bg-rule/60 hover:text-ink dark:text-night-muted dark:hover:bg-night-rule dark:hover:text-night-text p-2 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </ScrollableModalHeader>

        {/* Tabs */}
        <div className="border-rule dark:border-night-rule flex border-b">
          <button
            type="button"
            onClick={() => setActiveTab("library")}
            className={tabClass(activeTab === "library")}
          >
            Vorhandene Downloads
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={tabClass(activeTab === "create")}
          >
            Neuen Download erstellen
          </button>
        </div>

        <ScrollableModalBody className="min-h-0 p-4">
          {activeTab === "library" ? (
            <div>
              {/* Filters */}
              <div className="mb-4 flex flex-wrap gap-3">
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Downloads durchsuchen…"
                  aria-label="Downloads durchsuchen"
                  className="min-w-[200px] flex-1"
                />
                <Select
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(e.target.value as DownloadCategory | "")
                  }
                  aria-label="Nach Kategorie filtern"
                  className="sm:w-56"
                >
                  <option value="">Alle Kategorien</option>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Downloads List */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
                </div>
              ) : downloadsData?.downloads.length === 0 ? (
                <div className="py-12 text-center">
                  <X className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
                  <p className="text-dark dark:text-night-muted mt-4">
                    Keine Downloads gefunden
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {downloadsData?.downloads.map((download) => (
                    <button
                      key={download.id}
                      type="button"
                      onClick={() =>
                        setSelectedDownload({
                          id: download.id,
                          title: download.title,
                          fileUrl: download.fileUrl,
                          fileType: download.fileType,
                          description: download.description,
                        })
                      }
                      className={cn(
                        "bg-rule/25 dark:bg-night-raised flex w-full items-center gap-4 border-2 p-4 text-left transition-colors",
                        selectedDownload?.id === download.id
                          ? "border-ink dark:border-night-text"
                          : "hover:border-ink dark:hover:border-night-text border-transparent",
                      )}
                    >
                      <span className="text-2xl">
                        {fileTypeIcons[download.fileType]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-ink dark:text-night-text truncate font-medium">
                          {download.title}
                        </p>
                        {download.description && (
                          <p className="text-dark dark:text-night-muted truncate text-sm">
                            {download.description}
                          </p>
                        )}
                        <div className="text-dark dark:text-night-muted mt-1 flex items-center gap-2 text-xs">
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
                        <div className="bg-ink dark:bg-night-text p-1">
                          <CheckIcon className="text-paper dark:text-night h-4 w-4" />
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
                <Label required>Datei hochladen</Label>
                {uploadedFileUrl ? (
                  <div className="border-rule dark:border-night-rule bg-rule/25 dark:bg-night-raised flex items-center gap-3 border p-4">
                    <span className="text-2xl">
                      {fileTypeIcons[newFileType]}
                    </span>
                    <div className="flex-1">
                      <p className="text-ink dark:text-night-text font-medium">
                        Datei hochgeladen
                      </p>
                      <p className="text-dark dark:text-night-muted text-sm">
                        {formatFileSize(uploadedFileSize)} •{" "}
                        {fileTypeLabels[newFileType]}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFileUrl("");
                        setUploadedFileSize(0);
                      }}
                      aria-label="Datei entfernen"
                      className="text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <X className="h-5 w-5" />
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
                    className={cn(
                      "cursor-pointer border-2 border-dashed p-8 text-center transition-colors",
                      isDragging
                        ? "border-ink bg-rule/25 dark:border-night-text dark:bg-night-raised"
                        : isUploading
                          ? "border-rule dark:border-night-rule cursor-not-allowed opacity-50"
                          : "border-rule dark:border-night-rule hover:border-ink dark:hover:border-night-text",
                    )}
                  >
                    {isUploading ? (
                      <div>
                        <div className="border-rule dark:border-night-rule border-t-ink dark:border-t-night-text mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4" />
                        <p className="text-dark dark:text-night-muted">
                          Wird hochgeladen...
                        </p>
                      </div>
                    ) : isDragging ? (
                      <>
                        <ArrowUpIcon className="text-ink dark:text-night-text mx-auto h-10 w-10" />
                        <p className="text-ink dark:text-night-text mt-2 font-medium">
                          Datei hier ablegen
                        </p>
                      </>
                    ) : (
                      <>
                        <ArrowUpIcon className="text-dark dark:text-night-muted mx-auto h-10 w-10" />
                        <p className="text-ink dark:text-night-text mt-2 font-medium">
                          Datei hierher ziehen oder klicken
                        </p>
                        <p className="text-dark dark:text-night-muted mt-1 text-sm">
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
                <Label htmlFor="downloadPickerTitle" required>
                  Titel
                </Label>
                <Input
                  id="downloadPickerTitle"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="z.B. Anmeldeformular Landesposaunentag 2025"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="downloadPickerDescription">
                  Beschreibung (optional)
                </Label>
                <Textarea
                  id="downloadPickerDescription"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Kurze Beschreibung des Downloads..."
                />
              </div>

              {/* Category and File Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="downloadPickerCategory">Kategorie</Label>
                  <Select
                    id="downloadPickerCategory"
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
                <div>
                  <Label htmlFor="downloadPickerFileType">Dateityp</Label>
                  <Select
                    id="downloadPickerFileType"
                    value={newFileType}
                    onChange={(e) => setNewFileType(e.target.value as FileType)}
                  >
                    {Object.entries(fileTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Error Message */}
              {uploadError && (
                <div className="border border-red-700 p-3 text-sm text-red-700 dark:border-red-400 dark:text-red-400">
                  {uploadError}
                </div>
              )}

              {/* Create Button */}
              <Button
                type="button"
                onClick={handleCreateDownload}
                disabled={
                  !newTitle.trim() ||
                  !uploadedFileUrl ||
                  createDownloadMutation.isPending
                }
                isLoading={createDownloadMutation.isPending}
                className="w-full"
              >
                Download erstellen
              </Button>
            </div>
          )}
        </ScrollableModalBody>

        <ScrollableModalFooter className="flex items-center justify-between">
          <div className="text-dark dark:text-night-muted text-sm">
            {selectedDownload && activeTab === "library" && (
              <span>Ausgewählt: {selectedDownload.title}</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            {activeTab === "library" && (
              <Button
                type="button"
                onClick={handleInsert}
                disabled={!selectedDownload}
              >
                Download einfügen
              </Button>
            )}
          </div>
        </ScrollableModalFooter>
      </ScrollableModalCard>
    </ScrollableModal>
  );
}
