import type { RouterOutputs } from "@/trpc/react";
import { courseTypeLabel, eventCategoryLabel } from "@/lib/termine-labels";
import { coursePath, courseRegistrationPath, eventPath } from "@/lib/slug";
import {
  deadlineEndOfDay,
  isRegistrationDeadlinePassed,
} from "@/lib/registration-deadline";
import { formatDateRange } from "@/lib/format-date-range";
import { formatAvailableSlots } from "@/lib/format-available-slots";
import { isExternalCourse } from "@/lib/course-external";
import { berlinFormatter } from "@/lib/berlin-time";

export type ProgrammeEvent =
  RouterOutputs["events"]["getAll"]["events"][number];
export type ProgrammeCourse =
  RouterOutputs["courses"]["getAll"]["courses"][number];

export type ProgrammeStatus = { text: string; tone: "muted" };

export type ProgrammeRegistration = {
  deadline: string | null;
  urgent: boolean;
  slots: string | null;
  href: string | null;
  external: boolean;
};

/** Eine Programmzeile: Termin oder Kurs, fertig formatiert. */
export type ProgrammeEntry = {
  key: string;
  href: string;
  kind: string;
  title: string;
  start: Date;
  when: string;
  place: string | null;
  bezirk: { number: number; shortName: string } | null;
  status: ProgrammeStatus | null;
  registration: ProgrammeRegistration | null;
  cancelled: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Berliner Zeit: Die Programmzeilen rendern zuerst auf dem Server (UTC).
const TIME = berlinFormatter("uhrzeit");
const DAY_MONTH = berlinFormatter("tagMonat");

/** Gleiche Regel wie die Kursseite: offen, schon geöffnet, Frist nicht vorbei. */
export function isRegistrationOpen(
  course: ProgrammeCourse,
  now: Date,
): boolean {
  if (!course.registrationOpen) return false;
  const opensAt = course.registrationOpensAt
    ? new Date(course.registrationOpensAt)
    : null;
  if (opensAt && opensAt > now) return false;
  return !isRegistrationDeadlinePassed(course.registrationDeadline, now);
}

/** Ab einer Woche vor Fristende nennt die Zeile die verbleibenden Tage. */
function deadlineText(
  deadline: Date,
  now: Date,
): { text: string; urgent: boolean } {
  const days = Math.floor(
    (deadlineEndOfDay(deadline).getTime() - now.getTime()) / DAY_MS,
  );
  if (days <= 0) return { text: "Anmeldung endet heute", urgent: true };
  if (days <= 7) {
    return {
      text: `Anmeldung endet in ${days} ${days === 1 ? "Tag" : "Tagen"}`,
      urgent: true,
    };
  }
  return { text: `bis ${DAY_MONTH.format(deadline)}`, urgent: false };
}

function registrationFor(
  course: ProgrammeCourse,
  now: Date,
): ProgrammeRegistration {
  const deadline = course.registrationDeadline
    ? deadlineText(new Date(course.registrationDeadline), now)
    : null;

  const capacity = course.registrationTotalCapacity;
  const slotsKnown =
    capacity != null && capacity > 0 && course.availableSlots != null;
  const full = slotsKnown && course.availableSlots! <= 0;
  const slots = slotsKnown
    ? full
      ? "Keine Plätze mehr frei"
      : formatAvailableSlots(course.availableSlots!, capacity)
    : null;

  const external = isExternalCourse(course);
  const href =
    full && !course.allowWaitingList
      ? null
      : external
        ? (course.externalRegistrationUrl ?? coursePath(course))
        : courseRegistrationPath(course);

  return {
    deadline: deadline?.text ?? null,
    urgent: deadline?.urgent ?? false,
    slots,
    href,
    external,
  };
}

function closedStatus(
  course: ProgrammeCourse,
  now: Date,
): ProgrammeStatus | null {
  if (isRegistrationDeadlinePassed(course.registrationDeadline, now)) {
    return { text: "Anmeldung geschlossen", tone: "muted" };
  }
  const opensAt = course.registrationOpensAt
    ? new Date(course.registrationOpensAt)
    : null;
  if (course.registrationOpen && opensAt && opensAt > now) {
    return { text: `Anmeldung ab ${DAY_MONTH.format(opensAt)}`, tone: "muted" };
  }
  return null;
}

export function eventEntry(event: ProgrammeEvent): ProgrammeEntry {
  const start = new Date(event.eventDate);
  return {
    key: `event-${event.id}`,
    href: eventPath(event),
    kind: eventCategoryLabel(event.category),
    title: event.title,
    start,
    when: `${TIME.format(start)} Uhr`,
    place: event.location?.city ?? null,
    bezirk: event.bezirk
      ? { number: event.bezirk.number, shortName: event.bezirk.shortName }
      : null,
    status: null,
    registration: null,
    cancelled: event.cancelled,
  };
}

export function courseEntry(
  course: ProgrammeCourse,
  now: Date,
): ProgrammeEntry {
  const start = new Date(course.startDate);
  const place = [course.location?.name, course.location?.city]
    .filter(Boolean)
    .join(", ");
  const open = isRegistrationOpen(course, now);
  return {
    key: `course-${course.id}`,
    href: coursePath(course),
    kind: courseTypeLabel(course.courseType),
    title: course.title,
    start,
    when: formatDateRange(start, new Date(course.endDate)),
    place: place || null,
    bezirk: course.bezirk
      ? { number: course.bezirk.number, shortName: course.bezirk.shortName }
      : null,
    status: open ? null : closedStatus(course, now),
    registration: open ? registrationFor(course, now) : null,
    cancelled: false,
  };
}

export function deadlineSortKey(course: ProgrammeCourse): number {
  return course.registrationDeadline
    ? new Date(course.registrationDeadline).getTime()
    : Number.POSITIVE_INFINITY;
}
