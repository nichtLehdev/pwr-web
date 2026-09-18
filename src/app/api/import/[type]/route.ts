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
  createReferenceResolver,
  type UnresolvedReference,
} from "@/server/utils/import-references";
import {
  readCourseContent,
  readCourseCustomFields,
  readCourseDownPayment,
  readCourseGuestTeamMembers,
  readCoursePriceOptions,
} from "@/server/utils/course-import";
import {
  readEventContent,
  readEventDownloadRefs,
  readEventPriceOptions,
} from "@/server/utils/event-import";
import { readText } from "@/server/utils/import-values";
import { readPostContent } from "@/server/utils/post-import";
import {
  importCourseSlug,
  importEventSlug,
  importPostSlug,
} from "@/server/api/helpers/content-slug";
import { normalizeCourseNumber } from "@/lib/invoice-document";
import { formatPhoneNumberOrNull } from "@/lib/phone-number";
import {
  ContentStatus,
  DownloadCategory,
  FileType,
  HistoryCategory,
} from "~/generated/prisma/client";
import { Prisma } from "~/generated/prisma/client";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Import");

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
          log.warn(`Media file not found in ZIP: ${filename}`);
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

    // Raw uploads (e.g. download files) travel by path, not as Media rows;
    // the entity URL is rewritten because the source URL means nothing here.
    const uploadUrlMap: Record<string, string> = {}; // old URL -> new URL

    if (uploadFiles.size > 0 && Object.keys(fileMapping).length > 0) {
      const userId = session.user.id;
      const timestamp = Date.now();
      let fileIndex = 0;

      for (const [oldUrl, filename] of Object.entries(fileMapping)) {
        const fileBuffer = uploadFiles.get(filename);
        if (!fileBuffer) {
          log.warn(`Upload file not found in ZIP: ${filename}`);
          continue;
        }

        // The folder comes from the exported URL but is checked against a
        // fixed set: a crafted ZIP must not steer writes outside uploads/.
        const folder = oldUrl.split("/")[3] ?? "";
        if (!IMPORTABLE_UPLOAD_FOLDERS.has(folder)) {
          log.warn(`Skipping upload file with unexpected path: ${oldUrl}`);
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

    let result: {
      success: boolean;
      importedCount: number;
      /** References an export carried that this database could not match. */
      unresolvedReferences?: UnresolvedReference[];
    };

    switch (type) {
      case "posts": {
        const posts = (jsonData.posts as Array<Record<string, unknown>>) || [];
        const references = createReferenceResolver(db);
        // Sequential: the resolver caches its lookups, see its comment.
        const results = [];

        for (const postData of posts) {
          const coverImageId = postData.coverImageId as string | undefined;
          const newCoverImageId = coverImageId
            ? mediaIdMap[coverImageId] || coverImageId
            : null;

          const content = readPostContent(postData);

          results.push(
            await db.post.create({
              data: {
                ...content,
                slug: await importPostSlug(db, content.title, postData.slug),
                bezirkId: await references.bezirkId(
                  postData.bezirkId,
                  postData.bezirk,
                  content.title,
                ),
                // Die verfasste Person wird über ihre Adresse gesucht; fehlt
                // sie im Zielbestand, trägt der Beitrag weiter ihren Namen.
                authorId: await references.userId(
                  postData.authorId,
                  postData.authorEmail,
                  content.title,
                  "authorId",
                ),
                coverImageId: newCoverImageId,
                createdById: session.user.id,
              },
            }),
          );
        }

        if (references.unresolved.length > 0) {
          log.warn(
            `Post-Import: ${references.unresolved.length} Verweis(e) nicht aufloesbar`,
            references.unresolved,
          );
        }

        result = {
          success: true,
          importedCount: results.length,
          unresolvedReferences: references.unresolved,
        };
        break;
      }

      case "events": {
        const events =
          (jsonData.events as Array<Record<string, unknown>>) || [];
        const references = createReferenceResolver(db);
        const resolveLocation = createLocationResolver(db);
        // Sequential: the resolvers cache and create rows, see their comments.
        const results = [];

        for (const eventData of events) {
          const coverImageId = eventData.coverImageId as string | undefined;
          const newCoverImageId = coverImageId
            ? mediaIdMap[coverImageId] || coverImageId
            : null;

          const content = readEventContent(eventData);
          const title = content.title;

          // An id from another database means nothing here, so every
          // reference is resolved against this one first.
          let locationId = await references.knownLocationId(
            eventData.locationId,
          );
          if (!locationId && eventData.location) {
            locationId = await resolveLocation(
              eventData.location as ImportLocation,
              title,
            );
          }

          // Set: Pfad und Titel können auf dieselbe Datei zeigen, und
          // Termin+Datei ist eindeutig.
          const downloadIds = new Set<string>();
          for (const ref of readEventDownloadRefs(eventData.downloads)) {
            const downloadId = await references.downloadId(
              ref.downloadId,
              ref.fileUrl,
              ref.title,
              title,
            );
            if (downloadId) downloadIds.add(downloadId);
          }

          const priceOptions = readEventPriceOptions(eventData.priceOptions);

          results.push(
            await db.event.create({
              data: {
                ...content,
                slug: await importEventSlug(
                  db,
                  title,
                  content.eventDate,
                  eventData.slug,
                ),
                bezirkId: await references.bezirkId(
                  eventData.bezirkId,
                  eventData.bezirk,
                  title,
                ),
                locationId,
                ensembleId: await references.ensembleId(
                  eventData.ensembleId,
                  eventData.ensemble,
                  eventData.ensembleName,
                  title,
                ),
                auswahlChorId: await references.auswahlChorId(
                  eventData.auswahlChorId,
                  eventData.auswahlChor,
                  title,
                ),
                coverImageId: newCoverImageId,
                createdById: session.user.id,
                ...(priceOptions.length > 0 && {
                  priceOptions: { create: priceOptions },
                }),
                ...(downloadIds.size > 0 && {
                  downloads: {
                    create: [...downloadIds].map((downloadId) => ({
                      downloadId,
                    })),
                  },
                }),
              },
            }),
          );
        }

        if (references.unresolved.length > 0) {
          log.warn(
            `Event-Import: ${references.unresolved.length} Verweis(e) nicht aufloesbar`,
            references.unresolved,
          );
        }

        result = {
          success: true,
          importedCount: results.length,
          unresolvedReferences: references.unresolved,
        };
        break;
      }

      case "ensembles": {
        const ensembles =
          (jsonData.ensembles as Array<Record<string, unknown>>) || [];
        const references = createReferenceResolver(db);
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
                // Same cross-environment problem as on events: the raw ids
                // belong to whichever database wrote the export.
                bezirkId: await references.bezirkId(
                  ensembleData.bezirkId,
                  ensembleData.bezirk,
                  (ensembleData.name as string) || "unbenannt",
                ),
                locationId,
                rehearsalDay: (ensembleData.rehearsalDay as string) || null,
                rehearsalTime: (ensembleData.rehearsalTime as string) || null,
                ...(rehearsalSchedules.length > 0 && {
                  rehearsalSchedules: { create: rehearsalSchedules },
                }),
                contactWebsite: (ensembleData.contactWebsite as string) || null,
                socials: readSocials(ensembleData.socials),
                conductorId: await references.userId(
                  ensembleData.conductorId,
                  ensembleData.conductorEmail,
                  (ensembleData.name as string) || "unbenannt",
                  "conductorId",
                ),
                conductorName: (ensembleData.conductorName as string) || null,
                conductorEmail:
                  (ensembleData.conductorEmail as string) ||
                  legacyContactEmail ||
                  null,
                // No zod layer here, so the house format is applied directly.
                conductorPhone: formatPhoneNumberOrNull(
                  (ensembleData.conductorPhone as string) ||
                    legacyContactPhone ||
                    null,
                ),
                representativeId: await references.userId(
                  ensembleData.representativeId,
                  ensembleData.representativeEmail,
                  (ensembleData.name as string) || "unbenannt",
                  "representativeId",
                ),
                representativeName:
                  (ensembleData.representativeName as string) || null,
                representativeEmail:
                  (ensembleData.representativeEmail as string) || null,
                representativePhone: formatPhoneNumberOrNull(
                  (ensembleData.representativePhone as string) || null,
                ),
                imageId: newImageId,
                isActive: (ensembleData.isActive as boolean) ?? true,
              },
            }),
          );
        }

        if (references.unresolved.length > 0) {
          log.warn(
            `Ensemble-Import: ${references.unresolved.length} Verweis(e) nicht aufloesbar`,
            references.unresolved,
          );
        }

        result = {
          success: true,
          importedCount: results.length,
          unresolvedReferences: references.unresolved,
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
        const references = createReferenceResolver(db);
        const resolveLocation = createLocationResolver(db);
        // Sequential: the resolvers cache and create rows, see their comments.
        const results = [];

        for (const courseData of courses) {
          const content = readCourseContent(courseData);
          const title = content.title;

          // An id from another database means nothing here.
          let locationId = await references.knownLocationId(
            courseData.locationId,
          );
          if (!locationId && courseData.location) {
            locationId = await resolveLocation(
              courseData.location as ImportLocation,
              title,
            );
          }

          const imageId = readText(courseData.imageId);
          const newImageId = imageId ? mediaIdMap[imageId] || imageId : null;

          // Die Kursnummer bildet den Rechnungs-Nummernkreis. Ist sie schon
          // vergeben, kommt der Kurs ohne Nummer an; eine Ersatznummer wird
          // bewusst nicht erfunden, sie stammt aus der Buchhaltung.
          const exportedNumber = normalizeCourseNumber(
            readText(courseData.courseNumber),
          );
          const courseNumberTaken =
            exportedNumber !== null &&
            (await db.course.count({
              where: { courseNumber: exportedNumber },
            })) > 0;
          const courseNumber = courseNumberTaken ? null : exportedNumber;
          if (courseNumberTaken) {
            references.note(title, "Kursnummer", exportedNumber);
          }

          const downPayment = readCourseDownPayment({
            raw: courseData,
            courseNumber,
            isFree: content.isFree,
            isExternal: Boolean(content.externalRegistrationUrl),
            allowSiblingDiscount: content.allowSiblingDiscount,
            priceOptions: readCoursePriceOptions(courseData.priceOptions),
          });
          if (downPayment.droppedReason) {
            references.note(title, "Anzahlung", downPayment.droppedReason);
          }

          const customFields = readCourseCustomFields(courseData.customFields);
          const guestTeamMembers = readCourseGuestTeamMembers(
            courseData.guestTeamMembers,
          );

          results.push(
            await db.course.create({
              data: {
                ...content,
                slug: await importCourseSlug(
                  db,
                  title,
                  content.startDate,
                  courseData.slug,
                ),
                courseNumber,
                downPaymentMode: downPayment.downPaymentMode,
                downPaymentAmount: downPayment.downPaymentAmount,
                downPaymentRefundPolicy: downPayment.downPaymentRefundPolicy,
                downPaymentRefundText: downPayment.downPaymentRefundText,
                imageId: newImageId,
                bezirkId: await references.bezirkId(
                  courseData.bezirkId,
                  courseData.bezirk,
                  title,
                ),
                locationId,
                createdById: session.user.id,
                ...(downPayment.priceOptions.length > 0 && {
                  priceOptions: { create: downPayment.priceOptions },
                }),
                ...(customFields.length > 0 && {
                  customFields: { create: customFields },
                }),
                ...(guestTeamMembers.length > 0 && {
                  guestTeamMembers: { create: guestTeamMembers },
                }),
              },
            }),
          );
        }

        if (references.unresolved.length > 0) {
          log.warn(
            `Kurs-Import: ${references.unresolved.length} Verweis(e) nicht aufloesbar`,
            references.unresolved,
          );
        }

        result = {
          success: true,
          importedCount: results.length,
          unresolvedReferences: references.unresolved,
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
    log.error("Import error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to import data",
      },
      { status: 500 },
    );
  }
}
