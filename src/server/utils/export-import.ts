import { readFile, stat } from "fs/promises";
import { resolve, sep } from "path";
import { resolveUploadFsPath } from "@/server/utils/uploads-dir";
import JSZip from "jszip";
import type { Media } from "~/generated/prisma/client";

/**
 * Collects all unique media files referenced by entities
 * Handles nested structures like events with ensemble.image
 */
export function collectMediaFromEntities(
  entities: Array<{
    coverImage?: Media | null;
    image?: Media | null;
    ensemble?: { image?: Media | null } | null;
    auswahlChor?: { image?: Media | null } | null;
  }>,
): Media[] {
  const mediaMap = new Map<string, Media>();

  for (const entity of entities) {
    if (entity.coverImage) {
      mediaMap.set(entity.coverImage.id, entity.coverImage);
    }
    if (entity.image) {
      mediaMap.set(entity.image.id, entity.image);
    }
    if (entity.ensemble?.image) {
      mediaMap.set(entity.ensemble.image.id, entity.ensemble.image);
    }
    if (entity.auswahlChor?.image) {
      mediaMap.set(entity.auswahlChor.image.id, entity.auswahlChor.image);
    }
  }

  return Array.from(mediaMap.values());
}

/** Static assets shipped with the app (e.g. /images/team/...) live in public/. */
const PUBLIC_ROOT = resolve(
  /* turbopackIgnore: true */ process.cwd(),
  "public",
);

/**
 * Resolve a stored media path to a file on disk.
 *
 * Managed uploads live under UPLOADS_ROOT — deliberately outside public/, so
 * they are only reachable through the authorization checks in /api/uploads.
 * Every other path is a static asset that ships in public/. Both resolutions
 * are confined to their root, since Media.path is not validated on the
 * media.importMedia route and must not be able to read arbitrary files.
 */
function resolveMediaFsPath(storedPath: string): string | null {
  if (storedPath.startsWith("/api/uploads/")) {
    return resolveUploadFsPath(storedPath);
  }

  const relativePath = storedPath.replace(/^\/+/, "");
  const fullPath = resolve(
    /* turbopackIgnore: true */ PUBLIC_ROOT,
    relativePath,
  );
  if (!fullPath.startsWith(PUBLIC_ROOT + sep)) return null;
  return fullPath;
}

/**
 * Reads a media file from disk
 */
export async function readMediaFile(media: Media): Promise<Buffer | null> {
  try {
    const filePath = resolveMediaFsPath(media.path);
    if (!filePath) {
      console.warn(
        `Media path outside the allowed roots: ${media.path} (media ID: ${media.id})`,
      );
      return null;
    }

    try {
      await stat(/* turbopackIgnore: true */ filePath);
    } catch {
      console.warn(`Media file not found: ${filePath} (media ID: ${media.id})`);
      return null;
    }

    return await readFile(/* turbopackIgnore: true */ filePath);
  } catch (error) {
    console.error(`Error reading media file ${media.id}:`, error);
    return null;
  }
}

/**
 * Reads an uploaded file by its stored path (e.g. Download.fileUrl).
 *
 * Unlike media, these files have no Media row — the entity only keeps the
 * `/api/uploads/...` URL. External URLs resolve to null and are skipped.
 */
export async function readUploadFile(
  storedPath: string,
): Promise<Buffer | null> {
  try {
    const filePath = resolveUploadFsPath(storedPath);
    if (!filePath) return null;

    try {
      await stat(/* turbopackIgnore: true */ filePath);
    } catch {
      console.warn(`Upload file not found: ${filePath} (path: ${storedPath})`);
      return null;
    }

    return await readFile(/* turbopackIgnore: true */ filePath);
  } catch (error) {
    console.error(`Error reading upload file ${storedPath}:`, error);
    return null;
  }
}

/**
 * Creates a ZIP file containing JSON data and media files
 */
export async function createExportZip(
  jsonData: Record<string, unknown>,
  mediaFiles: Media[],
  jsonFileName: string = "data.json",
  filePaths: string[] = [],
): Promise<Buffer> {
  const zip = new JSZip();

  zip.file(jsonFileName, JSON.stringify(jsonData, null, 2));

  const mediaMapping: Record<string, string> = {};

  for (const media of mediaFiles) {
    const fileBuffer = await readMediaFile(media);
    if (fileBuffer) {
      const filename = media.filename || `${media.id}.${media.extension}`;
      const zipPath = `media/${filename}`;

      zip.file(zipPath, fileBuffer);
      mediaMapping[media.id] = filename;
    }
  }

  if (Object.keys(mediaMapping).length > 0) {
    zip.file("media-mapping.json", JSON.stringify(mediaMapping, null, 2));
  }

  // Raw uploads that entities reference by path instead of by Media row.
  const fileMapping: Record<string, string> = {};
  const usedNames = new Set<string>();

  for (const storedPath of new Set(filePaths)) {
    const fileBuffer = await readUploadFile(storedPath);
    if (!fileBuffer) continue;

    // Two stored paths can share a basename; keep them apart in the ZIP.
    const baseName = storedPath.split("/").pop() || "file";
    let filename = baseName;
    for (let i = 2; usedNames.has(filename); i++) {
      filename = `${i}-${baseName}`;
    }
    usedNames.add(filename);

    zip.file(`files/${filename}`, fileBuffer);
    fileMapping[storedPath] = filename;
  }

  if (Object.keys(fileMapping).length > 0) {
    zip.file("file-mapping.json", JSON.stringify(fileMapping, null, 2));
  }

  return await zip.generateAsync({ type: "nodebuffer" });
}

/**
 * Builds a safe on-disk filename for a file taken out of an import ZIP.
 *
 * Names inside the archive are untrusted input, so base name and extension are
 * both reduced to a known-safe alphabet: neither may contain the separators
 * that would let a crafted entry escape its target folder. `index` keeps files
 * apart whose names collapse to the same base after sanitizing.
 */
export function buildImportFilename(
  zipFilename: string,
  userId: string,
  timestamp: number,
  index: number,
): { filename: string; extension: string } {
  const extension =
    (zipFilename.split(".").pop() ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 10) || "bin";

  const baseName =
    zipFilename
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .substring(0, 50) || "file";

  return {
    filename: `${baseName}-${userId.substring(0, 8)}-${timestamp}-${index}.${extension}`,
    extension,
  };
}

/**
 * Extracts a ZIP file and returns its contents
 */
export async function extractImportZip(zipBuffer: Buffer): Promise<{
  jsonData: Record<string, unknown>;
  mediaFiles: Map<string, Buffer>; // filename -> buffer
  mediaMapping: Record<string, string>; // oldId -> filename
  uploadFiles: Map<string, Buffer>; // filename -> buffer
  fileMapping: Record<string, string>; // old stored path -> filename
}> {
  const zip = await JSZip.loadAsync(zipBuffer);
  const mediaFiles = new Map<string, Buffer>();
  const uploadFiles = new Map<string, Buffer>();
  let jsonData: Record<string, unknown> = {};
  let mediaMapping: Record<string, string> = {};
  let fileMapping: Record<string, string> = {};

  for (const [filename, file] of Object.entries(zip.files)) {
    if (file.dir) continue;

    const content = await file.async("nodebuffer");

    if (filename === "media-mapping.json") {
      mediaMapping = JSON.parse(content.toString("utf-8"));
    } else if (filename === "file-mapping.json") {
      fileMapping = JSON.parse(content.toString("utf-8"));
    } else if (filename.startsWith("media/")) {
      const mediaFilename = filename.replace("media/", "");
      mediaFiles.set(mediaFilename, content);
    } else if (filename.startsWith("files/")) {
      const uploadFilename = filename.replace("files/", "");
      uploadFiles.set(uploadFilename, content);
    } else if (filename.endsWith(".json")) {
      // Only the payload JSON is left; the mappings are matched above so they
      // can never be mistaken for it.
      jsonData = JSON.parse(content.toString("utf-8"));
    }
  }

  return { jsonData, mediaFiles, mediaMapping, uploadFiles, fileMapping };
}
