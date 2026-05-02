import {
  CourseCollaboratorRole,
  type PrismaClient,
} from "~/generated/prisma/client";
import { userHasPermission } from "./permissions";
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
): Promise<boolean> {
  if (course.createdById === userId) return true;

  const canEditGlobally = await userHasPermission(
    userId,
    PERMISSIONS.COURSES_EDIT,
  );
  if (canEditGlobally) return true;

  const organizer = await db.courseCollaborator.findUnique({
    where: {
      courseId_userId: { courseId: course.id, userId },
    },
    select: { role: true },
  });
  if (organizer?.role === CourseCollaboratorRole.ORGANIZER) return true;

  const userBezirk = await db.user.findUnique({
    where: { id: userId },
    select: { bezirkId: true },
  });
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
): Promise<boolean> {
  if (course.createdById === userId) return true;

  const canEdit = await userHasPermission(userId, PERMISSIONS.COURSES_EDIT);
  if (canEdit) return true;

  const canApprove = await userHasPermission(userId, PERMISSIONS.COURSES_APPROVE);
  if (canApprove) return true;

  const organizer = await db.courseCollaborator.findUnique({
    where: {
      courseId_userId: { courseId: course.id, userId },
    },
    select: { role: true },
  });
  if (organizer?.role === CourseCollaboratorRole.ORGANIZER) return true;

  const userBezirk = await db.user.findUnique({
    where: { id: userId },
    select: { bezirkId: true },
  });
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
