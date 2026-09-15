import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { BezirkLabel } from "./bezirk-label";
import type { ProgrammeEntry, ProgrammeRegistration } from "./programme-data";

const MONTH = new Intl.DateTimeFormat("de-DE", { month: "short" });
const FULL_DATE = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Datumsfeld. Bei offener Anmeldung steht das Datum auf einer kleinen orangen
 * Fläche — auch wenn jede Zeile offen ist, bleibt es eine Spalte aus Marken,
 * keine orange Seite (Quiet Open Rule).
 */
export function DateSlot({
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

const REGISTER_CLASS =
  "semi-condensed border-ink text-ink hover:bg-paper dark:border-night-text dark:text-night-text relative z-10 mt-3 inline-flex h-10 items-center gap-2 border-2 px-4 text-base font-semibold transition-colors";

function RegistrationLine({
  registration,
}: {
  registration: ProgrammeRegistration;
}) {
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

type TitleLevel = "h2" | "h3" | "h4";

/**
 * Programmzeile (Signature): Datumsslot, Titel, Meta-Zeile (Art ·
 * Bezirksmarke), Zeit · Ort, Status. Die ganze Zeile ist über den Titel-Link
 * klickbar; die Anmelde-Schaltfläche liegt darüber.
 */
export function ProgrammeRow({
  entry,
  now,
  titleAs: Title = "h3",
}: {
  entry: ProgrammeEntry;
  now: Date;
  titleAs?: TitleLevel;
}) {
  return (
    <li className="fill-row border-rule dark:border-night-rule border-b">
      <div className="relative flex gap-4 px-1 py-4 sm:gap-6">
        <DateSlot date={entry.start} now={now} marked={!!entry.registration} />
        <div className="min-w-0 flex-1">
          <Title
            className={`condensed text-[1.5rem] leading-[1.1] font-bold ${
              entry.cancelled
                ? "text-dark dark:text-night-muted line-through"
                : "text-ink dark:text-night-text"
            }`}
          >
            <Link
              href={entry.href}
              className="after:absolute after:inset-0 after:content-['']"
            >
              <span className="sr-only">{FULL_DATE.format(entry.start)}: </span>
              {entry.title}
            </Link>
          </Title>
          <p className="semi-condensed text-dark dark:text-night-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
            <span>{entry.kind}</span>
            <BezirkLabel bezirk={entry.bezirk} />
          </p>
          <p className="text-dark dark:text-night-muted mt-1 text-[0.9375rem]">
            {entry.when}
            {entry.place ? ` · ${entry.place}` : ""}
          </p>
          {entry.cancelled ? (
            <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-400">
              Abgesagt
            </p>
          ) : entry.registration ? (
            <RegistrationLine registration={entry.registration} />
          ) : entry.status ? (
            <p className="text-dark dark:text-night-muted mt-2 text-sm">
              {entry.status.text}
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

interface ProgrammeListProps {
  entries: ProgrammeEntry[];
  now: Date;
  isLoading?: boolean;
  /**
   * Fehlen Zeilen bis zu dieser Zahl, steht darunter der gestaltete leere
   * Programmplatz (kurzer Strich + Text).
   */
  fillTo?: number;
  emptyText?: string;
  skeletonRows?: number;
  titleAs?: TitleLevel;
}

/** Programm als Tabellensatz, mit Lade-Platzhaltern und leerem Programmplatz. */
export function ProgrammeList({
  entries,
  now,
  isLoading = false,
  fillTo,
  emptyText = "Weitere Termine folgen.",
  skeletonRows = 3,
  titleAs,
}: ProgrammeListProps) {
  if (isLoading) {
    return (
      <ol aria-busy="true" aria-label="Termine werden geladen">
        {Array.from({ length: skeletonRows }, (_, i) => (
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
    );
  }

  return (
    <ol>
      {entries.map((entry) => (
        <ProgrammeRow
          key={entry.key}
          entry={entry}
          now={now}
          titleAs={titleAs}
        />
      ))}
      {fillTo != null && entries.length < fillTo && (
        <li className="border-rule dark:border-night-rule flex items-center gap-4 border-b px-1 py-5 sm:gap-6">
          <span aria-hidden className="flex w-16 shrink-0 sm:w-20">
            <span className="bg-rule dark:bg-night-rule block h-[3px] w-10" />
          </span>
          <p className="text-dark dark:text-night-muted text-[0.9375rem]">
            {emptyText}
          </p>
        </li>
      )}
    </ol>
  );
}
