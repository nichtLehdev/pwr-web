import { describe, expect, it, jest } from "@jest/globals";
import type { Prisma } from "~/generated/prisma/client";
import { nextInvoiceId } from "../invoice-number";

/**
 * A stand-in for the transaction client: both counters behave like the upsert
 * they wrap — first call creates at 1, every later call increments.
 */
function fakeTx() {
  const years = new Map<number, number>();
  const courses = new Map<string, number>();

  const bump = <K>(store: Map<K, number>, key: K) => {
    const value = (store.get(key) ?? 0) + 1;
    store.set(key, value);
    return value;
  };

  const invoiceCounter = {
    upsert: jest.fn(async ({ where }: { where: { year: number } }) => ({
      year: where.year,
      value: bump(years, where.year),
    })),
  };
  const courseInvoiceCounter = {
    upsert: jest.fn(async ({ where }: { where: { courseNumber: string } }) => ({
      courseNumber: where.courseNumber,
      value: bump(courses, where.courseNumber),
    })),
  };

  return {
    tx: {
      invoiceCounter,
      courseInvoiceCounter,
    } as unknown as Prisma.TransactionClient,
    invoiceCounter,
    courseInvoiceCounter,
  };
}

describe("nextInvoiceId", () => {
  it("falls back to the yearly sequence without a course number", async () => {
    const { tx, courseInvoiceCounter } = fakeTx();
    const year = new Date().getFullYear();

    expect(await nextInvoiceId(tx)).toBe(`RE-${year}-00001`);
    expect(await nextInvoiceId(tx, null)).toBe(`RE-${year}-00002`);
    // Blank input is "no number", not a course numbered "".
    expect(await nextInvoiceId(tx, "  ")).toBe(`RE-${year}-00003`);
    expect(courseInvoiceCounter.upsert).not.toHaveBeenCalled();
  });

  it("gives a numbered course its own three-digit sequence", async () => {
    const { tx, invoiceCounter } = fakeTx();

    expect(await nextInvoiceId(tx, "2601")).toBe("RE-2601-001");
    expect(await nextInvoiceId(tx, "2601")).toBe("RE-2601-002");
    expect(invoiceCounter.upsert).not.toHaveBeenCalled();
  });

  it("counts each course separately", async () => {
    const { tx } = fakeTx();

    expect(await nextInvoiceId(tx, "2601")).toBe("RE-2601-001");
    expect(await nextInvoiceId(tx, "2602")).toBe("RE-2602-001");
    expect(await nextInvoiceId(tx, "2601")).toBe("RE-2601-002");
  });

  it("keeps the yearly and the per-course sequences independent", async () => {
    const { tx } = fakeTx();
    const year = new Date().getFullYear();

    expect(await nextInvoiceId(tx, "2601")).toBe("RE-2601-001");
    expect(await nextInvoiceId(tx)).toBe(`RE-${year}-00001`);
    expect(await nextInvoiceId(tx, "2601")).toBe("RE-2601-002");
  });

  it("grows past the padding rather than truncating", async () => {
    const { tx } = fakeTx();
    for (let i = 0; i < 999; i++) await nextInvoiceId(tx, "2601");

    expect(await nextInvoiceId(tx, "2601")).toBe("RE-2601-1000");
  });

  it("trims a padded course number so the sequence stays keyed to one course", async () => {
    const { tx } = fakeTx();

    expect(await nextInvoiceId(tx, " 2601 ")).toBe("RE-2601-001");
    expect(await nextInvoiceId(tx, "2601")).toBe("RE-2601-002");
  });
});
