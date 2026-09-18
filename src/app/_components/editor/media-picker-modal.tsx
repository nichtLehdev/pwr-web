"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { api } from "@/trpc/react";
import { ArrowUpIcon, CheckIcon, X } from "lucide-react";
import { CropIcon } from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalHeader,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import ImageCropEditor from "@/app/_components/posts/image-crop-editor";
import { useToast } from "@/app/_components/ui/toast";
import { Button, Input, Label } from "@/app/_components/ui";
import { cn } from "@/lib/utils";

/** Unterstreichung in Tinte statt Orange — Orange markiert hier Zustände, nicht Navigation. */
function tabClass(active: boolean) {
  return cn(
    "semi-condensed border-b-2 px-6 py-3 text-sm font-semibold transition-colors",
    active
      ? "border-ink text-ink dark:border-night-text dark:text-night-text"
      : "text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text border-transparent",
  );
}

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    url: string,
    alt: string,
    mediaId?: string,
    focalPointX?: number | null,
    focalPointY?: number | null,
  ) => void;
}

export default function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
}: MediaPickerModalProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"library" | "upload">("library");
  const [search, setSearch] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<{
    id: string;
    url: string;
    alt: string | null;
    name: string;
    focalPointX?: number | null;
    focalPointY?: number | null;
  } | null>(null);
  const [showRecrop, setShowRecrop] = useState(false);

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
        focalPointX: newMedia.focalPointX ?? undefined,
        focalPointY: newMedia.focalPointY ?? undefined,
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

  const replaceFileMutation = api.media.replaceFile.useMutation({
    onSuccess: (updated) => {
      setShowRecrop(false);
      if (selectedMedia?.id === updated.id) {
        setSelectedMedia({
          id: updated.id,
          url: updated.url,
          alt: updated.alt,
          name: updated.name,
          focalPointX: undefined,
          focalPointY: undefined,
        });
      }
      void refetch();
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
        selectedMedia.focalPointX ?? undefined,
        selectedMedia.focalPointY ?? undefined,
      );
      onClose();
    }
  };

  const handleCropComplete = async (
    blob: Blob,
    suggestedFilename: string,
    width: number,
    height: number,
  ) => {
    if (!selectedMedia) return;
    try {
      const formData = new FormData();
      formData.append("file", blob, suggestedFilename);
      formData.append("folder", "media");
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? "Upload fehlgeschlagen",
        );
      }
      const uploadData = (await res.json()) as {
        url: string;
        path: string;
        filename: string;
        size: number;
        mimeType: string;
        extension: string;
      };
      replaceFileMutation.mutate({
        id: selectedMedia.id,
        url: uploadData.url,
        path: uploadData.path,
        filename: uploadData.filename,
        size: uploadData.size,
        mimeType: uploadData.mimeType,
        extension: uploadData.extension,
        width,
        height,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler beim Hochladen");
    }
  };

  if (!isOpen) return null;

  return (
    <ScrollableModal zIndex="z-100">
      <ScrollableModalCard maxW="4xl" className="overflow-hidden">
        <ScrollableModalHeader className="border-rule dark:border-night-rule border-b pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-ink dark:text-night-text text-xl font-semibold">
              Bild einfügen
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

        <div className="border-rule dark:border-night-rule flex border-b">
          <button
            type="button"
            onClick={() => setActiveTab("library")}
            className={tabClass(activeTab === "library")}
          >
            Medienbibliothek
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={tabClass(activeTab === "upload")}
          >
            Bild hochladen
          </button>
        </div>

        <ScrollableModalBody className="min-h-0 p-4">
          {activeTab === "library" ? (
            <div>
              <div className="mb-4">
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Bilder durchsuchen…"
                  aria-label="Bilder durchsuchen"
                />
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
                </div>
              ) : mediaData?.media.length === 0 ? (
                <div className="py-12 text-center">
                  <X className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
                  <p className="text-dark dark:text-night-muted mt-4">
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
                          focalPointX: media.focalPointX ?? undefined,
                          focalPointY: media.focalPointY ?? undefined,
                        })
                      }
                      className={cn(
                        "group bg-rule/25 dark:bg-night-raised relative aspect-square overflow-hidden border-2 transition-colors",
                        selectedMedia?.id === media.id
                          ? "border-ink dark:border-night-text"
                          : "hover:border-ink dark:hover:border-night-text border-transparent",
                      )}
                    >
                      <Image
                        src={media.url}
                        alt={media.alt || media.name}
                        fill
                        className="object-cover"
                        style={
                          media.focalPointX != null && media.focalPointY != null
                            ? {
                                objectPosition: `${media.focalPointX}% ${media.focalPointY}%`,
                              }
                            : undefined
                        }
                        sizes="(max-width: 768px) 25vw, 150px"
                      />
                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                      {selectedMedia?.id === media.id && (
                        <div className="bg-ink dark:bg-night-text absolute top-2 right-2 p-1">
                          <CheckIcon className="text-paper dark:text-night h-4 w-4" />
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
                  <div className="border-ink dark:border-night-text mb-4 h-12 w-12 animate-spin rounded-full border-b-2" />
                  <p className="text-dark dark:text-night-muted">
                    Wird hochgeladen... {uploadProgress}%
                  </p>
                </div>
              ) : pendingUpload ? (
                /* Preview + metadata form: edit attributes then save */
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="bg-rule/25 dark:bg-night-raised relative h-48 w-48 shrink-0 overflow-hidden">
                      <Image
                        src={pendingUpload.url}
                        alt={newImageAlt || pendingUpload.name}
                        fill
                        className="object-contain"
                        // No media row yet, so the file is session-gated; the
                        // image optimizer fetches without cookies and would 404.
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-4">
                      <p className="text-ink dark:text-night-text text-sm font-medium">
                        {pendingUpload.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-primary-ink dark:text-primary text-sm font-medium underline underline-offset-4"
                      >
                        Anderes Bild wählen
                      </button>
                    </div>
                  </div>

                  <div className="border-rule dark:border-night-rule border-t pt-6">
                    <p className="text-ink dark:text-night-text mb-4 text-sm font-medium">
                      Metadaten (vor dem Speichern bearbeiten)
                    </p>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="mediaPickerAlt">
                          Alt-Text (für Barrierefreiheit)
                        </Label>
                        <Input
                          id="mediaPickerAlt"
                          type="text"
                          value={newImageAlt}
                          onChange={(e) => setNewImageAlt(e.target.value)}
                          placeholder="Beschreibe das Bild…"
                        />
                      </div>
                      <div>
                        <Label htmlFor="mediaPickerTitle">
                          Titel (optional)
                        </Label>
                        <Input
                          id="mediaPickerTitle"
                          type="text"
                          value={newImageTitle}
                          onChange={(e) => setNewImageTitle(e.target.value)}
                          placeholder="Bildtitel…"
                        />
                      </div>
                      <div>
                        <Label htmlFor="mediaPickerCopyright">
                          Copyright / Urheberrecht (optional)
                        </Label>
                        <Input
                          id="mediaPickerCopyright"
                          type="text"
                          value={newImageCopyright}
                          onChange={(e) => setNewImageCopyright(e.target.value)}
                          placeholder="z. B. © 2025 Posaunenwerk"
                        />
                      </div>
                      <div>
                        <Label htmlFor="mediaPickerCreator">
                          Fotograf:in / Urheber:in (optional)
                        </Label>
                        <Input
                          id="mediaPickerCreator"
                          type="text"
                          value={newImageCreator}
                          onChange={(e) => setNewImageCreator(e.target.value)}
                          placeholder="Name des Fotografen oder der Fotografin"
                        />
                      </div>
                    </div>
                  </div>

                  {uploadError && (
                    <div className="border border-red-700 p-3 text-sm text-red-700 dark:border-red-400 dark:text-red-400">
                      {uploadError}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={handleSaveToLibrary}
                      disabled={createMediaMutation.isPending}
                      isLoading={createMediaMutation.isPending}
                    >
                      {createMediaMutation.isPending
                        ? "Wird gespeichert..."
                        : "In Bibliothek speichern"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleChooseOtherImage}
                    >
                      Abbrechen (Zurück)
                    </Button>
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
                    className={`cursor-pointer border-2 border-dashed p-12 text-center transition-colors ${
                      isDragging
                        ? "border-ink bg-rule/25 dark:border-night-text dark:bg-night-raised"
                        : "border-rule dark:border-night-rule hover:border-ink dark:hover:border-night-text"
                    }`}
                  >
                    <ArrowUpIcon className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
                    <p className="text-ink dark:text-night-text mt-4 font-medium">
                      {isDragging
                        ? "Bild hier ablegen"
                        : "Klicke oder ziehe ein Bild hierher"}
                    </p>
                    <p className="text-dark dark:text-night-muted mt-1 text-sm">
                      PNG, JPG, GIF, WebP bis zu 10MB
                    </p>
                  </div>

                  {uploadError && (
                    <div className="mt-4 border border-red-700 p-3 text-sm text-red-700 dark:border-red-400 dark:text-red-400">
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
        </ScrollableModalBody>

        <ScrollableModalFooter className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {activeTab === "library" && selectedMedia && (
              <>
                <span className="text-dark dark:text-night-muted text-sm">
                  Ausgewählt: {selectedMedia.name}
                </span>
                <button
                  type="button"
                  onClick={() => setShowRecrop(true)}
                  className="text-primary-ink dark:text-primary inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
                >
                  <CropIcon className="h-4 w-4" />
                  Bild zuschneiden
                </button>
              </>
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
                disabled={!selectedMedia}
              >
                Bild einfügen
              </Button>
            )}
          </div>
        </ScrollableModalFooter>
      </ScrollableModalCard>

      {showRecrop && selectedMedia && (
        <ImageCropEditor
          imageUrl={selectedMedia.url}
          onCropComplete={handleCropComplete}
          onClose={() => setShowRecrop(false)}
        />
      )}
    </ScrollableModal>
  );
}
