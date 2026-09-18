import { FileType } from "~/generated/prisma/enums";

/**
 * Was der Upload-Ordner `downloads` annimmt und wie ein Download-Dateityp
 * heißt — einmal notiert, von Upload-Route, Verwaltung, Download-Picker und
 * den öffentlichen Listen gelesen.
 *
 * Vorher standen Beschriftungen und Symbole als eigene Tabellen in fünf
 * Dateien, die Endungserkennung doppelt. Ein neuer Typ (Bilder, #309) hätte an
 * jeder Stelle einzeln nachgezogen werden müssen; die Stelle, die man
 * vergisst, zeigt dann „IMAGE“ oder ein leeres Feld.
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

/**
 * Dateityp zur Endung, die die Upload-Route zurückgibt. `null` für Endungen,
 * die kein Download sein dürfen — der Aufrufer soll dann nicht still „PDF“
 * annehmen.
 */
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
 * Bild-Download, der sich als Vorschau zeigen lässt: Typ `IMAGE` und eine
 * Datei aus dem eigenen Upload-Ordner mit Bildendung.
 *
 * Fremde URLs bleiben bewusst draußen — `next/image` kennt keine
 * `remotePatterns`, ein fremder Host würde die ganze Seite abstürzen lassen
 * statt nur das Bild. Die Endung schützt vor Einträgen, deren Typ von Hand
 * falsch gesetzt wurde: Ein PDF als `<img>` bliebe ein leerer Rahmen.
 */
export function isPreviewableImageDownload(download: DownloadFileRef): boolean {
  return (
    download.fileType === FileType.IMAGE &&
    download.fileUrl.startsWith("/api/uploads/") &&
    Object.hasOwn(IMAGE_FORMAT_CODES, urlExtension(download.fileUrl))
  );
}

/**
 * Kurzes Format-Etikett wie „PDF“ oder „PNG“ — für Dateimeta und den
 * Screenreader-Hinweis am Link. Bei Bildern sagt die Endung mehr als der
 * Sammeltyp; ohne erkennbare Endung steht „Bild“.
 */
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
 * Link, der die Datei herunterlädt statt sie anzuzeigen. Die Upload-Route
 * liefert Bilder sonst inline aus; `?download=1` setzt
 * `Content-Disposition: attachment`, `name` den lesbaren Dateinamen (die
 * Route hängt die echte Endung an). Fremde URLs bleiben unverändert.
 */
export function downloadAttachmentUrl(download: {
  fileUrl: string;
  title: string;
}): string {
  if (!download.fileUrl.startsWith("/api/uploads/")) return download.fileUrl;
  const params = new URLSearchParams({ download: "1", name: download.title });
  return `${download.fileUrl}?${params.toString()}`;
}
