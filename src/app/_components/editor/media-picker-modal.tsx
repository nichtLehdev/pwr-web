"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { api } from "@/trpc/react";

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

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New image metadata
  const [newImageAlt, setNewImageAlt] = useState("");
  const [newImageTitle, setNewImageTitle] = useState("");

  // Fetch media library (includeAll shows approved + user's own pending)
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

  // Create media mutation
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
    },
    onError: (err) => {
      setUploadError(err.message || "Fehler beim Speichern des Bildes");
      setIsUploading(false);
    },
  });

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setUploadError("Bitte wähle eine Bilddatei aus.");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError("Die Datei ist zu groß. Maximal 10MB erlaubt.");
        return;
      }

      setUploadError("");
      setIsUploading(true);
      setUploadProgress(0);

      try {
        // Create form data
        const formData = new FormData();
        formData.append("file", file);

        // Upload to API
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

        setUploadProgress(75);

        // Create media record
        createMediaMutation.mutate({
          name: file.name,
          filename: data.filename,
          url: data.url,
          path: data.path,
          mimeType: data.mimeType,
          size: data.size,
          extension: data.extension,
          width: data.width,
          height: data.height,
          alt: newImageAlt || file.name.replace(/\.[^/.]+$/, ""),
          title: newImageTitle || undefined,
          folder: "posts",
          isPublic: true,
        });
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Upload fehlgeschlagen",
        );
        setIsUploading(false);
      }
    },
    [createMediaMutation, newImageAlt, newImageTitle],
  );

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
            onClick={onClose}
            className="dark:hover:bg-dark-background-secondary rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
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
            Medienbibliothek
          </button>
          <button
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
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">
                    Keine Bilder gefunden
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {mediaData?.media.map((media) => (
                    <button
                      key={media.id}
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
                          <svg
                            className="h-4 w-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8">
              {/* Upload Area */}
              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`dark:border-dark-border cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-12 text-center transition-colors ${
                  isUploading
                    ? "cursor-not-allowed opacity-50"
                    : "hover:border-primary dark:hover:bg-dark-background-secondary hover:bg-gray-50"
                }`}
              >
                {isUploading ? (
                  <div>
                    <div className="border-t-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-300" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Wird hochgeladen... {uploadProgress}%
                    </p>
                  </div>
                ) : (
                  <>
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="dark:text-dark-text mt-4 font-medium text-gray-700">
                      Klicke zum Hochladen
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      PNG, JPG, GIF, WebP bis zu 10MB
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Error Message */}
              {uploadError && (
                <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {uploadError}
                </div>
              )}

              {/* Optional Metadata */}
              <div className="mt-6 space-y-4">
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
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="dark:border-dark-border flex items-center justify-between border-t border-gray-200 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedMedia && <span>Ausgewählt: {selectedMedia.name}</span>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-background-secondary rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              Abbrechen
            </button>
            <button
              onClick={handleInsert}
              disabled={!selectedMedia}
              className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              Bild einfügen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
