import type { RouterOutputs } from "@/trpc/react";

export type MediaItem = RouterOutputs["media"]["getAll"]["media"][number];

/**
 * Der Name, unter dem eine Datei im Downloads-Ordner landen soll: der gepflegte
 * Medienname plus die Endung der tatsächlichen Datei. Auf der Platte steht der
 * entstellte Speichername ("bild-DFbip-176….jpg"), den niemand wiederfindet.
 */
export function downloadFileName(item: {
  name: string;
  extension: string;
}): string {
  const base = item.name.replace(/\.[^/.]+$/, "").trim() || "download";
  return item.extension ? `${base}.${item.extension}` : base;
}

/**
 * Download-URL. Die Route liefert Bilder sonst zur Anzeige aus; `?download=1`
 * setzt `Content-Disposition: attachment`, `name` den lesbaren Dateinamen.
 */
export function downloadUrl(item: {
  url: string;
  name: string;
  extension: string;
}): string {
  const params = new URLSearchParams({
    download: "1",
    name: downloadFileName(item),
  });
  return `${item.url}?${params.toString()}`;
}
