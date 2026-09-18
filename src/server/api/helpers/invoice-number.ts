import type { Prisma } from "~/generated/prisma/client";
import { berlinParts } from "@/lib/berlin-time";

type Tx = Prisma.TransactionClient;

/** Width of the running number in a yearly invoice id, e.g. "RE-2026-00042". */
const YEAR_SEQUENCE_DIGITS = 5;
/** Width of the running number in a course invoice id, e.g. "RE-2601-001". */
const COURSE_SEQUENCE_DIGITS = 3;

/** Das Jahr im Rechnungsnummernkreis: deutsches Kalenderjahr. */
export function invoiceYear(now: Date = new Date()): number {
  return berlinParts(now).year;
}

/**
 * Must run in the transaction that persists the invoice, so numbers stay continuous (§14 UStG).
 * Courses with an internal number get "RE-<Kursnummer>-<lfd.>", everything else "RE-<Jahr>-<lfd.>".
 */
export async function nextInvoiceId(
  tx: Tx,
  courseNumber?: string | null,
): Promise<string> {
  const scoped = courseNumber?.trim();
  if (scoped) {
    const counter = await tx.courseInvoiceCounter.upsert({
      where: { courseNumber: scoped },
      update: { value: { increment: 1 } },
      create: { courseNumber: scoped, value: 1 },
    });
    return `RE-${scoped}-${String(counter.value).padStart(COURSE_SEQUENCE_DIGITS, "0")}`;
  }

  // Deutsches Kalenderjahr, nicht UTC: sonst bekäme eine Rechnung am Neujahrsmorgen das Vorjahr.
  const year = invoiceYear();
  const counter = await tx.invoiceCounter.upsert({
    where: { year },
    update: { value: { increment: 1 } },
    create: { year, value: 1 },
  });
  return `RE-${year}-${String(counter.value).padStart(YEAR_SEQUENCE_DIGITS, "0")}`;
}
