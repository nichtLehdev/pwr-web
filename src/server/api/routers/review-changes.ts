import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { userHasPermission } from "../helpers/permissions";
import { diffReviewFields, loadReviewFields } from "../helpers/review-snapshot";
import { PERMISSIONS } from "@/lib/permissions";

const APPROVE_PERMISSION = {
  post: PERMISSIONS.POSTS_APPROVE,
  event: PERMISSIONS.EVENTS_APPROVE,
  course: PERMISSIONS.COURSES_APPROVE,
} as const;

export const reviewChangesRouter = createTRPCRouter({
  /**
   * What changed since the last review. `snapshot: null` means it was never
   * reviewed with this feature in place — the reviewer has to read it all.
   */
  get: protectedProcedure
    .input(
      z.object({
        contentType: z.enum(["post", "event", "course"]),
        contentId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const allowed = await userHasPermission(
        ctx.session.user.id,
        APPROVE_PERMISSION[input.contentType],
        ctx.permissionCache,
      );
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Keine Berechtigung zur Prüfung",
        });
      }

      const [current, snapshot] = await Promise.all([
        loadReviewFields(ctx.db, input.contentType, input.contentId),
        ctx.db.contentReviewSnapshot.findUnique({
          where: {
            contentType_contentId: {
              contentType: input.contentType,
              contentId: input.contentId,
            },
          },
        }),
      ]);

      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Nicht gefunden" });
      }
      if (!snapshot) return { snapshot: null, changes: [] };

      const reviewer = snapshot.reviewerId
        ? await ctx.db.user.findUnique({
            where: { id: snapshot.reviewerId },
            select: { displayName: true },
          })
        : null;

      return {
        snapshot: {
          status: snapshot.status,
          reviewedAt: snapshot.reviewedAt,
          reviewerName: reviewer?.displayName ?? null,
        },
        changes: diffReviewFields(
          input.contentType,
          snapshot.fields as Record<string, string | string[] | null>,
          current,
        ),
      };
    }),
});
