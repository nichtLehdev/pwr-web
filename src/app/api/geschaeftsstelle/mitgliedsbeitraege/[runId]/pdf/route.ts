import { db } from "@/server/db";
import {
  effectiveMembershipRun,
  renderMembershipInvoice,
} from "@/server/api/helpers/membership-billing";
import { officeBillingPdfRoute } from "@/server/api/helpers/office-billing-pdf-route";

/** Mitgliedsbeitragsrechnungen eines Laufs als PDF oder ZIP (siehe officeBillingPdfRoute). */
export const GET = officeBillingPdfRoute({
  loadRun: async (runId) => {
    const record = await db.membershipBillingRun.findUnique({
      where: { id: runId },
    });
    return record ? effectiveMembershipRun(db, record) : null;
  },
  loadInvoice: (runId, invoiceId) =>
    db.membershipInvoice.findFirst({ where: { id: invoiceId, runId } }),
  loadInvoices: (runId, onlyUnmailed) =>
    db.membershipInvoice.findMany({
      where: {
        runId,
        excluded: false,
        ...(onlyUnmailed && { mailedAt: null }),
      },
      orderBy: { sheetRow: "asc" },
    }),
  render: renderMembershipInvoice,
  zipName: (run, onlyUnmailed) =>
    `Mitgliedsbeitraege_${run.year}${run.draft ? "_Entwurf" : ""}${onlyUnmailed ? "_ohne_Mail" : ""}.zip`,
});
