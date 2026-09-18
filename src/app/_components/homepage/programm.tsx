"use client";

import { useMemo } from "react";
import Link from "next/link";
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

/** Mehr schieben „Alle Termine“ und „Chor finden“ unter die Falz. */
const MAX_ROWS = 3;

/** Eine Anmeldezeile ist auf dem Telefon so hoch, dass zwei die nächsten Termine verdrängen. */
const MAX_OFFEN = 1;

interface ProgrammProps {
  events: ProgrammeEvent[];
  courses: ProgrammeCourse[];
  isLoading: boolean;
  /** Serverzeit — hält Fristtexte zwischen Server- und Client-Render gleich. */
  now: Date;
}

/** Marke über einer Gruppe; als Überschrift, damit die Gruppen auch für Vorlesegeräte getrennt sind. */
function Gruppenmarke({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={`semi-condensed text-dark dark:text-night-muted mb-1 text-[0.8125rem] font-semibold tracking-[0.08em] uppercase${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
    </h3>
  );
}

/**
 * „Kommende Termine“ in zwei Gruppen: erst offene Anmeldungen (früheste Frist zuerst), dann
 * die nächsten Termine. Marken nur bei zwei Gruppen, sonst liest sich die Liste als eine Datumsreihe.
 */
export default function Programm({
  events,
  courses,
  isLoading,
  now,
}: ProgrammProps) {
  const { offene, andere, weitereOffene } = useMemo(() => {
    const openCourses = courses
      .filter((course) => isRegistrationOpen(course, now))
      .sort(
        (a, b) =>
          deadlineSortKey(a) - deadlineSortKey(b) ||
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
    const openIds = new Set(openCourses.map((course) => course.id));

    const rest = [
      ...events.map(eventEntry),
      ...courses
        .filter((course) => !openIds.has(course.id))
        .map((course) => courseEntry(course, now)),
    ].sort((a, b) => a.start.getTime() - b.start.getTime());

    const offeneZeilen = rest.length > 0 ? MAX_OFFEN : MAX_ROWS;
    const offene = openCourses
      .slice(0, offeneZeilen)
      .map((course) => courseEntry(course, now));

    return {
      offene,
      andere: rest.slice(0, MAX_ROWS - offene.length),
      weitereOffene: openCourses.length - offene.length,
    };
  }, [events, courses, now]);

  const zweiGruppen = offene.length > 0 && andere.length > 0;

  return (
    <section
      aria-labelledby="programm-heading"
      className="bg-paper dark:bg-night order-2 flex flex-col px-5 pt-10 pb-8 sm:px-10 lg:order-none lg:col-span-5 lg:px-12 lg:pt-10"
    >
      <Heading id="programm-heading" size="programme" rule>
        Kommende Termine
      </Heading>

      {isLoading || !zweiGruppen ? (
        <ProgrammeList
          entries={[...offene, ...andere]}
          now={now}
          isLoading={isLoading}
          fillTo={MAX_ROWS}
        />
      ) : (
        <>
          <Gruppenmarke className="mt-3">Anmeldung läuft</Gruppenmarke>
          <ProgrammeList entries={offene} now={now} titleAs="h4" />
          {weitereOffene > 0 ? (
            <p className="border-rule dark:border-night-rule text-dark dark:text-night-muted border-b px-1 py-3 text-[0.9375rem]">
              {/* `view=list`: im Kalender wären die gefilterten Treffer über Monate verstreut. */}
              <Link
                href="/termine?anmeldung=offen&view=list"
                className="link-ink"
              >
                {/* „Angebote“: unter den Kursen stecken auch Workshops und Freizeiten. */}
                {weitereOffene === 1
                  ? "Ein weiteres Angebot nimmt Anmeldungen an"
                  : `${weitereOffene} weitere Angebote nehmen Anmeldungen an`}
              </Link>
            </p>
          ) : null}

          <Gruppenmarke className="mt-4">Nächste Termine</Gruppenmarke>
          <ProgrammeList
            entries={andere}
            now={now}
            titleAs="h4"
            fillTo={MAX_ROWS - offene.length}
          />
        </>
      )}

      <WayList className="mt-auto lg:mt-4">
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
