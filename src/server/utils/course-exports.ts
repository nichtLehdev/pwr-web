import "server-only";

import {
  buildCourseParticipantsExportRows,
  courseParticipantsColumns,
  sanitizeCourseTitleForFilename,
  type CourseParticipantsExportOptions,
} from "@/lib/course-participants-export";
import {
  buildInvoiceSummaryRows,
  invoiceSummaryColumns,
} from "@/lib/invoice-summary-export";
import { buildXlsxBuffer, exportDateStamp } from "@/server/utils/xlsx";

/**
 * Die fertigen Arbeitsmappen der Kursexporte — Dashboard-Download und
 * E-Mail-Anhang holen sie hier, damit die Organisation zweimal dieselbe Datei
 * bekommt und nicht zwei Listen vergleichen muss, die auseinanderdriften.
 */

export type CourseExportFile = { buffer: Buffer; filename: string };

function stand(now: Date): string {
  return `Stand: ${now.toLocaleDateString("de-DE")}`;
}

type ParticipantsExportCourse = Parameters<
  typeof buildCourseParticipantsExportRows
>[0] & { title: string };

export async function buildCourseParticipantsXlsx(params: {
  course: ParticipantsExportCourse;
  registrations: Parameters<typeof buildCourseParticipantsExportRows>[1];
  options?: CourseParticipantsExportOptions;
  now?: Date;
}): Promise<CourseExportFile> {
  const now = params.now ?? new Date();
  const rows = buildCourseParticipantsExportRows(
    params.course,
    params.registrations,
    params.options,
  );

  const buffer = await buildXlsxBuffer({
    sheetName: "Teilnehmende",
    columns: courseParticipantsColumns(params.course, params.options),
    rows,
    caption: [
      params.course.title,
      `${stand(now)} · ${rows.length} Teilnehmende`,
    ],
    totals: true,
  });

  return {
    buffer,
    filename: `${sanitizeCourseTitleForFilename(params.course.title)}_teilnehmer_${exportDateStamp(now)}.xlsx`,
  };
}

export async function buildInvoiceSummaryXlsx(params: {
  course: { title: string; courseNumber: string | null };
  invoices: Parameters<typeof buildInvoiceSummaryRows>[0];
  now?: Date;
}): Promise<CourseExportFile> {
  const now = params.now ?? new Date();
  const rows = buildInvoiceSummaryRows(params.invoices, params.course);

  const buffer = await buildXlsxBuffer({
    sheetName: "Rechnungen",
    columns: invoiceSummaryColumns,
    rows,
    caption: [
      `${params.course.title} — Rechnungsübersicht`,
      `${stand(now)} · ${rows.length} ausgestellte Rechnungen`,
    ],
    totals: true,
  });

  return {
    buffer,
    filename: `${sanitizeCourseTitleForFilename(params.course.title)}_rechnungen_${exportDateStamp(now)}.xlsx`,
  };
}
