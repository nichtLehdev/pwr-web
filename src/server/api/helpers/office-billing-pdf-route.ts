import { type NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { auth } from "@/server/better-auth";
import { resolveUserPermissions } from "./permissions";
import { PERMISSIONS } from "@/lib/permissions";

interface RenderedPdf {
  filename: string;
  bytes: Uint8Array;
}

/**
 * GET-Handler für die PDFs eines Abrechnungslaufs der Geschäftsstelle:
 * `?invoice=<id>` liefert ein PDF zum Ansehen, ohne Parameter ein ZIP aller
 * abzurechnenden Rechnungen (für den Postversand), `?filter=unmailed` nur die
 * noch nicht verschickten. Wie bei den Kursrechnungen ist das die Vorschau:
 * Entwürfe kommen mit "ENTWURF"-Stempel. Gespeichert wird nichts.
 */
export function officeBillingPdfRoute<Run, Invoice>(config: {
  loadRun: (runId: string) => Promise<Run | null>;
  loadInvoice: (runId: string, invoiceId: string) => Promise<Invoice | null>;
  loadInvoices: (runId: string, onlyUnmailed: boolean) => Promise<Invoice[]>;
  render: (run: Run, invoice: Invoice) => Promise<RenderedPdf>;
  zipName: (run: Run, onlyUnmailed: boolean) => string;
}) {
  return async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ runId: string }> },
  ) {
    const { runId } = await params;
    const notFound = () =>
      NextResponse.json({ error: "Not found" }, { status: 404 });

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return notFound();
    const permissions = await resolveUserPermissions(session.user.id);
    if (!permissions.has(PERMISSIONS.BILLING_MANAGE)) return notFound();

    const run = await config.loadRun(runId);
    if (!run) return notFound();

    const invoiceId = request.nextUrl.searchParams.get("invoice");
    if (invoiceId) {
      const invoice = await config.loadInvoice(runId, invoiceId);
      if (!invoice) return notFound();
      const pdf = await config.render(run, invoice);
      return new NextResponse(pdf.bytes as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": String(pdf.bytes.byteLength),
          "Content-Disposition": `inline; filename="${encodeURIComponent(pdf.filename)}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const onlyUnmailed =
      request.nextUrl.searchParams.get("filter") === "unmailed";
    const invoices = await config.loadInvoices(runId, onlyUnmailed);
    const zip = new JSZip();
    for (const invoice of invoices) {
      const pdf = await config.render(run, invoice);
      zip.file(pdf.filename, pdf.bytes);
    }
    const bytes = await zip.generateAsync({ type: "uint8array" });

    return new NextResponse(bytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${config.zipName(run, onlyUnmailed)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  };
}
