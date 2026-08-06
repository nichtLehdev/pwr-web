import {
  CourseCollaboratorRole,
  type PrismaClient,
} from "~/generated/prisma/client";
import {
  resolveUserPermissionsCached,
  type PermissionCache,
} from "./permissions";
import { PERMISSIONS } from "@/lib/permissions";

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

  const [perms, organizer, userBezirk] = await Promise.all([
    resolveUserPermissionsCached(userId, permissionCache),
    db.courseCollaborator.findUnique({
      where: {
        courseId_userId: { courseId: course.id, userId },
      },
      select: { role: true },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { bezirkId: true },
    }),
  ]);

  if (perms.has(PERMISSIONS.COURSES_EDIT)) return true;
  if (organizer?.role === CourseCollaboratorRole.ORGANIZER) return true;
  if (
    userBezirk?.bezirkId &&
    course.bezirkId &&
    userBezirk.bezirkId === course.bezirkId
  ) {
    return true;
  }

  return false;
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

  const [perms, organizer, userBezirk] = await Promise.all([
    resolveUserPermissionsCached(userId, permissionCache),
    db.courseCollaborator.findUnique({
      where: {
        courseId_userId: { courseId: course.id, userId },
      },
      select: { role: true },
    }),
    db.user.findUnique({
      where: { id: userId },
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
  if (
    userBezirk?.bezirkId &&
    course.bezirkId &&
    userBezirk.bezirkId === course.bezirkId
  ) {
    return true;
  }

  return false;
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
