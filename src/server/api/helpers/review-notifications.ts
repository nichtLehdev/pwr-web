import type { db as database } from "@/server/db";
import { getBaseUrl } from "@/server/utils/get-base-url";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "./audit";
import { createNotification, notifyUsersWithPermission } from "./notifications";

type Db = typeof database;

const DASHBOARD_PATHS = {
  event: "/dashboard/events",
  course: "/dashboard/courses",
  post: "/dashboard/posts",
} as const;

const CONTENT_TYPE_LABELS = {
  event: "Veranstaltung",
  course: "Kurs",
  post: "Beitrag",
} as const;

/**
 * E-mail the creator of a piece of content after it was approved or
 * rejected. Fire-and-forget: review mutations must not fail because SMTP is
 * down. Skips self-reviews (the reviewer already knows) and content without
 * a creator.
 */
export async function notifyCreatorOfReviewResult(params: {
  db: Db;
  contentType: keyof typeof DASHBOARD_PATHS;
  contentId: string;
  title: string;
  createdById: string | null;
  reviewerId: string;
  approved: boolean;
  reviewNotes?: string | null;
}): Promise<void> {
  const { db, contentType, contentId, createdById, reviewerId } = params;

  void logAudit(db, {
    actorId: reviewerId,
    action: params.approved
      ? `${contentType}.approve`
      : `${contentType}.reject`,
    entityType: contentType,
    entityId: contentId,
    details: { title: params.title, reviewNotes: params.reviewNotes ?? null },
  });

  if (!createdById || createdById === reviewerId) return;

  const typeLabel = CONTENT_TYPE_LABELS[contentType];
  await createNotification(db, createdById, {
    type: params.approved ? "review.approved" : "review.rejected",
    title: params.approved
      ? `${typeLabel} „${params.title}" wurde veröffentlicht`
      : `${typeLabel} „${params.title}" wurde abgelehnt`,
    body: params.reviewNotes ?? null,
    url: `${DASHBOARD_PATHS[contentType]}/${contentId}`,
  });

  try {
    const emailService = await import("@/server/email");
    if (!emailService.isEmailConfigured()) return;

    const creator = await db.user.findUnique({
      where: { id: createdById },
      select: { email: true, displayName: true, firstName: true },
    });
    if (!creator?.email) return;

    await emailService.sendContentReviewResultEmail({
      to: creator.email,
      recipientName: creator.firstName ?? creator.displayName ?? "",
      contentType,
      title: params.title,
      approved: params.approved,
      reviewNotes: params.reviewNotes,
      dashboardUrl: `${getBaseUrl()}${DASHBOARD_PATHS[contentType]}/${contentId}`,
    });
  } catch (error) {
    console.error(
      `Failed to send review notification for ${contentType} ${contentId}:`,
      error,
    );
  }
}

const APPROVE_PERMISSIONS = {
  event: PERMISSIONS.EVENTS_APPROVE,
  course: PERMISSIONS.COURSES_APPROVE,
  post: PERMISSIONS.POSTS_APPROVE,
} as const;

/**
 * In-app notification to every reviewer when content lands in PENDING —
 * so pending items no longer have to be discovered by polling the
 * dashboard lists. Fire-and-forget.
 */
export async function notifySubmittedForReview(params: {
  db: Db;
  contentType: keyof typeof DASHBOARD_PATHS;
  contentId: string;
  title: string;
  /** The submitting user — excluded from the fan-out. */
  actorId: string;
}): Promise<void> {
  const { db, contentType, contentId } = params;
  const typeLabel = CONTENT_TYPE_LABELS[contentType];
  await notifyUsersWithPermission(
    db,
    APPROVE_PERMISSIONS[contentType],
    {
      type: "review.submitted",
      title: `${typeLabel} zur Prüfung eingereicht: „${params.title}"`,
      url: `${DASHBOARD_PATHS[contentType]}/${contentId}`,
    },
    params.actorId,
  );
}
