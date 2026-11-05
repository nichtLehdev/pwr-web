import { type NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { db } from "@/server/db";
import { auth } from "@/server/better-auth";
import { resolveUserPermissions } from "@/server/api/helpers/permissions";
import {
  effectiveInsuranceRun,
  renderInsuranceInvoice,
} from "@/server/api/helpers/insurance-billing";
import { PERMISSIONS } from "@/lib/permissions";

/**
 * Versicherungsrechnungen eines Laufs: `?invoice=<id>` liefert ein PDF,
 * ohne Parameter ein ZIP aller abzurechnenden Rechnungen (zum Drucken für
 * Chöre ohne E-Mail). Wie bei den Kursrechnungen ist das die Vorschau: Entwürfe
 * kommen mit "ENTWURF"-Stempel und aktuellen Einstellungen, ausgestellte Läufe
 * aus den eingefrorenen Daten. Gespeichert wird nichts.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const permissions = await resolveUserPermissions(session.user.id);
  if (!permissions.has(PERMISSIONS.BILLING_MANAGE)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const record = await db.insuranceBillingRun.findUnique({
    where: { id: runId },
  });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const run = await effectiveInsuranceRun(db, record);

  const invoiceId = request.nextUrl.searchParams.get("invoice");
  if (invoiceId) {
    const invoice = await db.insuranceInvoice.findFirst({
      where: { id: invoiceId, runId },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const pdf = await renderInsuranceInvoice(run, invoice);
    return new NextResponse(pdf.bytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.bytes.byteLength),
        "Content-Disposition": `inline; filename="${encodeURIComponent(pdf.filename)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  // `?filter=unmailed` nur die, die noch per Post raus müssen.
  const onlyUnmailed =
    request.nextUrl.searchParams.get("filter") === "unmailed";
  const invoices = await db.insuranceInvoice.findMany({
    where: {
      runId,
      excluded: false,
      ...(onlyUnmailed && { mailedAt: null }),
    },
    orderBy: { sheetRow: "asc" },
  });

  const zip = new JSZip();
  for (const invoice of invoices) {
    const pdf = await renderInsuranceInvoice(run, invoice);
    zip.file(pdf.filename, pdf.bytes);
  }
  const bytes = await zip.generateAsync({ type: "uint8array" });
  const filename = `Versicherungsbeitraege_${run.year}${run.draft ? "_Entwurf" : ""}${onlyUnmailed ? "_ohne_Mail" : ""}.zip`;

  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
