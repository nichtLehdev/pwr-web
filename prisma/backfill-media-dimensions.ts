/**
 * Trägt Breite und Höhe für Bilder ohne Maße nach; ohne Maße kann kein
 * Titelbild als Hochformat erkannt werden.
 * Usage: pnpm backfill:media-dimensions
 */
import "dotenv/config";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { db } from "@/server/db";
import { readImageDimensions } from "@/server/utils/image-dimensions";
import { resolveUploadFsPath } from "@/server/utils/uploads-dir";

/** Uploads liegen unter UPLOADS_DIR, Bilder aus dem Repo unter public/. */
function localFilePath(storedPath: string): string | null {
  const upload = resolveUploadFsPath(storedPath);
  if (upload) return upload;
  if (storedPath.startsWith("/images/")) {
    return resolve(process.cwd(), "public", storedPath.slice(1));
  }
  return null;
}

async function main() {
  const media = await db.media.findMany({
    where: {
      mimeType: { startsWith: "image/" },
      OR: [{ width: null }, { height: null }],
    },
    select: { id: true, path: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`${media.length} Bilder ohne Maße.`);

  let updated = 0;
  let missing = 0;
  let unreadable = 0;

  for (const [index, item] of media.entries()) {
    const prefix = `[${index + 1}/${media.length}]`;
    const filePath = localFilePath(item.path);
    const buffer = filePath ? await readFile(filePath).catch(() => null) : null;
    if (!buffer) {
      missing++;
      console.warn(`${prefix} ✗ Datei fehlt: ${item.path}`);
      continue;
    }

    const dimensions = await readImageDimensions(buffer);
    if (!dimensions) {
      unreadable++;
      console.warn(`${prefix} ✗ nicht lesbar: ${item.path}`);
      continue;
    }

    await db.media.update({ where: { id: item.id }, data: dimensions });
    updated++;
    console.log(
      `${prefix} ✓ ${item.path} -> ${dimensions.width}×${dimensions.height}`,
    );
  }

  console.log(
    `Fertig: ${updated} nachgetragen, ${missing} Dateien fehlen, ${unreadable} nicht lesbar.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
