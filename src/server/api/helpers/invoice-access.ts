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
  /** May create, edit and publish invoices for this course. */
  canManage: boolean;
  /** Holds invoices.generate, i.e. may work on any course's invoices. */
  hasGlobalGrant: boolean;
};

/**
 * Who may invoice a course: its organizers (creator or ORGANIZER collaborator)
 * and holders of invoices.generate (LPW/Admin). Plain STAFF collaborators can
 * see participants but deliberately cannot issue money documents.
 *
 * `courses.enable_invoicing` is not accepted here — deciding *that* a course is
 * billed and *doing* the billing are separate jobs by design.
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
 * Ob an einer Rechnung eine Zahlung verbucht werden darf: die Kursverwaltung
 * selbst darf es, sonst braucht es das globale Kassenrecht.
 *
 * Diese Datei ist die einzige Stelle, an der die Regel steht. Guard und
 * Oberfläche fragen dieselbe Funktion — sonst driften beide auseinander und es
 * entsteht genau der Fall, den niemand meldet: ein Knopf, der 403 wirft, oder
 * eine Berechtigung ohne Knopf.
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
