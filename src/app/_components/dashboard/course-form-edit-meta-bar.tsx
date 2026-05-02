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
      className="dark:border-dark-border dark:from-dark-surface dark:via-dark-background dark:to-primary/15 mb-8 flex flex-col gap-4 rounded-2xl border border-gray-200/90 bg-linear-to-br from-white via-gray-50/40 to-emerald-50/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
      role="region"
      aria-label="Kurskontext"
    >
      <div className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
        <CalendarDays
          className="text-primary mt-0.5 h-4 w-4 shrink-0 opacity-90"
          aria-hidden
        />
        {rangeLabel ? (
          <span className="font-medium">{rangeLabel}</span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">
            Termin ergänzen, um die Zeitspanne hier zu sehen
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="text-dark dark:text-dark-text font-medium underline-offset-4 hover:underline"
        >
          Zur Kursübersicht
        </Link>
        <Link
          href={`/mitmachen/kurse/${courseId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline"
        >
          Öffentliche Seite
          <ExternalLink className="h-3.5 w-3.5 opacity-90" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
