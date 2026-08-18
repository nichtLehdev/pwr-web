import { describe, expect, it } from "@jest/globals";
import {
  invoiceOpenAmount,
  invoicePaidAmount,
  invoicePaymentState,
} from "../invoice-payment";

const invoice = (over: Partial<Parameters<typeof invoicePaymentState>[0]>) => ({
  status: "PUBLISHED" as const,
  totalAmount: 120,
  paidAt: null,
  paidAmount: null,
  ...over,
});

describe("invoice payment state", () => {
  it("treats drafts and cancellations as nothing to pay", () => {
    expect(invoicePaymentState(invoice({ status: "DRAFT" }))).toBe(
      "NOT_APPLICABLE",
    );
    expect(
      invoicePaymentState(
        invoice({ status: "CANCELLED", paidAt: new Date(), paidAmount: 120 }),
      ),
    ).toBe("NOT_APPLICABLE");
    expect(invoiceOpenAmount(invoice({ status: "DRAFT" }))).toBe(0);
  });

  it("counts a published invoice without a payment date as open", () => {
    expect(invoicePaymentState(invoice({}))).toBe("OPEN");
    expect(invoiceOpenAmount(invoice({}))).toBe(120);
    expect(invoicePaidAmount(invoice({}))).toBe(0);
  });

  it("treats a payment date without an amount as paid in full", () => {
    const paid = invoice({ paidAt: new Date(2026, 0, 5) });
    expect(invoicePaymentState(paid)).toBe("PAID");
    expect(invoiceOpenAmount(paid)).toBe(0);
    expect(invoicePaidAmount(paid)).toBe(120);
  });

  it("recognises a part payment", () => {
    const part = invoice({ paidAt: new Date(2026, 0, 5), paidAmount: 50 });
    expect(invoicePaymentState(part)).toBe("PARTIAL");
    expect(invoiceOpenAmount(part)).toBe(70);
    expect(invoicePaidAmount(part)).toBe(50);
  });

  it("does not let float arithmetic leave a cent open", () => {
    const cents = invoice({
      totalAmount: 0.1 + 0.2,
      paidAt: new Date(2026, 0, 5),
      paidAmount: 0.3,
    });
    expect(invoicePaymentState(cents)).toBe("PAID");
    expect(invoiceOpenAmount(cents)).toBe(0);
  });

  it("treats an overpayment as paid with nothing open", () => {
    const over = invoice({ paidAt: new Date(2026, 0, 5), paidAmount: 200 });
    expect(invoicePaymentState(over)).toBe("PAID");
    expect(invoiceOpenAmount(over)).toBe(0);
  });

  it("falls back to open when a payment date carries a zero amount", () => {
    expect(
      invoicePaymentState(invoice({ paidAt: new Date(), paidAmount: 0 })),
    ).toBe("OPEN");
  });
});
