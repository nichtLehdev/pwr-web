import type { Prisma } from "~/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/** Width of the running number in a yearly invoice id, e.g. "RE-2026-00042". */
const YEAR_SEQUENCE_DIGITS = 5;
/** Width of the running number in a course invoice id, e.g. "RE-2601-001". */
const COURSE_SEQUENCE_DIGITS = 3;

/**
 * Issue the next invoice number. Must be called inside the same transaction
 * that persists the invoice so numbers stay continuous (§14 UStG) — a
 * rolled-back transaction rolls the counter back with it.
 *
 * Courses carrying an internal number get their own sequence,
 * "RE-<Kursnummer>-<lfd.>" (e.g. "RE-2601-001"), which is what makes a bank
 * statement checkable against a single course. Everything else keeps the
 * per-year sequence, "RE-<Jahr>-<lfd.>" (e.g. "RE-2026-00042").
 *
 * The two shapes cannot collide in practice: a course number that happened to
 * equal a year would still have to reach a five-digit sequence before its ids
 * looked like the yearly ones, and `Invoice.invoiceNumber` is unique, so such a
 * clash would abort the transaction rather than duplicate a number.
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

  const year = new Date().getFullYear();
  const counter = await tx.invoiceCounter.upsert({
    where: { year },
    update: { value: { increment: 1 } },
    create: { year, value: 1 },
  });
  return `RE-${year}-${String(counter.value).padStart(YEAR_SEQUENCE_DIGITS, "0")}`;
}
