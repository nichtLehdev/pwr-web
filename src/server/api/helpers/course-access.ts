import {
  CourseCollaboratorRole,
  type PrismaClient,
} from "~/generated/prisma/client";
import {
  resolveUserPermissionsCached,
  type PermissionCache,
} from "./permissions";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import { districtAllowed, districtScopeFor } from "@/lib/district-scope";

/**
 * Wer für einen Bezirk zuständig ist, betreut dessen Kurse mit — auch die von
 * Kollegen.
 *
 * Die Zuständigkeit allein reicht dafür nicht: ohne `courses.create` bliebe der
 * Zuschnitt wirkungslos, und der Eintrag in `UserBezirkScope` würde still zur
 * Mitbearbeitung sämtlicher Kurse des Bezirks führen.
 */
function scopedToCourseBezirk(
  perms: Set<PermissionKey>,
  scopedBezirkIds: string[],
  courseBezirkId: string | null,
): boolean {
  if (!perms.has(PERMISSIONS.COURSES_CREATE)) return false;
  const scope = districtScopeFor(perms, "courses", scopedBezirkIds);
  return districtAllowed(scope, courseBezirkId);
}

/** Volle Kursbearbeitung (Formular, keine Teamverwaltung-Stufe). Kein reines STAFF-Teammitglied. */
export async function userCanEditCourseRecord(
  db: PrismaClient,
  userId: string,
  course: {
    id: string;
    createdById: string | null;
    bezirkId: string | null;
  },
  permissionCache?: PermissionCache,
): Promise<boolean> {
  if (course.createdById === userId) return true;

  const [perms, organizer, scopes] = await Promise.all([
    resolveUserPermissionsCached(userId, permissionCache),
    db.courseCollaborator.findUnique({
      where: {
        courseId_userId: { courseId: course.id, userId },
      },
      select: { role: true },
    }),
    db.userBezirkScope.findMany({
      where: { userId },
      select: { bezirkId: true },
    }),
  ]);

  if (perms.has(PERMISSIONS.COURSES_EDIT)) return true;
  if (organizer?.role === CourseCollaboratorRole.ORGANIZER) return true;
  return scopedToCourseBezirk(
    perms,
    scopes.map((s) => s.bezirkId),
    course.bezirkId,
  );
}

/** Teammitglieder verwalten (Organizer + einladen). */
export async function userCanManageCourseTeam(
  db: PrismaClient,
  userId: string,
  course: {
    id: string;
    createdById: string | null;
    bezirkId: string | null;
  },
  permissionCache?: PermissionCache,
): Promise<boolean> {
  if (course.createdById === userId) return true;

  const [perms, organizer, scopes] = await Promise.all([
    resolveUserPermissionsCached(userId, permissionCache),
    db.courseCollaborator.findUnique({
      where: {
        courseId_userId: { courseId: course.id, userId },
      },
      select: { role: true },
    }),
    db.userBezirkScope.findMany({
      where: { userId },
      select: { bezirkId: true },
    }),
  ]);

  if (
    perms.has(PERMISSIONS.COURSES_EDIT) ||
    perms.has(PERMISSIONS.COURSES_APPROVE)
  ) {
    return true;
  }
  if (organizer?.role === CourseCollaboratorRole.ORGANIZER) return true;
  return scopedToCourseBezirk(
    perms,
    scopes.map((s) => s.bezirkId),
    course.bezirkId,
  );
}

export async function courseCollaboratorRolesForUser(
  db: PrismaClient,
  courseId: string,
  userId: string,
): Promise<{
  hasAnyCollaboration: boolean;
  isOrganizer: boolean;
}> {
  const row = await db.courseCollaborator.findUnique({
    where: {
      courseId_userId: { courseId, userId },
    },
    select: { role: true },
  });
  if (!row)
    return {
      hasAnyCollaboration: false,
      isOrganizer: false,
    };
  return {
    hasAnyCollaboration: true,
    isOrganizer: row.role === CourseCollaboratorRole.ORGANIZER,
  };
}
