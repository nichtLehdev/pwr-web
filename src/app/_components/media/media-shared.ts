import { ContentStatus } from "~/generated/prisma/enums";
import type { RouterOutputs } from "@/trpc/react";

export type MediaItem = RouterOutputs["media"]["getAll"]["media"][number];

export const statusLabels: Record<ContentStatus, string> = {
  DRAFT: "Entwurf",
  PENDING: "Ausstehend",
  APPROVED: "Freigegeben",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

export const statusColors: Record<ContentStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  PENDING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  ARCHIVED: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

export const STATUS_ORDER: ContentStatus[] = [
  ContentStatus.PENDING,
  ContentStatus.APPROVED,
  ContentStatus.DRAFT,
  ContentStatus.REJECTED,
  ContentStatus.ARCHIVED,
];

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getMimeTypeIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType === "application/pdf") return "📄";
  return "📎";
}

export function getMimeTypeLabel(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "Bild";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType === "application/pdf") return "PDF";
  return "Datei";
}

export function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

/** `object-position` aus dem gespeicherten Fokuspunkt, sonst die Vorgabe. */
export function focalPointStyle(item: {
  focalPointX: number | null;
  focalPointY: number | null;
}): React.CSSProperties | undefined {
  if (item.focalPointX == null || item.focalPointY == null) return undefined;
  return { objectPosition: `${item.focalPointX}% ${item.focalPointY}%` };
}

/**
 * Der Name, unter dem eine Datei im Downloads-Ordner landen soll: der gepflegte
 * Medienname plus die Endung der tatsächlichen Datei.
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
