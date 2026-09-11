import { z } from "zod";
import { unlink } from "fs/promises";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { ContentStatus, Prisma } from "~/generated/prisma/client";
import { userHasPermission } from "../helpers/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { permissionProcedure } from "../middleware/permissions";
import { resolveUploadFsPath } from "@/server/utils/uploads-dir";

import { createLogger } from "@/server/utils/logger";
import { parseMediaTags } from "@/lib/media-tags";

const log = createLogger("Media");

/**
 * Profilbilder liegen zwar in derselben Tabelle, gehören aber der
 * Benutzerverwaltung — die Medienverwaltung blendet sie überall aus, auch in
 * der Statistik. Sonst nennt die Kachel „Gesamt“ eine Zahl, die sich durch
 * Blättern nie erreichen lässt.
 */
const NON_PROFILE_MEDIA: Prisma.MediaWhereInput = {
  folder: { not: "profiles" },
};

/**
 * Leere Formularfelder kommen als `null` an und müssen die Spalte auch leeren.
 * `undefined` bedeutet für Prisma „nicht anfassen“ — beides auseinanderzuhalten
 * ist der ganze Zweck der `.nullable()`-Eingaben unten.
 */
function emptyToNull(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Die Datei zu einem Medium von der Platte entfernen, soweit vorhanden. */
async function unlinkMediaFile(storedPath: string) {
  const fullPath = resolveUploadFsPath(storedPath);
  if (!fullPath) return;
  try {
    await unlink(/* turbopackIgnore: true */ fullPath);
  } catch (err) {
    // Fehlende Datei ist kein Fehler: der Datenbankeintrag soll trotzdem weg.
    log.warn("Could not delete media file:", fullPath, err);
  }
}

// Stored url/path values must be exactly what /api/upload produces:
// /api/uploads/<folder>/<sanitized filename>. Anything else (absolute paths,
// dot segments, other folders) is rejected — these values are later used to
// derive filesystem paths for deletion.
const UPLOAD_PATH_PATTERN =
  /^\/api\/uploads\/(profiles|downloads|media)\/[a-zA-Z0-9-_]+\.[a-z0-9]+$/;

const uploadPathSchema = z
  .string()
  .max(500)
  .regex(UPLOAD_PATH_PATTERN, "Invalid upload path");

export const mediaRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const media = await ctx.db.media.findUnique({
        where: { id: input.id },
        include: {
          uploadedBy: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      });

      if (!media) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Media not found",
        });
      }

      if (!media.isPublic && !ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Media is private",
        });
      }

      return media;
    }),

  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        mimeType: z.string().optional(),
        folder: z.string().optional(),
        search: z.string().optional(),
        uploadedById: z.string().optional(),
        includeAll: z.boolean().optional(),
        /**
         * Serverseitig, nicht im Browser: eine Seite umfasst nur einen
         * Ausschnitt, ein Filter über `media` allein würde Treffer auf den
         * übrigen Seiten verschweigen.
         */
        status: z.array(z.enum(ContentStatus)).optional(),
        /** Schnellfilter der Redaktion: was noch Pflege braucht. */
        missing: z.enum(["alt", "copyright"]).optional(),
        sortBy: z
          .enum(["createdAt", "name", "size", "status"])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const canApproveMedia = await userHasPermission(
        userId,
        PERMISSIONS.MEDIA_APPROVE,
        ctx.permissionCache,
      );
      const canUploadMedia = await userHasPermission(
        userId,
        PERMISSIONS.MEDIA_UPLOAD,
        ctx.permissionCache,
      );

      /**
       * Jede Bedingung als eigener `AND`-Eintrag statt als Feld auf `where`:
       * Sichtbarkeit, Suche und die „fehlt noch“-Filter brauchen alle ein
       * eigenes `OR`, und auf einem gemeinsamen Objekt überschreibt der letzte
       * Schreibzugriff die vorherigen — genau so ging der Statusfilter früher
       * gegen die Sichtbarkeitsregel verloren.
       */
      const and: Prisma.MediaWhereInput[] = [NON_PROFILE_MEDIA];

      if (input.mimeType) and.push({ mimeType: { contains: input.mimeType } });
      if (input.folder) and.push({ folder: input.folder });
      if (input.uploadedById) and.push({ uploadedById: input.uploadedById });
      if (input.status?.length) and.push({ status: { in: input.status } });

      if (input.missing === "alt") {
        and.push({ OR: [{ alt: null }, { alt: "" }] });
      } else if (input.missing === "copyright") {
        and.push({ OR: [{ copyright: null }, { copyright: "" }] });
        and.push({ OR: [{ creator: null }, { creator: "" }] });
      }

      if (input.search) {
        and.push({
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { alt: { contains: input.search, mode: "insensitive" } },
            { caption: { contains: input.search, mode: "insensitive" } },
            { title: { contains: input.search, mode: "insensitive" } },
            { copyright: { contains: input.search, mode: "insensitive" } },
            { creator: { contains: input.search, mode: "insensitive" } },
          ],
        });
      }

      if (input.includeAll) {
        if (canApproveMedia) {
          // Can see all media
        } else if (canUploadMedia) {
          // Can see approved + own pending
          and.push({
            OR: [
              { status: ContentStatus.APPROVED },
              { status: ContentStatus.PENDING, uploadedById: userId },
            ],
          });
        } else {
          and.push({ status: ContentStatus.APPROVED });
        }
      } else {
        and.push({
          OR: [{ status: ContentStatus.APPROVED }, { uploadedById: userId }],
        });
      }

      const where: Prisma.MediaWhereInput = { AND: and };

      const [media, total] = await Promise.all([
        ctx.db.media.findMany({
          where,
          include: {
            uploadedBy: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { [input.sortBy]: input.sortOrder },
        }),
        ctx.db.media.count({ where }),
      ]);

      return {
        // Tags immer als Array herausgeben, egal ob in der JSON-Spalte ein
        // Array oder ein alter Komma-String steht — die Ansichten sollen sich
        // mit dem Unterschied nicht befassen müssen.
        media: media.map((item) => ({
          ...item,
          tags: parseMediaTags(item.tags),
        })),
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  getMine: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = { uploadedById: ctx.session.user.id };

      const [media, total] = await Promise.all([
        ctx.db.media.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.media.count({ where }),
      ]);

      return {
        media,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().max(255),
        filename: z.string().max(255),
        url: uploadPathSchema,
        path: uploadPathSchema,
        mimeType: z.string().max(100),
        size: z.number().min(0).max(100000000),
        extension: z.string().max(10),
        width: z.number().min(0).max(50000).optional(),
        height: z.number().min(0).max(50000).optional(),
        alt: z.string().max(500).optional(),
        caption: z.string().max(1000).optional(),
        title: z.string().max(200).optional(),
        copyright: z.string().max(500).optional(),
        creator: z.string().max(255).optional(),
        folder: z.string().optional(),
        tags: z.array(z.string().max(50)).max(50).optional(),
        isPublic: z.boolean().default(true),
        focalPointX: z.number().min(0).max(100).optional().nullable(),
        focalPointY: z.number().min(0).max(100).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const canApproveMedia = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.MEDIA_APPROVE,
        ctx.permissionCache,
      );

      const media = await ctx.db.media.create({
        data: {
          ...input,
          tags: input.tags?.length ? input.tags : Prisma.DbNull,
          uploadedById: ctx.session.user.id,
          status: canApproveMedia
            ? ContentStatus.APPROVED
            : ContentStatus.PENDING,
        },
      });

      return media;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        /**
         * Durchweg `.nullable()`: ein geleertes Feld schickt `null` und löscht
         * die Spalte, ein weggelassenes Feld bleibt `undefined` und damit
         * unangetastet. Mit `.optional()` allein waren beide Fälle identisch —
         * das Formular meldete „gespeichert“, und der alte Wert stand noch da.
         */
        name: z.string().min(1).max(255).optional(),
        alt: z.string().max(500).nullable().optional(),
        caption: z.string().max(1000).nullable().optional(),
        title: z.string().max(200).nullable().optional(),
        copyright: z.string().max(500).nullable().optional(),
        creator: z.string().max(255).nullable().optional(),
        folder: z.string().max(100).nullable().optional(),
        tags: z.array(z.string().max(50)).max(50).nullable().optional(),
        isPublic: z.boolean().optional(),
        focalPointX: z.number().min(0).max(100).optional().nullable(),
        focalPointY: z.number().min(0).max(100).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, tags, ...rest } = input;

      const media = await ctx.db.media.findUnique({
        where: { id },
        select: { uploadedById: true },
      });

      if (!media) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Media not found",
        });
      }

      const canEditMedia =
        (await userHasPermission(
          ctx.session.user.id,
          PERMISSIONS.MEDIA_EDIT,
          ctx.permissionCache,
        )) ||
        (await userHasPermission(
          ctx.session.user.id,
          PERMISSIONS.MEDIA_APPROVE,
          ctx.permissionCache,
        ));
      const canEdit =
        media.uploadedById === ctx.session.user.id || canEditMedia;

      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      return await ctx.db.media.update({
        where: { id },
        data: {
          ...rest,
          name: rest.name?.trim(),
          alt: emptyToNull(rest.alt),
          caption: emptyToNull(rest.caption),
          title: emptyToNull(rest.title),
          copyright: emptyToNull(rest.copyright),
          creator: emptyToNull(rest.creator),
          folder: emptyToNull(rest.folder),
          // Ein leeres Array ist „keine Tags“ und damit ebenfalls NULL —
          // sonst bliebe `[]` als Wert stehen, den keine Ansicht unterscheidet.
          ...(tags !== undefined && {
            tags: tags && tags.length > 0 ? tags : Prisma.DbNull,
          }),
        },
      });
    }),

  replaceFile: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        url: uploadPathSchema,
        path: uploadPathSchema,
        filename: z.string().max(255),
        size: z.number().min(0).max(100000000),
        mimeType: z.string().max(100),
        extension: z.string().max(10),
        width: z.number().min(0).max(50000).optional(),
        height: z.number().min(0).max(50000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const media = await ctx.db.media.findUnique({
        where: { id: input.id },
        select: { path: true, filename: true, uploadedById: true },
      });

      if (!media) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Media not found",
        });
      }

      const canEditMedia =
        (await userHasPermission(
          ctx.session.user.id,
          PERMISSIONS.MEDIA_EDIT,
          ctx.permissionCache,
        )) ||
        (await userHasPermission(
          ctx.session.user.id,
          PERMISSIONS.MEDIA_APPROVE,
          ctx.permissionCache,
        ));
      const canEdit =
        media.uploadedById === ctx.session.user.id || canEditMedia;

      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      await unlinkMediaFile(media.path);

      return await ctx.db.media.update({
        where: { id: input.id },
        data: {
          url: input.url,
          path: input.path,
          filename: input.filename,
          size: input.size,
          mimeType: input.mimeType,
          extension: input.extension,
          width: input.width ?? null,
          height: input.height ?? null,
          focalPointX: null,
          focalPointY: null,
        },
      });
    }),

  /**
   * Wo ein Medium verwendet wird — Grundlage für die Warnung im Löschdialog.
   *
   * Zwei Beziehungen stehen auf `onDelete: Cascade`: mit dem Bild verschwindet
   * das ganze Bläserheft bzw. die Karussell-Folie. Das ist im Dialog nicht
   * dasselbe wie „ein Beitrag verliert sein Titelbild“ und deshalb als
   * `cascade` markiert.
   */
  getUsage: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const media = await ctx.db.media.findUnique({
        where: { id: input.id },
        include: {
          usersProfile: { select: { id: true, displayName: true } },
          eventsCover: { select: { id: true, title: true } },
          postsCover: { select: { id: true, title: true } },
          courseImages: { select: { id: true, title: true } },
          ensembleImages: { select: { id: true, name: true } },
          auswahlChorImages: { select: { id: true, name: true } },
          teamMemberImages: { select: { id: true, name: true } },
          bezirkPersonImages: { select: { id: true, name: true } },
          vorstandMemberImages: { select: { id: true, name: true } },
          posaunenratMemberImages: { select: { id: true, name: true } },
          foerdervereinMemberImgs: { select: { id: true, name: true } },
          posaunenwartImages: { select: { id: true, name: true } },
          historyEventImages: { select: { id: true, title: true } },
          blaeserheftImages: { select: { id: true, title: true, year: true } },
          homepageCarouselItems: { select: { id: true, title: true } },
        },
      });

      if (!media) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Media not found" });
      }

      const usages: {
        kind: string;
        label: string;
        href?: string;
        cascade: boolean;
      }[] = [
        ...media.blaeserheftImages.map((entry) => ({
          kind: "Bläserheft",
          label: `${entry.title} (${entry.year})`,
          href: `/dashboard/blaeserhefte`,
          cascade: true,
        })),
        ...media.homepageCarouselItems.map((entry) => ({
          kind: "Startseiten-Karussell",
          label: entry.title ?? "Folie ohne Titel",
          href: `/dashboard/homepage`,
          cascade: true,
        })),
        ...media.postsCover.map((entry) => ({
          kind: "Beitrag",
          label: entry.title,
          href: `/dashboard/posts/${entry.id}/edit`,
          cascade: false,
        })),
        ...media.eventsCover.map((entry) => ({
          kind: "Termin",
          label: entry.title,
          href: `/dashboard/events/${entry.id}/edit`,
          cascade: false,
        })),
        ...media.courseImages.map((entry) => ({
          kind: "Kurs",
          label: entry.title,
          href: `/dashboard/courses/${entry.id}/edit`,
          cascade: false,
        })),
        ...media.historyEventImages.map((entry) => ({
          kind: "Chronik",
          label: entry.title,
          href: `/dashboard/history-timeline`,
          cascade: false,
        })),
        ...media.ensembleImages.map((entry) => ({
          kind: "Ensemble",
          label: entry.name,
          href: `/dashboard/ensembles`,
          cascade: false,
        })),
        ...media.auswahlChorImages.map((entry) => ({
          kind: "Auswahlchor",
          label: entry.name,
          href: `/dashboard/auswahlchoere`,
          cascade: false,
        })),
        ...media.usersProfile.map((entry) => ({
          kind: "Profilbild",
          label: entry.displayName ?? "Ohne Namen",
          href: `/dashboard/users`,
          cascade: false,
        })),
        ...media.teamMemberImages.map((entry) => ({
          kind: "Team",
          label: entry.name ?? "Ohne Namen",
          href: `/dashboard/team`,
          cascade: false,
        })),
        ...media.vorstandMemberImages.map((entry) => ({
          kind: "Vorstand",
          label: entry.name ?? "Ohne Namen",
          href: `/dashboard/vorstand`,
          cascade: false,
        })),
        ...media.posaunenratMemberImages.map((entry) => ({
          kind: "Posaunenrat",
          label: entry.name ?? "Ohne Namen",
          href: `/dashboard/posaunenrat`,
          cascade: false,
        })),
        ...media.foerdervereinMemberImgs.map((entry) => ({
          kind: "Förderverein",
          label: entry.name ?? "Ohne Namen",
          href: `/dashboard/foerderverein`,
          cascade: false,
        })),
        ...media.posaunenwartImages.map((entry) => ({
          kind: "Posaunenwart:in",
          label: entry.name ?? "Ohne Namen",
          href: `/dashboard/posaunenwarte`,
          cascade: false,
        })),
        ...media.bezirkPersonImages.map((entry) => ({
          kind: "Bezirksperson",
          label: entry.name ?? "Ohne Namen",
          href: `/dashboard/bezirke`,
          cascade: false,
        })),
      ];

      return {
        usages,
        total: usages.length,
        cascadeCount: usages.filter((usage) => usage.cascade).length,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const media = await ctx.db.media.findUnique({
        where: { id: input.id },
        select: { uploadedById: true, path: true },
      });

      if (!media) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Media not found",
        });
      }

      const canDeleteMedia = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.MEDIA_DELETE,
        ctx.permissionCache,
      );
      const canDelete =
        media.uploadedById === ctx.session.user.id || canDeleteMedia;

      if (!canDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      await ctx.db.media.delete({
        where: { id: input.id },
      });
      // Erst nach dem erfolgreichen Löschen des Datensatzes: schlägt der fehl
      // (z. B. wegen einer Beziehung), soll die Datei noch da sein.
      await unlinkMediaFile(media.path);

      return { success: true };
    }),

  /** Mehrfachauswahl aus der Übersicht — eine Bestätigung statt zwanzig. */
  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const canDeleteMedia = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.MEDIA_DELETE,
        ctx.permissionCache,
      );

      const items = await ctx.db.media.findMany({
        where: { id: { in: input.ids } },
        select: { id: true, path: true, uploadedById: true },
      });

      const deletable = items.filter(
        (item) => canDeleteMedia || item.uploadedById === ctx.session.user.id,
      );

      if (deletable.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      await ctx.db.media.deleteMany({
        where: { id: { in: deletable.map((item) => item.id) } },
      });
      await Promise.all(deletable.map((item) => unlinkMediaFile(item.path)));

      return {
        deleted: deletable.length,
        skipped: input.ids.length - deletable.length,
      };
    }),

  bulkReview: permissionProcedure(PERMISSIONS.MEDIA_APPROVE)
    .input(
      z.object({
        ids: z.array(z.string()).min(1).max(200),
        status: z.enum([ContentStatus.APPROVED, ContentStatus.REJECTED]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.media.updateMany({
        where: { id: { in: input.ids } },
        data: { status: input.status },
      });
      return { updated: result.count };
    }),

  bulkSetPublic: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1).max(200),
        isPublic: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const canEditMedia =
        (await userHasPermission(
          ctx.session.user.id,
          PERMISSIONS.MEDIA_EDIT,
          ctx.permissionCache,
        )) ||
        (await userHasPermission(
          ctx.session.user.id,
          PERMISSIONS.MEDIA_APPROVE,
          ctx.permissionCache,
        ));

      const result = await ctx.db.media.updateMany({
        where: {
          id: { in: input.ids },
          ...(canEditMedia ? {} : { uploadedById: ctx.session.user.id }),
        },
        data: { isPublic: input.isPublic },
      });
      return { updated: result.count };
    }),

  review: permissionProcedure(PERMISSIONS.MEDIA_APPROVE)
    .input(
      z.object({
        id: z.string(),
        status: z.enum([ContentStatus.APPROVED, ContentStatus.REJECTED]),
        reviewNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const media = await ctx.db.media.findUnique({
        where: { id: input.id },
      });

      if (!media) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Media not found",
        });
      }

      return await ctx.db.media.update({
        where: { id: input.id },
        data: {
          status: input.status,
          reviewNotes: input.reviewNotes,
        },
      });
    }),

  getByFolder: protectedProcedure
    .input(
      z.object({
        folder: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = { folder: input.folder };

      const [media, total] = await Promise.all([
        ctx.db.media.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.media.count({ where }),
      ]);

      return {
        media,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  getFolders: protectedProcedure.query(async ({ ctx }) => {
    const folders = await ctx.db.media.findMany({
      where: {
        folder: { not: null, notIn: ["profiles"] },
      },
      select: {
        folder: true,
      },
      distinct: ["folder"],
      orderBy: { folder: "asc" },
    });

    return folders.map((f) => f.folder).filter((f): f is string => f !== null);
  }),

  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    const [
      totalMedia,
      totalSize,
      imageCount,
      documentCount,
      videoCount,
      userUploads,
      pendingCount,
      missingAltCount,
    ] = await Promise.all([
      // Überall `NON_PROFILE_MEDIA`: die Übersicht blendet Profilbilder aus,
      // also darf die Statistik sie auch nicht mitzählen.
      ctx.db.media.count({ where: NON_PROFILE_MEDIA }),
      ctx.db.media.aggregate({
        where: NON_PROFILE_MEDIA,
        _sum: { size: true },
      }),
      ctx.db.media.count({
        where: { ...NON_PROFILE_MEDIA, mimeType: { startsWith: "image/" } },
      }),
      ctx.db.media.count({
        where: {
          ...NON_PROFILE_MEDIA,
          OR: [
            { mimeType: { startsWith: "application/" } },
            { mimeType: { startsWith: "text/" } },
          ],
        },
      }),
      ctx.db.media.count({
        where: { ...NON_PROFILE_MEDIA, mimeType: { startsWith: "video/" } },
      }),
      ctx.db.media.count({
        where: { ...NON_PROFILE_MEDIA, uploadedById: ctx.session.user.id },
      }),
      ctx.db.media.count({
        where: { ...NON_PROFILE_MEDIA, status: ContentStatus.PENDING },
      }),
      ctx.db.media.count({
        where: {
          ...NON_PROFILE_MEDIA,
          mimeType: { startsWith: "image/" },
          OR: [{ alt: null }, { alt: "" }],
        },
      }),
    ]);

    return {
      totalMedia,
      totalSize: totalSize._sum.size ?? 0,
      imageCount,
      documentCount,
      videoCount,
      userUploads,
      pendingCount,
      missingAltCount,
    };
  }),

  exportMedia: permissionProcedure(PERMISSIONS.DATA_EXPORT).query(
    async ({ ctx }) => {
      const media = await ctx.db.media.findMany({
        include: {
          uploadedBy: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        media: media.map((item) => ({
          ...item,
          uploadedByEmail: item.uploadedBy?.email,
        })),
        exportedAt: new Date().toISOString(),
        count: media.length,
      };
    },
  ),

  importMedia: permissionProcedure(PERMISSIONS.DATA_IMPORT)
    .input(
      z.object({
        media: z.array(
          z.object({
            name: z.string(),
            filename: z.string(),
            url: z.string(),
            path: z.string(),
            mimeType: z.string(),
            size: z.number(),
            extension: z.string(),
            width: z.number().optional().nullable(),
            height: z.number().optional().nullable(),
            alt: z.string().optional().nullable(),
            caption: z.string().optional().nullable(),
            title: z.string().optional().nullable(),
            copyright: z.string().optional().nullable(),
            creator: z.string().optional().nullable(),
            folder: z.string().optional().nullable(),
            tags: z.any().optional(),
            isPublic: z.boolean().optional(),
            status: z.enum(ContentStatus).optional(),
            originalId: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.media.map(async (mediaData) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { originalId, ...data } = mediaData;
          return await ctx.db.media.create({
            data: {
              ...data,
              status: data.status ?? ContentStatus.APPROVED,
              isPublic: data.isPublic ?? true,
              uploadedById: ctx.session.user.id,
            },
          });
        }),
      );

      return {
        success: true,
        importedCount: results.length,
        media: results,
      };
    }),
});
