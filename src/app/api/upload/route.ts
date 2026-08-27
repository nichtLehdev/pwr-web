import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { auth } from "@/server/better-auth";
import { UPLOADS_ROOT } from "@/server/utils/uploads-dir";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Upload");

const ALLOWED_FOLDERS = [
  "profiles",
  "downloads",
  "media",
  "course-mail",
] as const;
type UploadFolder = (typeof ALLOWED_FOLDERS)[number];

function isAllowedFolder(folder: string): folder is UploadFolder {
  return (ALLOWED_FOLDERS as readonly string[]).includes(folder);
}

const validTypesByFolder: Record<string, string[]> = {
  profiles: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  downloads: [
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
  ],
  media: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
  // Attachments for course mails. No audio: these travel inside the message,
  // where a 30 MB recording would just bounce off the recipients' mailboxes.
  "course-mail": [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ],
};

const maxSizeByFolder: Record<string, number> = {
  profiles: 5 * 1024 * 1024,
  downloads: 50 * 1024 * 1024,
  media: 10 * 1024 * 1024,
  // Per file; the send mutation additionally caps the combined size, since
  // mail servers reject the whole message once it grows past ~25 MB.
  "course-mail": 10 * 1024 * 1024,
};

const magicBytes: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/jpg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
  // Legacy Office formats are OLE compound files
  "application/msword": [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  "application/vnd.ms-excel": [
    [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  ],
  // Modern Office formats are ZIP containers
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    [0x50, 0x4b, 0x03, 0x04],
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    [0x50, 0x4b, 0x03, 0x04],
  ],
  "application/zip": [
    [0x50, 0x4b, 0x03, 0x04],
    [0x50, 0x4b, 0x05, 0x06],
  ],
  "application/x-zip-compressed": [
    [0x50, 0x4b, 0x03, 0x04],
    [0x50, 0x4b, 0x05, 0x06],
  ],
  "audio/mpeg": [
    [0xff, 0xfb],
    [0xff, 0xf3],
    [0xff, 0xf2],
    [0x49, 0x44, 0x33],
  ],
  "audio/mp3": [
    [0xff, 0xfb],
    [0xff, 0xf3],
    [0xff, 0xf2],
    [0x49, 0x44, 0x33],
  ],
  "audio/wav": [[0x52, 0x49, 0x46, 0x46]],
  "audio/ogg": [[0x4f, 0x67, 0x67, 0x53]],
};

function validateMagicBytes(buffer: Buffer, claimedType: string): boolean {
  const signatures = magicBytes[claimedType];
  // Fail closed: a type we can't verify is a type we don't accept
  if (!signatures) return false;
  return signatures.some((sig) =>
    sig.every((byte, i) => buffer.length > i && buffer[i] === byte),
  );
}

// The stored extension must come from the validated MIME type, never from the
// client-supplied filename — otherwise a file validated as image/jpeg can be
// stored (and later served) as .svg or .html.
const mimeToExt: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
};

function getExtension(mimeType: string): string | null {
  return mimeToExt[mimeType] ?? null;
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "profiles";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!isAllowedFolder(folder)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    const validTypes =
      validTypesByFolder[folder] ?? validTypesByFolder.profiles;
    const maxSize =
      maxSizeByFolder[folder] ?? maxSizeByFolder.profiles ?? 5 * 1024 * 1024;

    if (!validTypes?.includes(file.type)) {
      const allowed = validTypes ? validTypes.join(", ") : "(none)";
      return NextResponse.json(
        {
          error: `Invalid file type: ${file.type}. Allowed types for ${folder}: ${allowed}`,
        },
        { status: 400 },
      );
    }

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`,
        },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "File content does not match its declared type" },
        { status: 400 },
      );
    }

    const timestamp = Date.now();
    const userId = session.user.id;
    const extension = getExtension(file.type);
    if (!extension) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 },
      );
    }

    const baseName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .substring(0, 50);

    const filename = `${baseName}-${userId.substring(0, 8)}-${timestamp}.${extension}`;

    const uploadDir = join(/* turbopackIgnore: true */ UPLOADS_ROOT, folder);
    await mkdir(/* turbopackIgnore: true */ uploadDir, { recursive: true });

    const filePath = join(uploadDir, filename);
    await writeFile(/* turbopackIgnore: true */ filePath, buffer);

    const url = `/api/uploads/${folder}/${filename}`;
    const path = url; // path is the same as url for uploaded files

    return NextResponse.json({
      success: true,
      url,
      path,
      filename,
      size: buffer.length,
      mimeType: file.type,
      extension,

      file: {
        filename,
        url,
        size: buffer.length,
        mimeType: file.type,
      },
    });
  } catch (error) {
    log.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }
}
