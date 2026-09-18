import {
  CourseCollaboratorRole,
  type PrismaClient,
} from "~/generated/prisma/client";
import { PERMISSIONS } from "@/lib/permissions";
import { userHasPermission, type PermissionCache } from "./permissions";

export type CourseAccessRecord = {
  id: string;
  createdById: string | null;
  invoicingEnabled: boolean;
};

export type InvoiceAccess = {
  canManage: boolean;
  /** Holds invoices.generate, i.e. may work on any course's invoices. */
  hasGlobalGrant: boolean;
};

/**
 * Who may invoice a course: organizers (creator or ORGANIZER) and holders of invoices.generate.
 * STAFF collaborators and `courses.enable_invoicing` deliberately do not suffice.
 */
export async function resolveInvoiceAccess(
  db: PrismaClient,
  userId: string,
  course: CourseAccessRecord,
  permissionCache?: PermissionCache,
): Promise<InvoiceAccess> {
  const [hasGlobalGrant, collaborator] = await Promise.all([
    userHasPermission(userId, PERMISSIONS.INVOICES_GENERATE, permissionCache),
    db.courseCollaborator.findUnique({
      where: { courseId_userId: { courseId: course.id, userId } },
      select: { role: true },
    }),
  ]);

  const isOrganizer =
    course.createdById === userId ||
    collaborator?.role === CourseCollaboratorRole.ORGANIZER;

  return { canManage: hasGlobalGrant || isOrganizer, hasGlobalGrant };
}

/**
 * Ob eine Zahlung verbucht werden darf: Kursverwaltung oder globales Kassenrecht.
 * Guard und Oberfläche fragen beide diese Funktion, damit sie nicht auseinanderdriften.
 */
export async function canBookInvoicePayments(
  access: InvoiceAccess,
  userId: string,
  permissionCache?: PermissionCache,
): Promise<boolean> {
  if (access.canManage) return true;
  return userHasPermission(
    userId,
    PERMISSIONS.REGISTRATIONS_MARK_PAID,
    permissionCache,
  );
}

/**
 * Dieselbe Regel, wenn der Zugriff noch nicht aufgelöst ist — für Aufrufer, die
 * nur den Kurs in der Hand haben (etwa die Anmeldungs-Ansicht).
 */
export async function userCanBookInvoicePayments(
  db: PrismaClient,
  userId: string,
  course: CourseAccessRecord,
  permissionCache?: PermissionCache,
): Promise<boolean> {
  const access = await resolveInvoiceAccess(
    db,
    userId,
    course,
    permissionCache,
  );
  return canBookInvoicePayments(access, userId, permissionCache);
}

/**
 * {@link resolveInvoiceAccess} für eine ganze Kursliste auf einmal, statt einer
 * Collaborator-Abfrage pro Zeile im Rechnungsarchiv.
 */
export async function manageableCourseIds(
  db: PrismaClient,
  userId: string,
  courseIds: string[],
  permissionCache?: PermissionCache,
): Promise<Set<string>> {
  if (courseIds.length === 0) return new Set();

  const hasGlobalGrant = await userHasPermission(
    userId,
    PERMISSIONS.INVOICES_GENERATE,
    permissionCache,
  );
  if (hasGlobalGrant) return new Set(courseIds);

  const [own, collaborations] = await Promise.all([
    db.course.findMany({
      where: { id: { in: courseIds }, createdById: userId },
      select: { id: true },
    }),
    db.courseCollaborator.findMany({
      where: {
        courseId: { in: courseIds },
        userId,
        role: CourseCollaboratorRole.ORGANIZER,
      },
      select: { courseId: true },
    }),
  ]);

  return new Set([
    ...own.map((course) => course.id),
    ...collaborations.map((entry) => entry.courseId),
  ]);
}
