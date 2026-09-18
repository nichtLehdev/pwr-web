import { type NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { db } from "@/server/db";
import { auth } from "@/server/better-auth";
import { resolveUploadFsPath } from "@/server/utils/uploads-dir";
import { renderInvoiceBytes } from "@/server/api/helpers/invoice-pdf";
import { resolveUserPermissions } from "@/server/api/helpers/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import {
  CourseCollaboratorRole,
  InvoiceStatus,
} from "~/generated/prisma/client";

/**
 * The only way to read an invoice PDF (file names are enumerable, /api/uploads
 * refuses them). Allowed: the registrant (account or address) once published;
 * organizers and holders of invoices.generate / invoices.view, drafts included.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      course: {
        select: {
          createdById: true,
          title: true,
          courseNumber: true,
          startDate: true,
          endDate: true,
          location: { select: { name: true, city: true } },
        },
      },
      replaces: { select: { invoiceNumber: true } },
      replacedBy: { select: { invoiceNumber: true } },
      registration: { select: { registrantId: true, registrantEmail: true } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isRegistrant =
    invoice.status === InvoiceStatus.PUBLISHED &&
    (invoice.registration?.registrantId === session.user.id ||
      (!!invoice.registration?.registrantEmail &&
        invoice.registration.registrantEmail.toLowerCase() ===
          session.user.email.toLowerCase()));

  let allowed = isRegistrant;

  if (!allowed) {
    const [permissions, collaborator] = await Promise.all([
      resolveUserPermissions(session.user.id),
      db.courseCollaborator.findUnique({
        where: {
          courseId_userId: {
            courseId: invoice.courseId,
            userId: session.user.id,
          },
        },
        select: { role: true },
      }),
    ]);

    allowed =
      permissions.has(PERMISSIONS.INVOICES_GENERATE) ||
      permissions.has(PERMISSIONS.INVOICES_VIEW) ||
      invoice.course.createdById === session.user.id ||
      collaborator?.role === CourseCollaboratorRole.ORGANIZER;
  }

  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filename =
    invoice.pdfFilename ??
    `Rechnung_${invoice.invoiceNumber ?? invoice.id}.pdf`;

  // Drafts are rendered on the fly (watermarked) and never written to disk,
  // which keeps "issued" and "drafted" distinguishable.
  if (!invoice.pdfPath) {
    const bytes = await renderInvoiceBytes(invoice);
    return new NextResponse(bytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const fsPath = resolveUploadFsPath(invoice.pdfPath);
  if (!fsPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let fileStats;
  try {
    fileStats = await stat(/* turbopackIgnore: true */ fsPath);
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const nodeStream = createReadStream(/* turbopackIgnore: true */ fsPath);
  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (error) => controller.error(error));
    },
    cancel() {
      nodeStream.destroy();
    },
  });

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(fileStats.size),
      // Inline: the browser's PDF viewer is the friendlier default, and the
      // download button in the dashboard sets its own filename anyway.
      "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
