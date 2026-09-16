"use client";

import Link from "next/link";
import { CalendarDays, ExternalLink } from "lucide-react";

export function CourseFormEditMetaBar({
  startDate,
  startTime,
  endDate,
  endTime,
  courseId,
}: {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  courseId: string;
}) {
  let rangeLabel: string | null = null;
  if (startDate && endDate) {
    try {
      const a = new Date(`${startDate}T${startTime || "00:00"}`);
      const b = new Date(`${endDate}T${endTime || "00:00"}`);
      if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime())) {
        const o: Intl.DateTimeFormatOptions = {
          day: "numeric",
          month: "short",
          year: "numeric",
        };
        rangeLabel = `${a.toLocaleDateString("de-DE", o)} · ${b.toLocaleDateString("de-DE", o)}`;
      }
    } catch {
      rangeLabel = null;
    }
  }

  return (
    <div
      className="border-rule dark:border-night-rule bg-rule/25 dark:bg-night-raised mb-8 flex flex-col gap-4 border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
      role="region"
      aria-label="Kurskontext"
    >
      <div className="text-dark dark:text-night-muted flex items-start gap-2.5 text-sm">
        <CalendarDays
          className="text-primary-ink dark:text-primary mt-0.5 h-4 w-4 shrink-0"
          aria-hidden
        />
        {rangeLabel ? (
          <span className="text-ink dark:text-night-text font-medium">
            {rangeLabel}
          </span>
        ) : (
          <span>Termin ergänzen, um die Zeitspanne hier zu sehen</span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="text-ink dark:text-night-text inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline"
        >
          Zur Kursübersicht
        </Link>
        <Link
          href={`/mitmachen/kurse/${courseId}`}
          target="_blank"
          rel="noopener noreferrer"
          // Orange als Textfarbe fällt auf Papier unter AA — Messing-Tinte
          // trägt denselben Akzent (nachts darf Orange selbst stehen).
          className="text-primary-ink dark:text-primary inline-flex min-h-11 items-center gap-1 font-semibold underline-offset-4 hover:underline"
        >
          Öffentliche Seite
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
