import { ContentStatus } from "~/generated/prisma/enums";

/**
 * Anmeldungen (öffentlich, vom Kursteam erfasst oder per Nachmeldelink) gibt es
 * erst für freigegebene Kurse. Vorher ist der Kurs öffentlich nicht sichtbar,
 * und Angaben wie Preise können sich in der Prüfung noch ändern.
 */
export function isCoursePublished(course: { status: ContentStatus }): boolean {
  return course.status === ContentStatus.APPROVED;
}

export const COURSE_NOT_PUBLISHED_MESSAGE =
  "Der Kurs ist noch nicht veröffentlicht. Anmeldungen und Nachmeldelinks gibt es erst nach der Freigabe.";
