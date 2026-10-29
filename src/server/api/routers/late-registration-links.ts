import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  rateLimitedPublicProcedure,
} from "../trpc";
import { userCanManageCourseRegistrations } from "../helpers/course-access";
import { lateRegistrationLinkStateForToken } from "../helpers/late-registration-link";
import { logAudit } from "../helpers/audit";
import { isExternalCourse } from "@/lib/course-external";
import {
  LATE_REGISTRATION_PARAM,
  lateRegistrationLinkExpiry,
  lateRegistrationLinkState,
  MAX_LATE_REGISTRATION_VALID_DAYS,
} from "@/lib/late-registration-link";
import { courseRegistrationPath } from "@/lib/slug";
import { getBaseUrl } from "@/server/utils/get-base-url";
import { createLateRegistrationToken } from "@/server/utils/late-registration-token";
import type { PermissionCache } from "../helpers/permissions";
import type { PrismaClient } from "~/generated/prisma/client";

/** Kursersteller, Kursteam oder `courses.manage_registrations` — wie beim Erfassen von Anmeldungen. */
async function loadManageableCourse(
  ctx: {
    db: PrismaClient;
    session: { user: { id: string } };
    permissionCache: PermissionCache;
  },
  courseId: string,
) {
  const course = await ctx.db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      slug: true,
      title: true,
      endDate: true,
      createdById: true,
      externalProviderName: true,
      externalRegistrationUrl: true,
    },
  });
  if (!course) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Kurs nicht gefunden" });
  }
  const allowed = await userCanManageCourseRegistrations(
    ctx.db,
    ctx.session.user.id,
    course,
    ctx.permissionCache,
  );
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Insufficient permissions",
    });
  }
  return course;
}

export const lateRegistrationLinksRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      await loadManageableCourse(ctx, input.courseId);
      const links = await ctx.db.lateRegistrationLink.findMany({
        where: { courseId: input.courseId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          note: true,
          expiresAt: true,
          createdAt: true,
          usedAt: true,
          revokedAt: true,
          createdBy: { select: { displayName: true } },
          registration: {
            select: {
              id: true,
              registrantFirstName: true,
              registrantLastName: true,
            },
          },
        },
      });
      const now = new Date();
      return links.map((link) => ({
        ...link,
        state: lateRegistrationLinkState(link, now),
      }));
    }),

  /** Der Link steht nur in dieser Antwort: gespeichert wird allein der Hash des Tokens. */
  create: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        note: z.string().trim().max(200).optional(),
        validDays: z
          .number()
          .int()
          .min(1)
          .max(MAX_LATE_REGISTRATION_VALID_DAYS),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await loadManageableCourse(ctx, input.courseId);

      if (isExternalCourse(course)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Dieser Kurs wird über einen externen Anbieter angemeldet.",
        });
      }
      const now = new Date();
      if (course.endDate <= now) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Der Kurs ist bereits vorbei.",
        });
      }

      const { token, tokenHash } = createLateRegistrationToken();
      const link = await ctx.db.lateRegistrationLink.create({
        data: {
          courseId: course.id,
          tokenHash,
          note: input.note || null,
          expiresAt: lateRegistrationLinkExpiry(
            input.validDays,
            course.endDate,
            now,
          ),
          createdById: ctx.session.user.id,
        },
        select: { id: true, expiresAt: true },
      });

      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "course.late_registration_link.create",
        entityType: "course",
        entityId: course.id,
        details: {
          summary: `Nachmeldelink für „${course.title}“ erstellt`,
          linkId: link.id,
          expiresAt: link.expiresAt.toISOString(),
        },
      });

      return {
        id: link.id,
        expiresAt: link.expiresAt,
        url: `${getBaseUrl()}${courseRegistrationPath(course)}?${LATE_REGISTRATION_PARAM}=${encodeURIComponent(token)}`,
      };
    }),

  revoke: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const link = await ctx.db.lateRegistrationLink.findUnique({
        where: { id: input.id },
        select: { id: true, courseId: true },
      });
      if (!link) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Link nicht gefunden",
        });
      }
      const course = await loadManageableCourse(ctx, link.courseId);

      // Bereits benutzte Links bleiben benutzt: die Anmeldung gibt es ja schon.
      const { count } = await ctx.db.lateRegistrationLink.updateMany({
        where: { id: link.id, usedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (count !== 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Der Link wurde bereits benutzt oder zurückgezogen.",
        });
      }

      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "course.late_registration_link.revoke",
        entityType: "course",
        entityId: course.id,
        details: {
          summary: `Nachmeldelink für „${course.title}“ zurückgezogen`,
          linkId: link.id,
        },
      });

      return { success: true };
    }),

  /** Für die Anmeldeseite: ob der Link im Aufruf für diesen Kurs (noch) gilt. */
  check: rateLimitedPublicProcedure("lateRegistrationLinks.check", {
    maxRequests: 60,
    windowMs: 15 * 60 * 1000,
  })
    .input(z.object({ courseId: z.string(), token: z.string().max(200) }))
    .query(async ({ ctx, input }) => {
      const { state } = await lateRegistrationLinkStateForToken(
        ctx.db,
        input.courseId,
        input.token,
      );
      return { state };
    }),
});
