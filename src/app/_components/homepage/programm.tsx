"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";
import { getDistrictColor } from "@/lib/district-color";
import { courseTypeLabel, eventCategoryLabel } from "@/lib/termine-labels";
import { coursePath, courseRegistrationPath, eventPath } from "@/lib/slug";
import {
  deadlineEndOfDay,
  isRegistrationDeadlinePassed,
} from "@/lib/registration-deadline";
import { formatDateRange } from "@/lib/format-date-range";
import { formatAvailableSlots } from "@/lib/format-available-slots";
import { isExternalCourse } from "@/lib/course-external";

type EventItem = RouterOutputs["events"]["getAll"]["events"][number];
type CourseItem = RouterOutputs["courses"]["getAll"]["courses"][number];

type Status = { text: string; tone: "muted" };

type Registration = {
  deadline: string | null;
  urgent: boolean;
  slots: string | null;
  href: string | null;
  external: boolean;
};

type ProgrammRow = {
  key: string;
  href: string;
  kind: string;
  title: string;
  start: Date;
  when: string;
  place: string | null;
  bezirk: { number: number; shortName: string } | null;
  status: Status | null;
  registration: Registration | null;
  cancelled: boolean;
};

/**
 * Zeilen im ersten Bildschirm — mehr schieben „Alle Termine“ und
 * „Chor finden“ auf 1440×900 unter die Falz.
 */
const MAX_ROWS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

const MONTH = new Intl.DateTimeFormat("de-DE", { month: "short" });
const TIME = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});
const DAY_MONTH = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
});
const FULL_DATE = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Gleiche Regel wie die Kursseite: offen, schon geöffnet, Frist nicht vorbei. */
function isRegistrationOpen(course: CourseItem, now: Date): boolean {
  if (!course.registrationOpen) return false;
  const opensAt = course.registrationOpensAt
    ? new Date(course.registrationOpensAt)
    : null;
  if (opensAt && opensAt > now) return false;
  return !isRegistrationDeadlinePassed(course.registrationDeadline, now);
}

/**
 * Fristen werden angekündigt, bevor sie ablaufen: eine Woche vorher nennt die
 * Zeile die verbleibenden Tage statt nur das Datum.
 */
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

function registrationFor(course: CourseItem, now: Date): Registration {
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

function closedStatus(course: CourseItem, now: Date): Status | null {
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

function eventRow(event: EventItem): ProgrammRow {
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

function courseRow(course: CourseItem, now: Date): ProgrammRow {
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

/**
 * Datumsfeld. Bei offener Anmeldung steht das Datum auf einer kleinen orangen
 * Fläche — auch wenn jede Zeile offen ist, bleibt es eine Spalte aus Marken,
 * keine orange Seite.
 */
function DateSlot({
  date,
  now,
  marked,
}: {
  date: Date;
  now: Date;
  marked: boolean;
}) {
  const sameYear = date.getFullYear() === now.getFullYear();
  return (
    <div
      aria-hidden
      className={`flex w-16 shrink-0 flex-col self-start leading-none tabular-nums sm:w-20 ${
        marked ? "bg-primary px-2 pt-2 pb-2.5" : ""
      }`}
    >
      <span
        className={`condensed text-[2.75rem] font-extrabold ${
          marked ? "text-ink" : "text-ink dark:text-night-text"
        }`}
      >
        {String(date.getDate()).padStart(2, "0")}
      </span>
      <span
        className={`semi-condensed mt-1 text-sm font-semibold tracking-[0.06em] uppercase ${
          marked ? "text-ink" : "text-dark dark:text-night-muted"
        }`}
      >
        {MONTH.format(date).replace(".", "")}
        {sameYear ? "" : ` ${date.getFullYear()}`}
      </span>
    </div>
  );
}

function BezirkLabel({ bezirk }: { bezirk: ProgrammRow["bezirk"] }) {
  if (!bezirk) return <span>Bezirksübergreifend</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0"
        style={{ backgroundColor: getDistrictColor(bezirk.number) }}
      />
      <span>
        Bezirk {String(bezirk.number).padStart(2, "0")} · {bezirk.shortName}
      </span>
    </span>
  );
}

const REGISTER_CLASS =
  "semi-condensed border-ink text-ink hover:bg-paper dark:border-night-text dark:text-night-text relative z-10 mt-3 inline-flex h-10 items-center gap-2 border-2 px-4 text-base font-semibold transition-colors";

function RegistrationLine({ registration }: { registration: Registration }) {
  return (
    <>
      <p className="text-ink dark:text-night-text mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
        <span className="text-primary-ink dark:text-primary">
          Anmeldung offen
        </span>
        {registration.deadline ? (
          <span
            className={
              registration.urgent ? "bg-primary text-ink px-1.5" : undefined
            }
          >
            {registration.deadline}
          </span>
        ) : null}
        {registration.slots ? <span>{registration.slots}</span> : null}
      </p>
      {registration.href ? (
        registration.external ? (
          <a
            href={registration.href}
            target="_blank"
            rel="noopener noreferrer"
            className={REGISTER_CLASS}
          >
            Anmelden
            <ArrowUpRight className="h-4 w-4" aria-hidden />
            <span className="sr-only"> (öffnet eine externe Website)</span>
          </a>
        ) : (
          <Link href={registration.href} className={REGISTER_CLASS}>
            Anmelden
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )
      ) : null}
    </>
  );
}

function Row({ row, now }: { row: ProgrammRow; now: Date }) {
  return (
    <li className="fill-row border-rule dark:border-night-rule border-b">
      <div className="relative flex gap-4 px-1 py-4 sm:gap-6">
        <DateSlot date={row.start} now={now} marked={!!row.registration} />
        <div className="min-w-0 flex-1">
          <h3
            className={`condensed text-[1.5rem] leading-[1.1] font-bold ${
              row.cancelled
                ? "text-dark dark:text-night-muted line-through"
                : "text-ink dark:text-night-text"
            }`}
          >
            <Link
              href={row.href}
              className="after:absolute after:inset-0 after:content-['']"
            >
              <span className="sr-only">{FULL_DATE.format(row.start)}: </span>
              {row.title}
            </Link>
          </h3>
          <p className="semi-condensed text-dark dark:text-night-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
            <span>{row.kind}</span>
            <BezirkLabel bezirk={row.bezirk} />
          </p>
          <p className="text-dark dark:text-night-muted mt-1 text-[0.9375rem]">
            {row.when}
            {row.place ? ` · ${row.place}` : ""}
          </p>
          {row.cancelled ? (
            <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-400">
              Abgesagt
            </p>
          ) : row.registration ? (
            <RegistrationLine registration={row.registration} />
          ) : row.status ? (
            <p className="text-dark dark:text-night-muted mt-2 text-sm">
              {row.status.text}
            </p>
          ) : null}
        </div>
        <ArrowRight
          aria-hidden
          className="text-ink dark:text-night-text mt-1 h-5 w-5 shrink-0"
        />
      </div>
    </li>
  );
}

function WayRow({ href, label }: { href: string; label: string }) {
  return (
    <li className="fill-row border-rule dark:border-night-rule border-b">
      <Link
        href={href}
        className="condensed text-ink dark:text-night-text flex min-h-14 items-center justify-between gap-4 px-1 text-[1.375rem] font-bold"
      >
        {label}
        <ArrowRight aria-hidden className="h-5 w-5 shrink-0" />
      </Link>
    </li>
  );
}

function deadlineSortKey(course: CourseItem): number {
  return course.registrationDeadline
    ? new Date(course.registrationDeadline).getTime()
    : Number.POSITIVE_INFINITY;
}

interface ProgrammProps {
  events: EventItem[];
  courses: CourseItem[];
  isLoading: boolean;
  /** Serverzeit — hält Fristtexte zwischen Server- und Client-Render gleich. */
  now: Date;
}

/**
 * „Kommende Termine“ als Programm. Kurse mit offener Anmeldung stehen vorn
 * (früheste Frist zuerst), markiert durch ihr oranges Datumsfeld und eine
 * Anmelde-Schaltfläche; gibt es andere Termine, bleibt mindestens einer davon
 * im ersten Bildschirm.
 */
export default function Programm({
  events,
  courses,
  isLoading,
  now,
}: ProgrammProps) {
  const rows = useMemo(() => {
    const openCourses = courses
      .filter((course) => isRegistrationOpen(course, now))
      .sort(
        (a, b) =>
          deadlineSortKey(a) - deadlineSortKey(b) ||
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
    const openIds = new Set(openCourses.map((course) => course.id));

    const others = [
      ...events.map(eventRow),
      ...courses
        .filter((course) => !openIds.has(course.id))
        .map((course) => courseRow(course, now)),
    ].sort((a, b) => a.start.getTime() - b.start.getTime());

    const openSlots = others.length > 0 ? MAX_ROWS - 1 : MAX_ROWS;
    return [
      ...openCourses
        .slice(0, openSlots)
        .map((course) => courseRow(course, now)),
      ...others,
    ].slice(0, MAX_ROWS);
  }, [events, courses, now]);

  return (
    <section
      aria-labelledby="programm-heading"
      className="bg-paper dark:bg-night order-2 flex flex-col px-5 pt-10 pb-8 sm:px-10 lg:order-none lg:col-span-5 lg:px-12 lg:pt-10"
    >
      <h2
        id="programm-heading"
        className="condensed text-ink dark:text-night-text border-ink dark:border-night-text border-b-2 pb-3 text-[2.25rem] leading-none font-extrabold"
      >
        Kommende Termine
      </h2>

      {isLoading ? (
        <ol aria-busy="true" aria-label="Termine werden geladen">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="border-rule dark:border-night-rule flex gap-6 border-b px-1 py-5"
            >
              <span className="bg-rule dark:bg-night-rule h-10 w-14" />
              <span className="flex flex-1 flex-col gap-2">
                <span className="bg-rule dark:bg-night-rule h-5 w-4/5" />
                <span className="bg-rule dark:bg-night-rule h-3 w-1/3" />
                <span className="bg-rule dark:bg-night-rule h-3 w-1/2" />
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <ol>
          {rows.map((row) => (
            <Row key={row.key} row={row} now={now} />
          ))}
          {rows.length < MAX_ROWS && (
            <li className="border-rule dark:border-night-rule flex items-center gap-4 border-b px-1 py-5 sm:gap-6">
              <span aria-hidden className="flex w-16 shrink-0 sm:w-20">
                <span className="bg-rule dark:bg-night-rule block h-[3px] w-10" />
              </span>
              <p className="text-dark dark:text-night-muted text-[0.9375rem]">
                Weitere Termine folgen.
              </p>
            </li>
          )}
        </ol>
      )}

      <ul className="border-ink dark:border-night-text mt-auto border-t-2 pt-0 lg:mt-6">
        <WayRow href="/termine" label="Alle Termine" />
        <WayRow href="/mitmachen/chor-finden" label="Chor finden" />
      </ul>
    </section>
  );
}
