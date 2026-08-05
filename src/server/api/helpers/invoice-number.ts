import type { Prisma } from "~/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Issue the next invoice number from the per-year counter, e.g.
 * "RE-2026-00042". Must be called inside the same transaction that persists
 * the invoice so numbers stay continuous (§14 UStG) — a rolled-back
 * transaction rolls the counter back with it.
 */
export async function nextInvoiceId(tx: Tx): Promise<string> {
  const year = new Date().getFullYear();
  const counter = await tx.invoiceCounter.upsert({
    where: { year },
    update: { value: { increment: 1 } },
    create: { year, value: 1 },
  });
  return `RE-${year}-${String(counter.value).padStart(5, "0")}`;
}
