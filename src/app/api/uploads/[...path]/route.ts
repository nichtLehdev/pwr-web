import { type NextRequest, NextResponse } from "next/server";
import { stat } from "fs/promises";
import { createReadStream } from "fs";
import { resolve, sep } from "path";
import { db } from "@/server/db";
import { auth } from "@/server/better-auth";
import { UPLOADS_ROOT } from "@/server/utils/uploads-dir";
import { ContentStatus } from "~/generated/prisma/client";

// No "svg" entry on purpose: SVG can contain script, and serving it inline
// from the app origin would be a stored-XSS vector. Unknown extensions fall
// back to application/octet-stream and are served as attachments.
const mimeTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",

  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  zip: "application/zip",

  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return mimeTypes[ext] ?? "application/octet-stream";
}

/**
 * Enforce the visibility rules stored in the database before streaming a
 * file. Mirrors the metadata rules of the materials/media routers:
 * - downloads: public+approved for everyone, otherwise session required
 * - media: public+approved for everyone, otherwise session required
 * - profiles: always public (avatars render on public pages)
 * - invoices: never served here (see below)
 * Files without a database row fall back to requiring a session. That is what
 * gates course-mail attachments: they travel inside the message itself, so
 * recipients never need this route, and the link stays staff-only.
 */
async function checkAccess(
  request: NextRequest,
  filePath: string,
): Promise<{ allowed: boolean; isPublic: boolean }> {
  const folder = filePath.split("/")[0];
  const url = `/api/uploads/${filePath}`;

  if (folder === "profiles") return { allowed: true, isPublic: true };

  // Invoice PDFs are named after their invoice number, which is a guessable
  // running sequence — "any logged-in session" is nowhere near enough. They are
  // served exclusively by /api/invoices/[id]/pdf, which checks who is asking.
  if (folder === "invoices") return { allowed: false, isPublic: false };

  let publiclyVisible = false;
  if (folder === "downloads") {
    const download = await db.download.findFirst({
      where: { fileUrl: url },
      select: { isPublic: true, status: true },
    });
    publiclyVisible =
      !!download &&
      download.isPublic &&
      download.status === ContentStatus.APPROVED;
  } else if (folder === "media") {
    const media = await db.media.findFirst({
      where: { url },
      select: { isPublic: true, status: true },
    });
    publiclyVisible =
      !!media && media.isPublic && media.status === ContentStatus.APPROVED;
  }
  if (publiclyVisible) return { allowed: true, isPublic: true };

  const session = await auth.api.getSession({ headers: request.headers });
  return { allowed: !!session?.user, isPublic: false };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const filePath = path.join("/");

    if (filePath.includes("..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const fullPath = resolve(
      /* turbopackIgnore: true */ UPLOADS_ROOT,
      filePath,
    );
    if (!fullPath.startsWith(UPLOADS_ROOT + sep)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const access = await checkAccess(request, filePath);
    if (!access.allowed) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let fileStats;
    try {
      fileStats = await stat(/* turbopackIgnore: true */ fullPath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const mimeType = getMimeType(filePath);
    const nodeStream = createReadStream(/* turbopackIgnore: true */ fullPath);
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
        nodeStream.on("end", () => controller.close());
        nodeStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        nodeStream.destroy();
      },
    });

    const headers: Record<string, string> = {
      "Content-Type": mimeType,
      "Content-Length": fileStats.size.toString(),
      // Private files must never land in shared caches.
      "Cache-Control": access.isPublic
        ? "public, max-age=31536000, immutable"
        : "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    };
    // Types we don't explicitly serve inline are downloads, never documents
    // the browser might interpret (svg/html/xml → XSS on this origin).
    if (mimeType === "application/octet-stream") {
      headers["Content-Disposition"] = "attachment";
    }

    return new NextResponse(webStream, { headers });
  } catch (error) {
    console.error("Error serving upload:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 },
    );
  }
}
