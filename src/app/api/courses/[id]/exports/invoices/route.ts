import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { auth } from "@/server/better-auth";
import { resolveInvoiceAccess } from "@/server/api/helpers/invoice-access";
import { buildInvoiceSummaryXlsx } from "@/server/utils/course-exports";
import { attachmentHeaders } from "@/server/utils/xlsx";
import { InvoiceStatus } from "~/generated/prisma/client";

/**
 * Rechnungsübersicht eines Kurses als .xlsx.
 *
 * Dieselbe Zugriffsregel wie `invoices.listForCourse`: nur wer den Kurs
 * abrechnen darf, bekommt die Liste — sie führt Namen, E-Mail-Adressen und
 * Beträge aller Anmeldungen zusammen.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: courseId } = await params;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      courseNumber: true,
      createdById: true,
      invoicingEnabled: true,
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await resolveInvoiceAccess(db, session.user.id, course);
  if (!access.canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Nur ausgestellte Rechnungen: abgeglichen wird gegen echte Rechnungsnummern,
  // nicht gegen Entwürfe oder stornierte Dokumente ohne Forderung.
  const invoices = await db.invoice.findMany({
    where: { courseId, status: InvoiceStatus.PUBLISHED },
    orderBy: [{ invoiceNumber: "asc" }],
    select: {
      invoiceNumber: true,
      totalAmount: true,
      lineItems: true,
      recipientFirstName: true,
      recipientLastName: true,
      recipientEmail: true,
      registration: {
        select: {
          registrantFirstName: true,
          registrantLastName: true,
          registrantEmail: true,
          participants: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const { buffer, filename } = await buildInvoiceSummaryXlsx({
    course,
    invoices,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: attachmentHeaders(filename),
  });
}
