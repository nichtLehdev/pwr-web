"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/app/_components/ui/toast";
import { downloadFileName, downloadUrl, type MediaItem } from "./media-shared";

type DownloadableMedia = Pick<MediaItem, "url" | "name" | "extension">;

/** Einen Blob im Browser als Datei speichern. */
function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

/**
 * Damit in einem ZIP nicht zwei Einträge „Probe.jpg“ heißen und einander
 * überschreiben — Medien dürfen denselben Namen tragen, Dateien im Archiv nicht.
 */
function uniqueName(taken: Set<string>, wanted: string): string {
  if (!taken.has(wanted)) {
    taken.add(wanted);
    return wanted;
  }
  const dot = wanted.lastIndexOf(".");
  const base = dot > 0 ? wanted.slice(0, dot) : wanted;
  const extension = dot > 0 ? wanted.slice(dot) : "";
  let counter = 2;
  while (taken.has(`${base} (${counter})${extension}`)) counter += 1;
  const name = `${base} (${counter})${extension}`;
  taken.add(name);
  return name;
}

/**
 * Herunterladen einzelner Medien und ganzer Auswahlen.
 *
 * Eine Datei geht direkt über die Upload-Route — kein Umweg über den
 * Arbeitsspeicher. Mehrere werden im Browser zu einem ZIP gepackt: JSZip liegt
 * ohnehin im Bündel (Social-Media-Export), und der Server muss so nicht 200
 * Bilder gleichzeitig im RAM halten.
 */
export function useMediaDownload() {
  const toast = useToast();
  const [isBundling, setIsBundling] = useState(false);
  const [bundleProgress, setBundleProgress] = useState(0);

  const downloadOne = useCallback((item: DownloadableMedia) => {
    const anchor = document.createElement("a");
    anchor.href = downloadUrl(item);
    anchor.download = downloadFileName(item);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, []);

  const downloadMany = useCallback(
    async (items: DownloadableMedia[], zipName = "medien") => {
      if (items.length === 0) return;
      if (items.length === 1) {
        downloadOne(items[0]!);
        return;
      }

      setIsBundling(true);
      setBundleProgress(0);
      try {
        // Erst beim Klick geladen: JSZip ist ~100 kB, die niemand mitschleppen
        // soll, der die Seite nur anschaut.
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        const taken = new Set<string>();
        const failed: string[] = [];

        for (const [index, item] of items.entries()) {
          try {
            const response = await fetch(downloadUrl(item));
            if (!response.ok) throw new Error(String(response.status));
            zip.file(
              uniqueName(taken, downloadFileName(item)),
              await response.blob(),
            );
          } catch {
            failed.push(item.name);
          }
          setBundleProgress(Math.round(((index + 1) / items.length) * 100));
        }

        if (taken.size === 0) {
          toast.error("Keine der ausgewählten Dateien konnte geladen werden.");
          return;
        }

        const blob = await zip.generateAsync({ type: "blob" });
        saveBlob(blob, `${zipName}.zip`);

        if (failed.length > 0) {
          toast.warning(
            `${taken.size} von ${items.length} Dateien heruntergeladen. Nicht gefunden: ${failed
              .slice(0, 3)
              .join(", ")}${failed.length > 3 ? " …" : ""}`,
          );
        } else {
          toast.success(`${taken.size} Dateien als ZIP heruntergeladen`);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Download fehlgeschlagen",
        );
      } finally {
        setIsBundling(false);
        setBundleProgress(0);
      }
    },
    [downloadOne, toast],
  );

  return { downloadOne, downloadMany, isBundling, bundleProgress };
}
