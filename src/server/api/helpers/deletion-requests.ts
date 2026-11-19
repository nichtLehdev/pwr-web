import type { db as database } from "@/server/db";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import {
  DELETION_CONTENT_LABELS,
  type DeletionContentType,
} from "@/lib/deletion-request";
import type { ContentResource } from "@/lib/district-scope";
import { createNotification } from "./notifications";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Deletion Requests");

type Db = typeof database;

export const DELETION_CONTENT = {
  post: {
    resource: "posts",
    deletePermission: PERMISSIONS.POSTS_DELETE,
    viewPermission: PERMISSIONS.POSTS_VIEW,
    dashboardPath: "/dashboard/posts",
  },
  event: {
    resource: "events",
    deletePermission: PERMISSIONS.EVENTS_DELETE,
    viewPermission: PERMISSIONS.EVENTS_VIEW,
    dashboardPath: "/dashboard/events",
  },
  course: {
    resource: "courses",
    deletePermission: PERMISSIONS.COURSES_DELETE,
    viewPermission: PERMISSIONS.COURSES_VIEW,
    dashboardPath: "/dashboard/courses",
  },
} as const satisfies Record<
  DeletionContentType,
  {
    resource: ContentResource;
    deletePermission: PermissionKey;
    viewPermission: PermissionKey;
    dashboardPath: string;
  }
>;

export async function loadDeletableContent(
  db: Db,
  contentType: DeletionContentType,
  id: string,
): Promise<{
  title: string;
  createdById: string | null;
  bezirkId: string | null;
} | null> {
  const select = { title: true, createdById: true, bezirkId: true } as const;
  switch (contentType) {
    case "post":
      return db.post.findUnique({ where: { id }, select });
    case "event":
      return db.event.findUnique({ where: { id }, select });
    case "course":
      return db.course.findUnique({ where: { id }, select });
  }
}

/**
 * Schließt offene Anträge, sobald der Inhalt weg ist – egal über welchen Löschweg.
 * Fire-and-forget wie die Review-Snapshots: das Löschen selbst ist schon passiert.
 */
export async function resolveDeletionRequests(
  db: Db,
  contentType: DeletionContentType,
  contentIds: string[],
  actorId: string,
): Promise<void> {
  if (contentIds.length === 0) return;
  try {
    const open = await db.contentDeletionRequest.findMany({
      where: { contentType, contentId: { in: contentIds }, status: "OPEN" },
      select: { id: true, requestedById: true, contentTitle: true },
    });
    if (open.length === 0) return;

    await db.contentDeletionRequest.updateMany({
      where: { id: { in: open.map((r) => r.id) } },
      data: { status: "DONE", decidedById: actorId, decidedAt: new Date() },
    });

    const label = DELETION_CONTENT_LABELS[contentType];
    for (const request of open) {
      if (!request.requestedById || request.requestedById === actorId) continue;
      await createNotification(db, request.requestedById, {
        type: "deletion_request.done",
        title: `${label} „${request.contentTitle}" wurde gelöscht`,
        body: "Dein Löschantrag wurde umgesetzt.",
        url: DELETION_CONTENT[contentType].dashboardPath,
      });
    }
  } catch (error) {
    log.error(`Failed to resolve deletion requests (${contentType}):`, error);
  }
}
