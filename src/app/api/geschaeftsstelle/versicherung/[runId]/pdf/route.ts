import { db } from "@/server/db";
import {
  effectiveInsuranceRun,
  renderInsuranceInvoice,
} from "@/server/api/helpers/insurance-billing";
import { officeBillingPdfRoute } from "@/server/api/helpers/office-billing-pdf-route";

/** Versicherungsrechnungen eines Laufs als PDF oder ZIP (siehe officeBillingPdfRoute). */
export const GET = officeBillingPdfRoute({
  loadRun: async (runId) => {
    const record = await db.insuranceBillingRun.findUnique({
      where: { id: runId },
    });
    return record ? effectiveInsuranceRun(db, record) : null;
  },
  loadInvoice: (runId, invoiceId) =>
    db.insuranceInvoice.findFirst({ where: { id: invoiceId, runId } }),
  loadInvoices: (runId, onlyUnmailed) =>
    db.insuranceInvoice.findMany({
      where: {
        runId,
        excluded: false,
        ...(onlyUnmailed && { mailedAt: null }),
      },
      orderBy: { sheetRow: "asc" },
    }),
  render: renderInsuranceInvoice,
  zipName: (run, onlyUnmailed) =>
    `Versicherungsbeitraege_${run.year}${run.draft ? "_Entwurf" : ""}${onlyUnmailed ? "_ohne_Mail" : ""}.zip`,
});
