/**
 * Was die Medienverwaltung annimmt — einmal notiert, von der Upload-Route und
 * vom Dialog gelesen.
 *
 * Vorher standen die Grenzen doppelt im Code und wichen voneinander ab: das
 * Formular bot Video, Audio und PDF an und ließ 50 MB durch, die Route nahm
 * Bilder bis 10 MB. Alles dazwischen endete in einem nackten
 * „Upload fehlgeschlagen“.
 */
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
