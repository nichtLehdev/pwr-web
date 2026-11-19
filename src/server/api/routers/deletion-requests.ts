import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  resolveUserPermissionsCached,
  type PermissionCache,
} from "../helpers/permissions";
import { resolveDistrictScope } from "../helpers/district-scope";
import { logAudit } from "../helpers/audit";
import {
  createNotification,
  notifyUsersWithPermission,
} from "../helpers/notifications";
import {
  DELETION_CONTENT,
  loadDeletableContent,
} from "../helpers/deletion-requests";
import {
  DELETION_CONTENT_LABELS,
  DELETION_REASON_MAX_LENGTH,
  deletionRequestAccess,
  type DeletionContentType,
} from "@/lib/deletion-request";
import type { db as database } from "@/server/db";

const contentTypeSchema = z.enum(["post", "event", "course"]);

async function resolveAccess(
  db: typeof database,
  userId: string,
  contentType: DeletionContentType,
  contentId: string,
  permissionCache: PermissionCache,
) {
  const content = await loadDeletableContent(db, contentType, contentId);
  if (!content) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Nicht gefunden" });
  }
  const config = DELETION_CONTENT[contentType];
  const [perms, scope] = await Promise.all([
    resolveUserPermissionsCached(userId, permissionCache),
    resolveDistrictScope(db, userId, config.resource, permissionCache),
  ]);
  const access = deletionRequestAccess({
    isOwner: content.createdById === userId,
    hasDeletePermission: perms.has(config.deletePermission),
    hasViewPermission: perms.has(config.viewPermission),
    scope,
    bezirkId: content.bezirkId,
  });
  return { content, ...access, canDecide: perms.has(config.deletePermission) };
}

function findOpenRequest(
  db: typeof database,
  contentType: DeletionContentType,
  contentId: string,
) {
  return db.contentDeletionRequest.findFirst({
    where: { contentType, contentId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });
}

export const deletionRequestsRouter = createTRPCRouter({
  /** Stand für die Detailseite: offener Antrag und was der Viewer damit tun darf. */
  forContent: protectedProcedure
    .input(z.object({ contentType: contentTypeSchema, contentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const access = await resolveAccess(
        ctx.db,
        ctx.session.user.id,
        input.contentType,
        input.contentId,
        ctx.permissionCache,
      );
      const visible = access.canRequest || access.canDecide;
      const open = visible
        ? await findOpenRequest(ctx.db, input.contentType, input.contentId)
        : null;
      const requester = open?.requestedById
        ? await ctx.db.user.findUnique({
            where: { id: open.requestedById },
            select: { displayName: true },
          })
        : null;

      return {
        canRequest: access.canRequest,
        canDecide: access.canDecide,
        openRequest: open
          ? {
              id: open.id,
              reason: open.reason,
              createdAt: open.createdAt,
              requesterName: requester?.displayName ?? null,
              isMine: open.requestedById === ctx.session.user.id,
            }
          : null,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        contentType: contentTypeSchema,
        contentId: z.string(),
        reason: z.string().trim().min(1).max(DELETION_REASON_MAX_LENGTH),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const access = await resolveAccess(
        ctx.db,
        userId,
        input.contentType,
        input.contentId,
        ctx.permissionCache,
      );
      if (!access.canRequest) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: access.canDelete
            ? "Du kannst diesen Inhalt selbst löschen."
            : "Du kannst nur für Inhalte aus deinem Bezirk die Löschung beantragen.",
        });
      }
      if (await findOpenRequest(ctx.db, input.contentType, input.contentId)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Für diesen Inhalt ist bereits eine Löschung beantragt.",
        });
      }

      const request = await ctx.db.contentDeletionRequest.create({
        data: {
          contentType: input.contentType,
          contentId: input.contentId,
          contentTitle: access.content.title,
          reason: input.reason,
          requestedById: userId,
        },
      });

      void logAudit(ctx.db, {
        actorId: userId,
        action: `${input.contentType}.deletion_request`,
        entityType: input.contentType,
        entityId: input.contentId,
        details: { title: access.content.title, reason: input.reason },
      });

      const config = DELETION_CONTENT[input.contentType];
      await notifyUsersWithPermission(
        ctx.db,
        config.deletePermission,
        {
          type: "deletion_request.submitted",
          title: `Löschung beantragt: ${DELETION_CONTENT_LABELS[input.contentType]} „${access.content.title}"`,
          body: input.reason,
          url: `${config.dashboardPath}/${input.contentId}`,
        },
        userId,
      );

      return { id: request.id };
    }),

  decline: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        note: z.string().trim().min(1).max(DELETION_REASON_MAX_LENGTH),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const request = await ctx.db.contentDeletionRequest.findUnique({
        where: { id: input.id },
      });
      if (request?.status !== "OPEN") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Kein offener Löschantrag gefunden.",
        });
      }
      const contentType = contentTypeSchema.parse(request.contentType);
      const config = DELETION_CONTENT[contentType];
      const perms = await resolveUserPermissionsCached(
        userId,
        ctx.permissionCache,
      );
      if (!perms.has(config.deletePermission)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Nur wer löschen darf, kann Löschanträge ablehnen.",
        });
      }

      await ctx.db.contentDeletionRequest.update({
        where: { id: request.id },
        data: {
          status: "DECLINED",
          decidedById: userId,
          decisionNote: input.note,
          decidedAt: new Date(),
        },
      });

      void logAudit(ctx.db, {
        actorId: userId,
        action: `${contentType}.deletion_request_decline`,
        entityType: contentType,
        entityId: request.contentId,
        details: { title: request.contentTitle, note: input.note },
      });

      if (request.requestedById && request.requestedById !== userId) {
        await createNotification(ctx.db, request.requestedById, {
          type: "deletion_request.declined",
          title: `Löschantrag abgelehnt: ${DELETION_CONTENT_LABELS[contentType]} „${request.contentTitle}"`,
          body: input.note,
          url: `${config.dashboardPath}/${request.contentId}`,
        });
      }

      return { success: true };
    }),
});
