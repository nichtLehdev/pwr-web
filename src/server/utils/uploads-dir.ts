import { resolve } from "path";

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
  ? resolve(process.env.UPLOADS_DIR)
  : resolve(process.cwd(), "uploads");
