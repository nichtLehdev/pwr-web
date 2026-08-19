import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import {
  extractImportZip,
  buildImportFilename,
} from "@/server/utils/export-import";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { UPLOADS_ROOT } from "@/server/utils/uploads-dir";
import {
  readRehearsalSchedules,
  readSocials,
  type ImportLocation,
} from "@/server/utils/ensemble-import";
import { createLocationResolver } from "@/server/utils/ensemble-import-location";
import {
  ContentStatus,
  PostCategory,
  EventCategory,
  EventEnsembleType,
  DownloadCategory,
  FileType,
  CourseType,
  TargetAudience,
  HistoryCategory,
} from "~/generated/prisma/client";
import { Prisma } from "~/generated/prisma/client";

/**
 * Upload folders an import may write into. Everything else in a ZIP is
 * ignored, so the archive cannot decide where files land.
 */
const IMPORTABLE_UPLOAD_FOLDERS = new Set(["downloads"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Check if user has admin permissions
    const { userHasPermission } =
      await import("@/server/api/helpers/permissions");
    const { PERMISSIONS } = await import("@/lib/permissions");
    const canImport = await userHasPermission(
      session.user.id,
      PERMISSIONS.USERS_MANAGE,
    );
    if (!canImport) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const isZip = file.name.endsWith(".zip") || file.type === "application/zip";
    let jsonData: Record<string, unknown>;
    let mediaFiles: Map<string, Buffer> = new Map();
    let mediaMapping: Record<string, string> = {};
    let uploadFiles: Map<string, Buffer> = new Map();
    let fileMapping: Record<string, string> = {};

    if (isZip) {
      const arrayBuffer = await file.arrayBuffer();
      const zipBuffer = Buffer.from(arrayBuffer);
      const extracted = await extractImportZip(zipBuffer);
      jsonData = extracted.jsonData;
      mediaFiles = extracted.mediaFiles;
      mediaMapping = extracted.mediaMapping;
      uploadFiles = extracted.uploadFiles;
      fileMapping = extracted.fileMapping;
    } else {
      const text = await file.text();
      jsonData = JSON.parse(text);
    }

    const mediaIdMap: Record<string, string> = {}; // oldId -> newId

    if (mediaFiles.size > 0 && Object.keys(mediaMapping).length > 0) {
      const userId = session.user.id;
      const timestamp = Date.now();
      let mediaIndex = 0;

      for (const [oldMediaId, filename] of Object.entries(mediaMapping)) {
        const fileBuffer = mediaFiles.get(filename);
        if (!fileBuffer) {
          console.warn(`Media file not found in ZIP: ${filename}`);
          continue;
        }

        const { filename: newFilename, extension } = buildImportFilename(
          filename,
          userId,
          timestamp,
          mediaIndex++,
        );

        const mimeTypes: Record<string, string> = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          webp: "image/webp",
          gif: "image/gif",
          pdf: "application/pdf",
        };
        const mimeType = mimeTypes[extension] || "application/octet-stream";

        const uploadDir = join(
          /* turbopackIgnore: true */ UPLOADS_ROOT,
          "media",
        );
        await mkdir(/* turbopackIgnore: true */ uploadDir, { recursive: true });
        const filePath = join(uploadDir, newFilename);
        await writeFile(/* turbopackIgnore: true */ filePath, fileBuffer);

        const url = `/api/uploads/media/${newFilename}`;

        const media = await db.media.create({
          data: {
            name: filename,
            filename: newFilename,
            url,
            path: url,
            mimeType,
            size: fileBuffer.length,
            extension,
            isPublic: true,
            status: ContentStatus.APPROVED,
            uploadedById: userId,
          },
        });

        mediaIdMap[oldMediaId] = media.id;
      }
    }

    // Raw uploads (e.g. download files) travel by path, not as Media rows.
    // They are written back under uploads/ and the entity URL is rewritten,
    // since the source system's URL means nothing here.
    const uploadUrlMap: Record<string, string> = {}; // old URL -> new URL

    if (uploadFiles.size > 0 && Object.keys(fileMapping).length > 0) {
      const userId = session.user.id;
      const timestamp = Date.now();
      let fileIndex = 0;

      for (const [oldUrl, filename] of Object.entries(fileMapping)) {
        const fileBuffer = uploadFiles.get(filename);
        if (!fileBuffer) {
          console.warn(`Upload file not found in ZIP: ${filename}`);
          continue;
        }

        // The folder comes from the exported URL but is checked against a
        // fixed set: a crafted ZIP must not steer writes outside uploads/.
        const folder = oldUrl.split("/")[3] ?? "";
        if (!IMPORTABLE_UPLOAD_FOLDERS.has(folder)) {
          console.warn(`Skipping upload file with unexpected path: ${oldUrl}`);
          continue;
        }

        const { filename: newFilename } = buildImportFilename(
          filename,
          userId,
          timestamp,
          fileIndex++,
        );

        const uploadDir = join(
          /* turbopackIgnore: true */ UPLOADS_ROOT,
          folder,
        );
        await mkdir(/* turbopackIgnore: true */ uploadDir, { recursive: true });
        const filePath = join(uploadDir, newFilename);
        await writeFile(/* turbopackIgnore: true */ filePath, fileBuffer);

        uploadUrlMap[oldUrl] = `/api/uploads/${folder}/${newFilename}`;
      }
    }

    let result: { success: boolean; importedCount: number };

    switch (type) {
      case "posts": {
        const posts = (jsonData.posts as Array<Record<string, unknown>>) || [];
        const results = await Promise.all(
          posts.map(async (postData: Record<string, unknown>) => {
            const coverImageId = postData.coverImageId as string | undefined;
            const newCoverImageId = coverImageId
              ? mediaIdMap[coverImageId] || coverImageId
              : null;

            return await db.post.create({
              data: {
                title: postData.title as string,
                excerpt: (postData.excerpt as string) || null,
                content: postData.content as string,
                category: postData.category as string as PostCategory,
                bezirkId: (postData.bezirkId as string) || null,
                pinned: (postData.pinned as boolean) || false,
                status:
                  (postData.status as string as ContentStatus) ||
                  ContentStatus.DRAFT,
                coverImageId: newCoverImageId,
                createdById: session.user.id,
              },
            });
          }),
        );

        result = {
          success: true,
          importedCount: results.length,
        };
        break;
      }

      case "events": {
        const events =
          (jsonData.events as Array<Record<string, unknown>>) || [];
        const results = await Promise.all(
          events.map(async (eventData: Record<string, unknown>) => {
            const coverImageId = eventData.coverImageId as string | undefined;
            const newCoverImageId = coverImageId
              ? mediaIdMap[coverImageId] || coverImageId
              : null;

            return await db.event.create({
              data: {
                title: eventData.title as string,
                motto: (eventData.motto as string) || null,
                description: (eventData.description as string) || null,
                eventDate: new Date(eventData.eventDate as string),
                cancelled: (eventData.cancelled as boolean) || false,
                category: eventData.category as string as EventCategory,
                bezirkId: (eventData.bezirkId as string) || null,
                locationId: (eventData.locationId as string) || null,
                ensembleId: (eventData.ensembleId as string) || null,
                auswahlChorId: (eventData.auswahlChorId as string) || null,
                performingEnsembleType: (eventData.ensembleType as string)
                  ? (eventData.ensembleType as string as EventEnsembleType)
                  : null,
                coverImageId: newCoverImageId,
                status:
                  (eventData.status as string as ContentStatus) ||
                  ContentStatus.DRAFT,
              },
            });
          }),
        );

        result = {
          success: true,
          importedCount: results.length,
        };
        break;
      }

      case "ensembles": {
        const ensembles =
          (jsonData.ensembles as Array<Record<string, unknown>>) || [];
        const resolveLocation = createLocationResolver(db);
        // Sequential, not Promise.all: see createLocationResolver.
        const results = [];

        for (const ensembleData of ensembles) {
          const imageId = ensembleData.imageId as string | undefined;
          const newImageId = imageId ? mediaIdMap[imageId] || imageId : null;

          const legacyContactEmail = ensembleData.contactEmail as
            string | undefined;
          const legacyContactPhone = ensembleData.contactPhone as
            string | undefined;

          // An explicit id wins; the address block is the fallback for sheets
          // that only know where the chor rehearses.
          let locationId = (ensembleData.locationId as string) || null;
          if (!locationId && ensembleData.location) {
            locationId = await resolveLocation(
              ensembleData.location as ImportLocation,
              (ensembleData.name as string) || "unbenannt",
            );
          }

          const rehearsalSchedules = readRehearsalSchedules(
            ensembleData.rehearsalSchedules,
          );

          results.push(
            await db.ensemble.create({
              data: {
                name: ensembleData.name as string,
                description: (ensembleData.description as string) || null,
                internalId: (ensembleData.internalId as string) || null,
                bezirkId: (ensembleData.bezirkId as string) || null,
                locationId,
                rehearsalDay: (ensembleData.rehearsalDay as string) || null,
                rehearsalTime: (ensembleData.rehearsalTime as string) || null,
                ...(rehearsalSchedules.length > 0 && {
                  rehearsalSchedules: { create: rehearsalSchedules },
                }),
                contactWebsite: (ensembleData.contactWebsite as string) || null,
                socials: readSocials(ensembleData.socials),
                conductorId: (ensembleData.conductorId as string) || null,
                conductorName: (ensembleData.conductorName as string) || null,
                conductorEmail:
                  (ensembleData.conductorEmail as string) ||
                  legacyContactEmail ||
                  null,
                conductorPhone:
                  (ensembleData.conductorPhone as string) ||
                  legacyContactPhone ||
                  null,
                representativeId:
                  (ensembleData.representativeId as string) || null,
                representativeName:
                  (ensembleData.representativeName as string) || null,
                representativeEmail:
                  (ensembleData.representativeEmail as string) || null,
                representativePhone:
                  (ensembleData.representativePhone as string) || null,
                imageId: newImageId,
                isActive: (ensembleData.isActive as boolean) ?? true,
              },
            }),
          );
        }

        result = {
          success: true,
          importedCount: results.length,
        };
        break;
      }

      case "auswahlchoere": {
        const auswahlchoere =
          (jsonData.auswahlchoere as Array<Record<string, unknown>>) || [];
        const results = await Promise.all(
          auswahlchoere.map(async (chorData: Record<string, unknown>) => {
            const slug = chorData.slug as string | undefined;
            if (!slug) {
              throw new Error(
                `Slug fehlt fuer Auswahlchor: ${(chorData.name as string) || "unbenannt"}`,
              );
            }

            const imageId = chorData.imageId as string | undefined;
            const newImageId = imageId ? mediaIdMap[imageId] || imageId : null;

            // Resolve the conductor by email: user IDs from the source system
            // do not exist in the target system.
            const conductorEmail = chorData.conductorEmail as
              string | undefined;
            const conductor = conductorEmail
              ? await db.user.findUnique({
                  where: { email: conductorEmail },
                  select: { id: true },
                })
              : null;

            const chorFields = {
              name: chorData.name as string,
              subtitle: (chorData.subtitle as string) || "",
              founded: (chorData.founded as string) || "",
              members: (chorData.members as string) || "",
              description: (chorData.description as string) || "",
              color: (chorData.color as string) || "bg-primary",
              colorHex: (chorData.colorHex as string) || "#000000",
              imageId: newImageId,
              conductorId: conductor?.id ?? null,
              showApplication: (chorData.showApplication as boolean) ?? false,
            };

            // The slug is unique, so a re-import updates the existing choir
            // instead of failing on the unique constraint.
            return await db.auswahlChor.upsert({
              where: { slug },
              create: { ...chorFields, slug },
              update: chorFields,
            });
          }),
        );

        result = {
          success: true,
          importedCount: results.length,
        };
        break;
      }

      case "media": {
        const media = (jsonData.media as Array<Record<string, unknown>>) || [];
        const results = await Promise.all(
          media.map(async (mediaData: Record<string, unknown>) => {
            return await db.media.create({
              data: {
                name: mediaData.name as string,
                filename: mediaData.filename as string,
                url: mediaData.url as string,
                path: mediaData.path as string,
                mimeType: mediaData.mimeType as string,
                size: (mediaData.size as number) || 0,
                extension: mediaData.extension as string,
                width: (mediaData.width as number) || null,
                height: (mediaData.height as number) || null,
                alt: (mediaData.alt as string) || null,
                caption: (mediaData.caption as string) || null,
                title: (mediaData.title as string) || null,
                folder: (mediaData.folder as string) || null,
                tags: mediaData.tags
                  ? (mediaData.tags as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
                isPublic: (mediaData.isPublic as boolean) ?? true,
                status:
                  (mediaData.status as string as ContentStatus) ||
                  ContentStatus.APPROVED,
                uploadedById: session.user.id,
              },
            });
          }),
        );

        result = {
          success: true,
          importedCount: results.length,
        };
        break;
      }

      case "downloads": {
        const downloads =
          (jsonData.downloads as Array<Record<string, unknown>>) || [];
        const results = await Promise.all(
          downloads.map(async (downloadData: Record<string, unknown>) => {
            const oldFileUrl = downloadData.fileUrl as string;

            return await db.download.create({
              data: {
                title: downloadData.title as string,
                description: (downloadData.description as string) || null,
                category: downloadData.category as string as DownloadCategory,
                fileUrl: uploadUrlMap[oldFileUrl] ?? oldFileUrl,
                fileType: downloadData.fileType as string as FileType,
                fileSize: (downloadData.fileSize as number) || null,
                tags: (downloadData.tags as unknown) || [],
                isPublic: (downloadData.isPublic as boolean) ?? true,
                status:
                  (downloadData.status as string as ContentStatus) ||
                  ContentStatus.DRAFT,
                uploadedById: session.user.id,
              },
            });
          }),
        );

        result = {
          success: true,
          importedCount: results.length,
        };
        break;
      }

      case "blaeserhefte": {
        const blaeserhefte =
          (jsonData.blaeserhefte as Array<Record<string, unknown>>) || [];
        const results = await Promise.all(
          blaeserhefte.map(async (bhData: Record<string, unknown>) => {
            const imageId = bhData.imageId as string;
            const newImageId = mediaIdMap[imageId] || imageId;

            if (!newImageId) {
              throw new Error(`Image not found for Blaeserheft: ${imageId}`);
            }

            return await db.blaeserheft.create({
              data: {
                title: bhData.title as string,
                subtitle: bhData.subtitle as string,
                year: bhData.year as number,
                description: bhData.description as string,
                chapters: bhData.chapters
                  ? (bhData.chapters as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
                highlights: bhData.highlights
                  ? (bhData.highlights as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
                imageId: newImageId,
                audioSample: bhData.audioSample
                  ? (uploadUrlMap[bhData.audioSample as string] ??
                    (bhData.audioSample as string))
                  : null,
                priceBlaeserheft: (bhData.priceBlaeserheft as number) || null,
                priceBeiheft: (bhData.priceBeiheft as number) || null,
                priceTrompeten: (bhData.priceTrompeten as number) || null,
                priceCd: (bhData.priceCd as number) || null,
                availableBlaeserheft:
                  (bhData.availableBlaeserheft as boolean) ?? true,
                availableBeiheft: (bhData.availableBeiheft as boolean) ?? true,
                availableTrompeten:
                  (bhData.availableTrompeten as boolean) ?? false,
                availableCd: (bhData.availableCd as boolean) ?? true,
                sortOrder: (bhData.sortOrder as number) || 0,
              },
            });
          }),
        );

        result = {
          success: true,
          importedCount: results.length,
        };
        break;
      }

      case "history-events": {
        const historyEvents =
          (jsonData.historyEvents as Array<Record<string, unknown>>) || [];
        const results = await Promise.all(
          historyEvents.map(async (historyData: Record<string, unknown>) => {
            const imageId = historyData.imageId as string | undefined;
            const newImageId = imageId ? mediaIdMap[imageId] || imageId : null;

            return await db.historyEvent.create({
              data: {
                year: historyData.year as number,
                title: historyData.title as string,
                description: (historyData.description as string) || "",
                category:
                  (historyData.category as string as HistoryCategory) || null,
                imageId: newImageId,
                imageAlt: (historyData.imageAlt as string) || null,
                sortOrder: (historyData.sortOrder as number) || 0,
              },
            });
          }),
        );

        result = {
          success: true,
          importedCount: results.length,
        };
        break;
      }

      case "courses": {
        const courses =
          (jsonData.courses as Array<Record<string, unknown>>) || [];
        const results = await Promise.all(
          courses.map(async (courseData: Record<string, unknown>) => {
            return await db.course.create({
              data: {
                title: courseData.title as string,
                description: (courseData.description as string) || "",
                courseType: courseData.courseType as string as CourseType,
                targetAudience:
                  (courseData.targetAudience as string as TargetAudience) ||
                  null,
                startDate: new Date(courseData.startDate as string),
                endDate: courseData.endDate
                  ? new Date(courseData.endDate as string)
                  : new Date(courseData.startDate as string),
                registrationDeadline: courseData.registrationDeadline
                  ? new Date(courseData.registrationDeadline as string)
                  : null,
                maxParticipants: (courseData.maxParticipants as number) || null,
                bezirkId: (courseData.bezirkId as string) || null,
                locationId: (courseData.locationId as string) || null,
                status:
                  (courseData.status as string as ContentStatus) ||
                  ContentStatus.DRAFT,
                createdById: session.user.id,
              },
            });
          }),
        );

        result = {
          success: true,
          importedCount: results.length,
        };
        break;
      }

      default:
        return NextResponse.json(
          { error: "Invalid import type" },
          { status: 400 },
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to import data",
      },
      { status: 500 },
    );
  }
}
