import type { db as database } from "@/server/db";
import type { PermissionKey } from "@/lib/permissions";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Notifications");

type Db = typeof database;

export type NotificationPayload = {
  /** e.g. "review.approved", "review.submitted", "registration.new" */
  type: string;
  title: string;
  body?: string | null;
  /** Internal path to open when clicked. */
  url?: string | null;
};

/** Fire-and-forget: a notification failure must never fail the triggering mutation. */
export async function createNotification(
  db: Db,
  userId: string,
  payload: NotificationPayload,
): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body ?? null,
        url: payload.url ?? null,
      },
    });
  } catch (error) {
    log.error(`Failed to create notification (${payload.type}):`, error);
  }
}

/**
 * Users holding a permission, for notification fan-out only: covers direct grants, roles and
 * the admin role, respects denies, but ignores role hierarchy. Not for access control.
 */
export async function findUserIdsWithPermission(
  db: Db,
  permissionKey: PermissionKey,
): Promise<string[]> {
  const [roleAssignments, directGrants, denies] = await Promise.all([
    db.userRoleAssignment.findMany({
      where: {
        role: {
          OR: [
            { permissions: { some: { permissionKey } } },
            {
              name: {
                in: ["Administrator", "Admin", "admin", "administrator"],
              },
            },
          ],
        },
      },
      select: { userId: true },
    }),
    db.userPermission.findMany({
      where: { permissionKey, granted: true },
      select: { userId: true },
    }),
    db.userPermission.findMany({
      where: { permissionKey, granted: false },
      select: { userId: true },
    }),
  ]);

  const denied = new Set(denies.map((d) => d.userId));
  const userIds = new Set<string>();
  for (const row of [...roleAssignments, ...directGrants]) {
    if (!denied.has(row.userId)) userIds.add(row.userId);
  }
  return [...userIds];
}

/** Notify every user holding a permission, except the actor themselves. */
export async function notifyUsersWithPermission(
  db: Db,
  permissionKey: PermissionKey,
  payload: NotificationPayload,
  excludeUserId?: string,
): Promise<void> {
  try {
    const userIds = await findUserIdsWithPermission(db, permissionKey);
    const recipients = userIds.filter((id) => id !== excludeUserId);
    if (recipients.length === 0) return;

    await db.notification.createMany({
      data: recipients.map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body ?? null,
        url: payload.url ?? null,
      })),
    });
  } catch (error) {
    log.error(`Failed to fan out notifications (${payload.type}):`, error);
  }
}
