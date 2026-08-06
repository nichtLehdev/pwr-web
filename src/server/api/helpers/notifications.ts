import type { db as database } from "@/server/db";
import type { PermissionKey } from "@/lib/permissions";

type Db = typeof database;

export type NotificationPayload = {
  /** e.g. "review.approved", "review.submitted", "registration.new" */
  type: string;
  title: string;
  body?: string | null;
  /** Internal path to open when clicked. */
  url?: string | null;
};

/**
 * Create an in-app notification for one user. Fire-and-forget by design —
 * a notification failure must never fail the triggering mutation.
 */
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
    console.error(`Failed to create notification (${payload.type}):`, error);
  }
}

/**
 * Resolve the users who effectively hold a permission, for fan-out
 * notifications (e.g. "new post awaiting review" → everyone with
 * posts.approve).
 *
 * Covers: direct user grants, roles that carry the permission themselves,
 * and the implicit-all Administrator/Admin role. Deny overrides are
 * respected. Permissions inherited through role *hierarchy* are not
 * resolved here (acceptable for notification fan-out; the permission
 * middleware stays authoritative for access control).
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

/**
 * Notify every user holding a permission — except the actor themselves.
 */
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
    console.error(`Failed to fan out notifications (${payload.type}):`, error);
  }
}
