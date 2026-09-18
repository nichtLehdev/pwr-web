/** Was die Medienverwaltung annimmt — einmal notiert, von Upload-Route und Dialog gelesen. */
export const MEDIA_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/** Wert für `accept` am Datei-Feld. */
export const MEDIA_UPLOAD_ACCEPT = MEDIA_UPLOAD_MIME_TYPES.join(",");

export const MEDIA_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const MEDIA_UPLOAD_MAX_LABEL = "10 MB";

/** Für Fehlermeldungen: „JPG, PNG, WebP oder GIF“. */
export const MEDIA_UPLOAD_EXTENSIONS_LABEL = "JPG, PNG, WebP oder GIF";

export function isAllowedMediaUpload(type: string): boolean {
  return (MEDIA_UPLOAD_MIME_TYPES as readonly string[]).includes(type);
}
