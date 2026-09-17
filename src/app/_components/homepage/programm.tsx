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

/**
 * Zeilen im ersten Bildschirm — mehr schieben „Alle Termine“ und
 * „Chor finden“ auf 1440×900 unter die Falz.
 */
const MAX_ROWS = 3;

/**
 * Zeilen für die Anmeldungen. Eine, weil eine Anmeldezeile mit Frist und
 * Schaltfläche auf 390px 309px hoch ist: Zwei davon füllen den Bildschirm des
 * Telefons, und von den eigentlichen nächsten Terminen bliebe nichts übrig.
 */
const MAX_OFFEN = 1;

interface ProgrammProps {
  events: ProgrammeEvent[];
  courses: ProgrammeCourse[];
  isLoading: boolean;
  /** Serverzeit — hält Fristtexte zwischen Server- und Client-Render gleich. */
  now: Date;
}

/**
 * Marke über einer Gruppe: leiser als die Abschnittsüberschrift, im Ton der
 * Monatszeile im Datumsfeld. Als Überschrift und nicht als Absatz, damit die
 * Gruppen auch für Vorlesegeräte zwei Gruppen sind.
 */
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
 * „Kommende Termine“ als Programm, in zwei Gruppen: erst Kurse mit offener
 * Anmeldung (früheste Frist zuerst), dann die nächsten Termine nach Datum.
 *
 * Die Gruppen tragen eigene Marken, weil die Liste sonst als eine einzige
 * Reihe nach Datum gelesen wird und dann falsch aussieht: Auf dem Telefon
 * stand hier „29. Okt – 02. Okt – 08. Okt“, und weil die erste Zeile mit
 * Anmelde-Schaltfläche 309px hoch ist, sah man beim ersten Blick nur sie. Das
 * späteste Datum wirkte so wie der nächste Termin.
 *
 * Offen steht nur eine Zeile: Mehr wird zu voll, und die übrigen offenen
 * Anmeldungen führt eine Zeile darunter auf die Terminseite, gefiltert auf
 * offene Anmeldungen.
 *
 * Nur eine Gruppe vorhanden (nichts offen, oder nur Offenes) heißt: keine
 * Marken — dann erklärt die Abschnittsüberschrift die Liste bereits.
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
              <Link href="/termine?anmeldung=offen" className="link-ink">
                {weitereOffene === 1
                  ? "Ein weiterer Lehrgang nimmt Anmeldungen an"
                  : `${weitereOffene} weitere Lehrgänge nehmen Anmeldungen an`}
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
