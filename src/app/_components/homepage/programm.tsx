"use client";

import { useMemo } from "react";
import { Heading } from "@/app/_components/programmheft/section-head";
import { ProgrammeList } from "@/app/_components/programmheft/programme";
import { WayList, WayRow } from "@/app/_components/programmheft/way-list";
import {
  courseEntry,
  deadlineSortKey,
  eventEntry,
  isRegistrationOpen,
  type ProgrammeCourse,
  type ProgrammeEvent,
} from "@/app/_components/programmheft/programme-data";

/**
 * Zeilen im ersten Bildschirm — mehr schieben „Alle Termine“ und
 * „Chor finden“ auf 1440×900 unter die Falz.
 */
const MAX_ROWS = 3;

interface ProgrammProps {
  events: ProgrammeEvent[];
  courses: ProgrammeCourse[];
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
  const entries = useMemo(() => {
    const openCourses = courses
      .filter((course) => isRegistrationOpen(course, now))
      .sort(
        (a, b) =>
          deadlineSortKey(a) - deadlineSortKey(b) ||
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
    const openIds = new Set(openCourses.map((course) => course.id));

    const others = [
      ...events.map(eventEntry),
      ...courses
        .filter((course) => !openIds.has(course.id))
        .map((course) => courseEntry(course, now)),
    ].sort((a, b) => a.start.getTime() - b.start.getTime());

    const openSlots = others.length > 0 ? MAX_ROWS - 1 : MAX_ROWS;
    return [
      ...openCourses
        .slice(0, openSlots)
        .map((course) => courseEntry(course, now)),
      ...others,
    ].slice(0, MAX_ROWS);
  }, [events, courses, now]);

  return (
    <section
      aria-labelledby="programm-heading"
      className="bg-paper dark:bg-night order-2 flex flex-col px-5 pt-10 pb-8 sm:px-10 lg:order-none lg:col-span-5 lg:px-12 lg:pt-10"
    >
      <Heading id="programm-heading" size="programme" rule>
        Kommende Termine
      </Heading>

      <ProgrammeList
        entries={entries}
        now={now}
        isLoading={isLoading}
        fillTo={MAX_ROWS}
      />

      <WayList className="mt-auto lg:mt-6">
        <WayRow href="/termine" title="Alle Termine" size="compact" />
        <WayRow
          href="/mitmachen/chor-finden"
          title="Chor finden"
          size="compact"
        />
      </WayList>
    </section>
  );
}
