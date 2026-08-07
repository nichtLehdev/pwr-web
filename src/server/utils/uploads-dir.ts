import { resolve, sep } from "path";

/**
 * Root directory for uploaded files.
 *
 * Deliberately OUTSIDE of public/: Next serves public/ straight from the
 * filesystem, which would bypass the authorization checks in
 * /api/uploads/[...path] (private downloads, unapproved media).
 *
 * Docker mounts the uploads volume here; override with UPLOADS_DIR.
 * When migrating an existing setup, move public/uploads to ./uploads (the
 * Docker volume itself keeps its data — only the mount point changes).
 */
export const UPLOADS_ROOT = process.env.UPLOADS_DIR
  ? resolve(/* turbopackIgnore: true */ process.env.UPLOADS_DIR)
  : resolve(/* turbopackIgnore: true */ process.cwd(), "uploads");

/**
 * Resolve a stored `/api/uploads/...` path to its on-disk location, refusing
 * anything that escapes the uploads directory. Returns null for paths that
 * are not managed uploads (e.g. external URLs).
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
