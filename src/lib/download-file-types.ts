import { FileType } from "~/generated/prisma/enums";

/**
 * Download-Dateitypen an einer Stelle: von Upload-Route, Verwaltung,
 * Download-Picker und öffentlichen Listen gelesen.
 */

/** Bilder, die als Download taugen — vor allem Flyer an Terminen. Kein GIF. */
export const DOWNLOAD_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const DOWNLOAD_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  ...DOWNLOAD_IMAGE_MIME_TYPES,
] as const;

/** Wert für `accept` am Datei-Feld. */
export const DOWNLOAD_UPLOAD_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.zip,.mp3,.wav,.ogg,.jpg,.jpeg,.png,.webp";

export const DOWNLOAD_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

export const DOWNLOAD_UPLOAD_MAX_LABEL = "50 MB";

/** Für Hinweise am Upload-Feld. */
export const DOWNLOAD_UPLOAD_FORMATS_LABEL =
  "PDF, Word, Excel, ZIP, Audio oder Bild (JPG, PNG, WebP)";

export const DOWNLOAD_FILE_TYPE_LABELS: Record<FileType, string> = {
  PDF: "PDF",
  DOCX: "Word",
  XLSX: "Excel",
  ZIP: "ZIP",
  MP3: "Audio",
  IMAGE: "Bild",
};

export const DOWNLOAD_FILE_TYPE_ICONS: Record<FileType, string> = {
  PDF: "📄",
  DOCX: "📝",
  XLSX: "📊",
  ZIP: "📦",
  MP3: "🎵",
  IMAGE: "🖼️",
};

const FILE_TYPE_BY_EXTENSION: Record<string, FileType> = {
  pdf: FileType.PDF,
  doc: FileType.DOCX,
  docx: FileType.DOCX,
  xls: FileType.XLSX,
  xlsx: FileType.XLSX,
  zip: FileType.ZIP,
  mp3: FileType.MP3,
  wav: FileType.MP3,
  ogg: FileType.MP3,
  jpg: FileType.IMAGE,
  jpeg: FileType.IMAGE,
  png: FileType.IMAGE,
  webp: FileType.IMAGE,
};

/** `null` für Endungen, die kein Download sein dürfen — nicht still „PDF“ annehmen. */
export function downloadFileTypeForExtension(
  extension: string,
): FileType | null {
  const key = extension.trim().replace(/^\./, "").toLowerCase();
  return Object.hasOwn(FILE_TYPE_BY_EXTENSION, key)
    ? FILE_TYPE_BY_EXTENSION[key]!
    : null;
}

/** Endung des letzten Pfadstücks, ohne Query und Fragment, kleingeschrieben. */
function urlExtension(url: string): string {
  const path = url.split(/[?#]/)[0] ?? "";
  const lastSegment = path.split("/").pop() ?? "";
  return lastSegment.includes(".")
    ? (lastSegment.split(".").pop() ?? "").toLowerCase()
    : "";
}

const IMAGE_FORMAT_CODES: Record<string, string> = {
  jpg: "JPG",
  jpeg: "JPG",
  png: "PNG",
  webp: "WebP",
};

interface DownloadFileRef {
  fileType: FileType;
  fileUrl: string;
}

/**
 * Nur eigene Uploads mit Bildendung: `next/image` hat keine `remotePatterns`, ein
 * fremder Host ließe die ganze Seite abstürzen. Die Endung fängt falsche Typen ab.
 */
export function isPreviewableImageDownload(download: DownloadFileRef): boolean {
  return (
    download.fileType === FileType.IMAGE &&
    download.fileUrl.startsWith("/api/uploads/") &&
    Object.hasOwn(IMAGE_FORMAT_CODES, urlExtension(download.fileUrl))
  );
}

/** Format-Etikett wie „PDF“ oder „PNG“; bei Bildern aus der Endung, sonst „Bild“. */
export function downloadFormatCode(download: DownloadFileRef): string {
  if (download.fileType === FileType.IMAGE) {
    const extension = urlExtension(download.fileUrl);
    return Object.hasOwn(IMAGE_FORMAT_CODES, extension)
      ? IMAGE_FORMAT_CODES[extension]!
      : "Bild";
  }
  return download.fileType;
}

/**
 * `?download=1` erzwingt `Content-Disposition: attachment` (Bilder kämen sonst
 * inline), `name` setzt den Dateinamen; die Route hängt die Endung an.
 */
export function downloadAttachmentUrl(download: {
  fileUrl: string;
  title: string;
}): string {
  if (!download.fileUrl.startsWith("/api/uploads/")) return download.fileUrl;
  const params = new URLSearchParams({ download: "1", name: download.title });
  return `${download.fileUrl}?${params.toString()}`;
}
