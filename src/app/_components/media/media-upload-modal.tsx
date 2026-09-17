"use client";

import { useCallback, useRef, useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import { Button, Input, Label } from "@/app/_components/ui";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalHeader,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import { ArrowUpIcon, CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import {
  MEDIA_UPLOAD_ACCEPT,
  MEDIA_UPLOAD_EXTENSIONS_LABEL,
  MEDIA_UPLOAD_MAX_BYTES,
  MEDIA_UPLOAD_MAX_LABEL,
  isAllowedMediaUpload,
} from "@/lib/media-upload";
import { formatFileSize } from "./media-shared";

type UploadedFile = {
  url: string;
  path: string;
  filename: string;
  size: number;
  mimeType: string;
  extension: string;
  width?: number;
  height?: number;
};

/**
 * Eine Datei in der Warteschlange. `name` ist bearbeitbar, weil er später der
 * Medienname ist — der Dateiname aus der Kamera ("AG5Y9644.JPG") sagt niemandem
 * etwas.
 */
type QueueEntry = {
  id: string;
  name: string;
  previewUrl: string;
  state: "uploading" | "ready" | "error" | "saved";
  error?: string;
  uploaded?: UploadedFile;
};

export function MediaUploadModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const utils = api.useUtils();

  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [copyright, setCopyright] = useState("");
  const [creator, setCreator] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMutation = api.media.create.useMutation();

  const patch = useCallback((id: string, changes: Partial<QueueEntry>) => {
    setQueue((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, ...changes } : entry,
      ),
    );
  }, []);

  const uploadFile = useCallback(
    async (file: File, id: string) => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "media");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json()) as UploadedFile & {
          error?: string;
        };

        if (!response.ok) {
          // Die Route sagt genau, was nicht stimmt (Typ, Größe, Inhalt) —
          // diese Meldung war bisher verloren und wurde zu einem pauschalen
          // „Upload fehlgeschlagen“.
          throw new Error(payload.error ?? "Upload fehlgeschlagen");
        }

        patch(id, { state: "ready", uploaded: payload });
      } catch (error) {
        patch(id, {
          state: "error",
          error:
            error instanceof Error ? error.message : "Upload fehlgeschlagen",
        });
      }
    },
    [patch],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const accepted: { file: File; entry: QueueEntry }[] = [];

      for (const file of files) {
        const id = `${file.name}-${file.size}-${crypto.randomUUID()}`;
        const base: QueueEntry = {
          id,
          name: file.name.replace(/\.[^/.]+$/, ""),
          previewUrl: URL.createObjectURL(file),
          state: "uploading",
        };

        if (!isAllowedMediaUpload(file.type)) {
          accepted.push({
            file,
            entry: {
              ...base,
              state: "error",
              error: `Nicht unterstützt (${file.type || "unbekannt"}). Erlaubt: ${MEDIA_UPLOAD_EXTENSIONS_LABEL}.`,
            },
          });
          continue;
        }
        if (file.size > MEDIA_UPLOAD_MAX_BYTES) {
          accepted.push({
            file,
            entry: {
              ...base,
              state: "error",
              error: `Zu groß (${formatFileSize(file.size)}). Maximal ${MEDIA_UPLOAD_MAX_LABEL}.`,
            },
          });
          continue;
        }
        accepted.push({ file, entry: base });
      }

      setQueue((current) => [
        ...current,
        ...accepted.map((item) => item.entry),
      ]);

      for (const item of accepted) {
        if (item.entry.state === "uploading") {
          void uploadFile(item.file, item.entry.id);
        }
      }
    },
    [uploadFile],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;
      const files = Array.from(event.dataTransfer.files ?? []);
      if (files.length > 0) addFiles(files);
    },
    [addFiles],
  );

  const removeEntry = (id: string) => {
    setQueue((current) => {
      const entry = current.find((item) => item.id === id);
      if (entry) URL.revokeObjectURL(entry.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  };

  const savable = queue.filter(
    (entry) => entry.state === "ready" && entry.name.trim(),
  );

  const handleSaveAll = async () => {
    if (savable.length === 0) return;
    setIsSaving(true);

    let saved = 0;
    // Nacheinander statt parallel: `filename` ist in der Datenbank eindeutig,
    // und gesammelte Fehler lassen sich so der richtigen Zeile zuordnen.
    for (const entry of savable) {
      try {
        await createMutation.mutateAsync({
          name: entry.name.trim(),
          filename: entry.uploaded!.filename,
          url: entry.uploaded!.url,
          path: entry.uploaded!.path,
          mimeType: entry.uploaded!.mimeType,
          size: entry.uploaded!.size,
          extension: entry.uploaded!.extension,
          width: entry.uploaded!.width,
          height: entry.uploaded!.height,
          copyright: copyright.trim() || undefined,
          creator: creator.trim() || undefined,
        });
        patch(entry.id, { state: "saved" });
        saved += 1;
      } catch (error) {
        patch(entry.id, {
          state: "error",
          error:
            error instanceof Error ? error.message : "Speichern fehlgeschlagen",
        });
      }
    }

    setIsSaving(false);
    void utils.media.getAll.invalidate();
    void utils.media.getStatistics.invalidate();

    if (saved > 0) {
      toast.success(
        saved === 1 ? "Medium hochgeladen" : `${saved} Medien hochgeladen`,
      );
    }
    // Nur schließen, wenn nichts mehr offen ist — sonst verschwände die
    // Fehlermeldung zu den Dateien, die es nicht geschafft haben.
    if (saved === savable.length) onClose();
  };

  const pendingUploads = queue.some((entry) => entry.state === "uploading");

  return (
    <ScrollableModal onClose={isSaving ? undefined : onClose}>
      <ScrollableModalCard maxW="2xl">
        <ScrollableModalHeader>
          <h2 className="text-ink dark:text-night-text text-xl font-semibold">
            Medien hochladen
          </h2>
        </ScrollableModalHeader>

        <ScrollableModalBody className="space-y-4">
          <div
            onDragEnter={(event) => {
              event.preventDefault();
              dragCounterRef.current += 1;
              if (event.dataTransfer.types.includes("Files"))
                setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              dragCounterRef.current -= 1;
              if (dragCounterRef.current === 0) setIsDragging(false);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={handleDrop}
            className={`border-2 border-dashed p-6 text-center transition-colors ${
              isDragging
                ? "border-ink bg-rule/25 dark:border-night-text dark:bg-night-raised"
                : "border-rule dark:border-night-rule"
            }`}
          >
            <ArrowUpIcon className="text-dark dark:text-night-muted mx-auto h-8 w-8" />
            <p className="text-ink dark:text-night-text mt-2 text-sm font-medium">
              Dateien hierher ziehen
            </p>
            <p className="text-dark dark:text-night-muted mt-1 text-xs">
              {MEDIA_UPLOAD_EXTENSIONS_LABEL}, bis {MEDIA_UPLOAD_MAX_LABEL} je
              Datei
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => fileInputRef.current?.click()}
            >
              Dateien auswählen
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={MEDIA_UPLOAD_ACCEPT}
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                if (files.length > 0) addFiles(files);
                event.target.value = "";
              }}
            />
          </div>

          {queue.length > 0 && (
            <ul className="space-y-2">
              {queue.map((entry) => (
                <li
                  key={entry.id}
                  className="border-rule dark:border-night-rule flex items-center gap-3 border p-2"
                >
                  <div className="bg-rule/25 dark:bg-night-raised relative h-12 w-12 shrink-0 overflow-hidden">
                    {/* Lokale Vorschau aus dem Blob — next/image kann object
                        URLs nicht optimieren, hier also bewusst ein <img>. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <Input
                      value={entry.name}
                      onChange={(event) =>
                        patch(entry.id, { name: event.target.value })
                      }
                      disabled={entry.state === "saved"}
                      aria-label="Name des Mediums"
                      className="py-1 text-sm"
                    />
                    {entry.error && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {entry.error}
                      </p>
                    )}
                  </div>

                  <div className="flex w-8 shrink-0 justify-center">
                    {entry.state === "uploading" && (
                      <Loader2Icon className="text-dark dark:text-night-muted h-4 w-4 animate-spin" />
                    )}
                    {entry.state === "saved" && (
                      <CheckIcon className="h-4 w-4 text-green-700 dark:text-green-400" />
                    )}
                    {(entry.state === "ready" || entry.state === "error") && (
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        title="Entfernen"
                        className="text-dark hover:bg-rule/60 hover:text-ink dark:text-night-muted dark:hover:bg-night-rule dark:hover:text-night-text p-1"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {queue.length > 0 && (
            <div className="border-rule dark:border-night-rule grid gap-4 border-t pt-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="uploadCopyright">Copyright</Label>
                <Input
                  id="uploadCopyright"
                  value={copyright}
                  onChange={(event) => setCopyright(event.target.value)}
                  placeholder="z. B. © 2025 Posaunenwerk"
                />
              </div>
              <div>
                <Label htmlFor="uploadCreator">Fotograf:in</Label>
                <Input
                  id="uploadCreator"
                  value={creator}
                  onChange={(event) => setCreator(event.target.value)}
                  placeholder="Name der Urheberin"
                />
              </div>
              <p className="text-dark dark:text-night-muted text-xs sm:col-span-2">
                Gilt für alle Dateien in dieser Liste; einzeln anpassen lässt es
                sich danach über „Bearbeiten“.
              </p>
            </div>
          )}
        </ScrollableModalBody>

        <ScrollableModalFooter>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              Abbrechen
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSaveAll()}
              disabled={savable.length === 0 || pendingUploads || isSaving}
              isLoading={isSaving}
            >
              {savable.length > 1
                ? `${savable.length} Medien speichern`
                : "Speichern"}
            </Button>
          </div>
        </ScrollableModalFooter>
      </ScrollableModalCard>
    </ScrollableModal>
  );
}
