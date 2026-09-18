import { resolve, sep } from "path";

/**
 * Deliberately OUTSIDE public/: Next serves public/ directly, bypassing the auth
 * checks in /api/uploads/[...path]. Docker mounts the volume here (UPLOADS_DIR).
 */
export const UPLOADS_ROOT = process.env.UPLOADS_DIR
  ? resolve(/* turbopackIgnore: true */ process.env.UPLOADS_DIR)
  : resolve(/* turbopackIgnore: true */ process.cwd(), "uploads");

/**
 * Refuses anything that escapes the uploads directory; null for paths that are
 * not managed uploads (e.g. external URLs).
 */
export function resolveUploadFsPath(storedPath: string): string | null {
  if (!storedPath.startsWith("/api/uploads/")) return null;
  const relativePath = storedPath.replace("/api/uploads/", "");
  const fullPath = resolve(
    /* turbopackIgnore: true */ UPLOADS_ROOT,
    relativePath,
  );
  if (!fullPath.startsWith(UPLOADS_ROOT + sep)) return null;
  return fullPath;
}
