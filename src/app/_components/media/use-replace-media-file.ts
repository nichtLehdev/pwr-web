"use client";

import { useCallback, useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";

type UploadResponse = {
  url: string;
  path: string;
  filename: string;
  size: number;
  mimeType: string;
  extension: string;
  error?: string;
};

/**
 * Zugeschnittenes Bild hochladen und die alte Datei ersetzen.
 *
 * Als Hook, weil der Zuschnitt an zwei Stellen angeboten wird: als eigene
 * Aktion an der Kachel und innerhalb des Bearbeiten-Dialogs. Der Server setzt
 * dabei den Fokuspunkt zurück — er zeigte auf einen Ausschnitt, den es nach dem
 * Zuschneiden nicht mehr gibt. `onReplaced` gibt dem Aufrufer die Gelegenheit,
 * ein offenes Formular nachzuziehen.
 */
export function useReplaceMediaFile(onReplaced?: () => void) {
  const toast = useToast();
  const utils = api.useUtils();
  const [isUploading, setIsUploading] = useState(false);

  const replaceFileMutation = api.media.replaceFile.useMutation({
    onSuccess: () => {
      void utils.media.getAll.invalidate();
      toast.success("Bild wurde zugeschnitten und ersetzt");
      onReplaced?.();
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setIsUploading(false),
  });

  const replace = useCallback(
    async (
      id: string,
      blob: Blob,
      suggestedFilename: string,
      width: number,
      height: number,
    ) => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", blob, suggestedFilename);
        formData.append("folder", "media");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json()) as UploadResponse;
        if (!response.ok) {
          throw new Error(payload.error ?? "Upload fehlgeschlagen");
        }

        replaceFileMutation.mutate({
          id,
          url: payload.url,
          path: payload.path,
          filename: payload.filename,
          size: payload.size,
          mimeType: payload.mimeType,
          extension: payload.extension,
          width,
          height,
        });
      } catch (error) {
        setIsUploading(false);
        toast.error(
          error instanceof Error ? error.message : "Fehler beim Hochladen",
        );
      }
    },
    [replaceFileMutation, toast],
  );

  return { replace, isBusy: isUploading || replaceFileMutation.isPending };
}
