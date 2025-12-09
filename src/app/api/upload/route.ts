import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { auth } from "@/server/better-auth";

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
};

const maxSizeByFolder: Record<string, number> = {
  profiles: 5 * 1024 * 1024,
  downloads: 50 * 1024 * 1024,
  media: 10 * 1024 * 1024,
};

function getExtension(filename: string, mimeType: string): string {
  const fromFilename = filename.split(".").pop()?.toLowerCase();
  if (fromFilename) return fromFilename;

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

  return mimeToExt[mimeType] || "bin";
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

    const timestamp = Date.now();
    const userId = session.user.id;
    const extension = getExtension(file.name, file.type);

    const baseName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .substring(0, 50);

    const filename = `${baseName}-${userId.substring(0, 8)}-${timestamp}.${extension}`;

    const uploadDir = join(process.cwd(), "public", "uploads", folder);
    await mkdir(uploadDir, { recursive: true });

    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const url = `/api/uploads/${folder}/${filename}`;

    return NextResponse.json({
      success: true,
      url,
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
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }
}
