"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { api } from "@/trpc/react";
import { ArrowUpIcon, CheckIcon, X } from "lucide-react";

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, alt: string, mediaId?: string) => void;
}

export default function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
}: MediaPickerModalProps) {
  const [activeTab, setActiveTab] = useState<"library" | "upload">("library");
  const [search, setSearch] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<{
    id: string;
    url: string;
    alt: string | null;
    name: string;
  } | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** After file upload to storage: show preview + form. User edits metadata then clicks "Save". */
  const [pendingUpload, setPendingUpload] = useState<{
    name: string;
    filename: string;
    url: string;
    path: string;
    mimeType: string;
    size: number;
    extension: string;
    width?: number;
    height?: number;
  } | null>(null);

  const [newImageAlt, setNewImageAlt] = useState("");
  const [newImageTitle, setNewImageTitle] = useState("");
  const [newImageCopyright, setNewImageCopyright] = useState("");
  const [newImageCreator, setNewImageCreator] = useState("");

  const {
    data: mediaData,
    isLoading,
    refetch,
  } = api.media.getAll.useQuery(
    {
      page: 1,
      limit: 50,
      mimeType: "image",
      search: search || undefined,
      includeAll: true,
    },
    { enabled: isOpen },
  );

  const createMediaMutation = api.media.create.useMutation({
    onSuccess: async (newMedia) => {
      await refetch();
      setSelectedMedia({
        id: newMedia.id,
        url: newMedia.url,
        alt: newMedia.alt,
        name: newMedia.name,
      });
      setActiveTab("library");
      setIsUploading(false);
      setUploadProgress(0);
      setPendingUpload(null);
      setNewImageAlt("");
      setNewImageTitle("");
      setNewImageCopyright("");
      setNewImageCreator("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => {
      setUploadError(err.message || "Fehler beim Speichern des Bildes");
      setIsUploading(false);
    },
  });

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Bitte wähle eine Bilddatei aus.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Die Datei ist zu groß. Maximal 10MB erlaubt.");
      return;
    }

    setUploadError("");
    setIsUploading(true);
    setUploadProgress(0);
    setPendingUpload(null);

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

      setUploadProgress(50);

      const data = (await response.json()) as {
        url: string;
        filename: string;
        path: string;
        mimeType: string;
        size: number;
        extension: string;
        width?: number;
        height?: number;
      };

      setUploadProgress(100);
      setPendingUpload({
        name: file.name,
        filename: data.filename,
        url: data.url,
        path: data.path,
        mimeType: data.mimeType,
        size: data.size,
        extension: data.extension,
        width: data.width,
        height: data.height,
      });
      setNewImageAlt(file.name.replace(/\.[^/.]+$/, ""));
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Upload fehlgeschlagen",
      );
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void processFile(file);
      e.target.value = "";
    },
    [processFile],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;
      const file = e.dataTransfer.files?.[0];
      if (file) void processFile(file);
    },
    [processFile],
  );

  const handleSaveToLibrary = () => {
    if (!pendingUpload) return;
    setUploadError("");
    setIsUploading(true);
    createMediaMutation.mutate({
      name: pendingUpload.name,
      filename: pendingUpload.filename,
      url: pendingUpload.url,
      path: pendingUpload.path,
      mimeType: pendingUpload.mimeType,
      size: pendingUpload.size,
      extension: pendingUpload.extension,
      width: pendingUpload.width,
      height: pendingUpload.height,
      alt: newImageAlt || pendingUpload.name.replace(/\.[^/.]+$/, ""),
      title: newImageTitle || undefined,
      copyright: newImageCopyright || undefined,
      creator: newImageCreator || undefined,
      folder: "posts",
      isPublic: true,
    });
  };

  const handleChooseOtherImage = () => {
    setPendingUpload(null);
    setUploadError("");
    setNewImageAlt("");
    setNewImageTitle("");
    setNewImageCopyright("");
    setNewImageCreator("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleInsert = () => {
    if (selectedMedia) {
      onSelect(
        selectedMedia.url,
        selectedMedia.alt || selectedMedia.name,
        selectedMedia.id,
      );
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50">
      <div className="dark:bg-dark-surface max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="dark:border-dark-border flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Bild einfügen
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="dark:hover:bg-dark-background-secondary rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="dark:border-dark-border flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab("library")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "library"
                ? "border-primary text-primary border-b-2"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Medienbibliothek
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "upload"
                ? "border-primary text-primary border-b-2"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Bild hochladen
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {activeTab === "library" ? (
            <div>
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Bilder durchsuchen..."
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                />
              </div>

              {/* Media Grid */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
                </div>
              ) : mediaData?.media.length === 0 ? (
                <div className="py-12 text-center">
                  <X className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-4 text-gray-500 dark:text-gray-400">
                    Keine Bilder gefunden
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {mediaData?.media.map((media) => (
                    <button
                      key={media.id}
                      type="button"
                      onClick={() =>
                        setSelectedMedia({
                          id: media.id,
                          url: media.url,
                          alt: media.alt,
                          name: media.name,
                        })
                      }
                      className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                        selectedMedia?.id === media.id
                          ? "border-primary ring-primary ring-2"
                          : "dark:hover:border-dark-border border-transparent hover:border-gray-300"
                      }`}
                    >
                      <Image
                        src={media.url}
                        alt={media.alt || media.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 25vw, 150px"
                      />
                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                      {selectedMedia?.id === media.id && (
                        <div className="bg-primary absolute top-2 right-2 rounded-full p-1">
                          <CheckIcon className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8">
              {isUploading && !pendingUpload ? (
                /* Upload in progress */
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="border-t-primary mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-300" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Wird hochgeladen... {uploadProgress}%
                  </p>
                </div>
              ) : pendingUpload ? (
                /* Preview + metadata form: edit attributes then save */
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                      <Image
                        src={pendingUpload.url}
                        alt={newImageAlt || pendingUpload.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-4">
                      <p className="dark:text-dark-text text-sm font-medium text-gray-700">
                        {pendingUpload.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-primary hover:text-primary/80 text-sm font-medium underline focus:outline-none"
                      >
                        Anderes Bild wählen
                      </button>
                    </div>
                  </div>

                  {/* Metadata – edit before saving to library */}
                  <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                    <p className="dark:text-dark-text mb-4 text-sm font-medium text-gray-700">
                      Metadaten (vor dem Speichern bearbeiten)
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                          Alt-Text (für Barrierefreiheit)
                        </label>
                        <input
                          type="text"
                          value={newImageAlt}
                          onChange={(e) => setNewImageAlt(e.target.value)}
                          placeholder="Beschreibe das Bild..."
                          className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                          Titel (optional)
                        </label>
                        <input
                          type="text"
                          value={newImageTitle}
                          onChange={(e) => setNewImageTitle(e.target.value)}
                          placeholder="Bildtitel..."
                          className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                          Copyright / Urheberrecht (optional)
                        </label>
                        <input
                          type="text"
                          value={newImageCopyright}
                          onChange={(e) => setNewImageCopyright(e.target.value)}
                          placeholder="z. B. © 2025 Posaunenwerk"
                          className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                          Fotograf:in / Urheber:in (optional)
                        </label>
                        <input
                          type="text"
                          value={newImageCreator}
                          onChange={(e) => setNewImageCreator(e.target.value)}
                          placeholder="Name des Fotografen oder der Fotografin"
                          className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-1 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {uploadError && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                      {uploadError}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSaveToLibrary}
                      disabled={createMediaMutation.isPending}
                      className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 font-medium text-white transition-colors disabled:opacity-50"
                    >
                      {createMediaMutation.isPending
                        ? "Wird gespeichert..."
                        : "In Bibliothek speichern"}
                    </button>
                    <button
                      type="button"
                      onClick={handleChooseOtherImage}
                      className="dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-background-secondary rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Abbrechen (Zurück)
                    </button>
                  </div>
                </div>
              ) : (
                /* Drop zone: click or drag & drop */
                <>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`dark:border-dark-border cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
                      isDragging
                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                        : "border-gray-300 hover:border-primary dark:hover:bg-dark-background-secondary hover:bg-gray-50"
                    }`}
                  >
                    <ArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="dark:text-dark-text mt-4 font-medium text-gray-700">
                      {isDragging
                        ? "Bild hier ablegen"
                        : "Klicke oder ziehe ein Bild hierher"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      PNG, JPG, GIF, WebP bis zu 10MB
                    </p>
                  </div>

                  {uploadError && (
                    <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                      {uploadError}
                    </div>
                  )}
                </>
              )}

              {/* Single file input for both drop zone and "Anderes Bild wählen" */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Footer – "Bild einfügen" only on library tab */}
        <div className="dark:border-dark-border flex items-center justify-between border-t border-gray-200 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {activeTab === "library" && selectedMedia && (
              <span>Ausgewählt: {selectedMedia.name}</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-background-secondary rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              Abbrechen
            </button>
            {activeTab === "library" && (
              <button
                type="button"
                onClick={handleInsert}
                disabled={!selectedMedia}
                className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                Bild einfügen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
