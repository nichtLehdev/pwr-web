/**
 * PDF rendering, split out so type-only importers skip jsPDF. Free of `window` and `fs`:
 * the same code renders the browser preview and the PDF frozen on publish.
 */
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import {
  DEFAULT_INVOICE_CLOSING_TEXT,
  DEFAULT_INVOICE_ORGANIZATION,
  formatDate,
  formatEuro,
  formatLongDate,
  INVOICE_CANCELLATION_NOTICE,
  invoicePaymentReference,
  invoiceTotal,
  lineItemTotal,
  recipientName,
  type InvoiceDocument,
  type InvoiceOrganization,
} from "./invoice-document";
import { buildEpcQrPayload } from "./epc-qr";

export interface RenderInvoiceOptions {
  organization?: Partial<InvoiceOrganization>;
  /** data: URL of the letterhead logo. Falls back to a text header. */
  logoBase64?: string;
  /** data: URL of a handwritten signature placed above the signer's name. */
  signatureBase64?: string;
}

/** PNG (drawn) or JPEG (uploaded); jsPDF sniffs anyway, this keeps the declared format honest. */
function imageFormat(dataUrl: string): "PNG" | "JPEG" {
  return /^data:image\/jpe?g/i.test(dataUrl) ? "JPEG" : "PNG";
}

/** Diagonal "ENTWURF"/"STORNIERT" stamp so an unpublished copy can't pass as final. */
function drawWatermark(doc: jsPDF, text: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.saveGraphicsState();
  // @ts-expect-error — GState is untyped in jspdf's bundled declarations.
  doc.setGState(new doc.GState({ opacity: 0.12 }));
  doc.setFontSize(72);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 0, 0);
  doc.text(text, pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: 35,
  });
  doc.restoreGraphicsState();
  doc.setTextColor(0);
}

/** Works in browser and Node: the caller supplies the logo, nothing here fetches or reads files. */
export async function renderInvoicePdf(
  invoice: InvoiceDocument,
  options: RenderInvoiceOptions = {},
): Promise<Uint8Array> {
  const org = { ...DEFAULT_INVOICE_ORGANIZATION, ...options.organization };
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const rightEdge = pageWidth - margin;
  let y = 20;

  const total = invoiceTotal(invoice.lineItems);
  const invoiceNumber = invoice.invoiceNumber ?? "ENTWURF";
  const courseNumber = invoice.course.courseNumber?.trim() ?? "";
  const paymentReference = invoicePaymentReference(invoiceNumber, courseNumber);

  const checkPageBreak = (requiredSpace = 20) => {
    if (y > 270 - requiredSpace) {
      doc.addPage();
      y = 20;
    }
  };

  const LOGO_HEIGHT = 25;
  let logoDrawn = false;
  if (options.logoBase64) {
    try {
      doc.addImage(
        options.logoBase64,
        imageFormat(options.logoBase64),
        margin,
        y - 5,
        60,
        LOGO_HEIGHT,
      );
      logoDrawn = true;
      y += LOGO_HEIGHT;
    } catch {
      // Fall through to the text header below.
    }
  }
  if (!logoDrawn) {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(88, 89, 91);
    doc.text(org.name, margin, y, { maxWidth: 110 });
    y += 10;
  }

  // Level with the logo's middle so both halves of the letterhead read as one row.
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Rechnung", rightEdge, logoDrawn ? 15 + LOGO_HEIGHT / 2 + 2 : 20, {
    align: "right",
  });

  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`${org.name} · ${org.address}`, margin, y);
  y += 4;
  doc.text(org.contact, margin, y);
  doc.setTextColor(0);

  // Recipient on the left, invoice metadata on the right, in one band.
  y += 8;
  const bandTop = y;
  const infoLabelX = 112;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Rechnungsempfänger:", margin, y);
  let leftY = y + 6;
  doc.setFont("helvetica", "normal");

  const addressLines = [
    invoice.recipient.company,
    recipientName(invoice.recipient),
    invoice.recipient.street,
    [invoice.recipient.zipCode, invoice.recipient.city]
      .filter(Boolean)
      .join(" ")
      .trim(),
    invoice.recipient.email,
  ].filter((line): line is string => Boolean(line && line.trim()));

  const addressWidth = infoLabelX - margin - 6;
  for (const line of addressLines) {
    const wrapped = doc.splitTextToSize(line, addressWidth);
    doc.text(wrapped, margin, leftY);
    leftY += wrapped.length * 5;
  }

  const courseStart = formatDate(invoice.course.startDate);
  const courseEnd = formatDate(invoice.course.endDate);
  const infoRows: [string, string][] = [
    ["Rechnungsnummer", invoiceNumber],
    ["Rechnungsdatum", formatDate(invoice.invoiceDate ?? new Date())],
  ];
  if (courseNumber) infoRows.push(["Kursnummer", courseNumber]);
  const dueDateShort = formatDate(invoice.dueDate);
  if (dueDateShort) infoRows.push(["Zahlbar bis", dueDateShort]);
  if (courseStart) {
    infoRows.push([
      "Kurszeitraum",
      courseEnd && courseEnd !== courseStart
        ? `${courseStart} – ${courseEnd}`
        : courseStart,
    ]);
  }

  let infoY = bandTop;
  for (const [label, value] of infoRows) {
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(label, infoLabelX, infoY);
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(value, rightEdge, infoY, { align: "right" });
    infoY += 5.5;
  }

  y = Math.max(leftY, infoY);

  // Subject line, DIN-5008 style: what this invoice is for, full width.
  y += 5;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  const titleLines = doc.splitTextToSize(
    invoice.course.title,
    pageWidth - 2 * margin,
  );
  doc.text(titleLines, margin, y);
  y += titleLines.length * 6;

  const locationText = [
    invoice.course.locationName,
    invoice.course.locationCity,
  ]
    .filter(Boolean)
    .join(", ");
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (locationText) {
    doc.setTextColor(90);
    doc.text(locationText, margin, y);
    doc.setTextColor(0);
    y += 5;
  }

  // Correction notes belong right under the address, where a reader comparing
  // two documents looks first.
  if (invoice.replacesInvoiceNumber) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(150, 0, 0);
    doc.text(
      `Diese Rechnung ersetzt die stornierte Rechnung ${invoice.replacesInvoiceNumber}.`,
      margin,
      y,
      { maxWidth: pageWidth - 2 * margin },
    );
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    y += 5;
  }
  if (invoice.status === "CANCELLED") {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(150, 0, 0);
    doc.text(
      invoice.replacedByInvoiceNumber
        ? `Storniert — ersetzt durch Rechnung ${invoice.replacedByInvoiceNumber}.`
        : "Diese Rechnung wurde storniert.",
      margin,
      y,
      { maxWidth: pageWidth - 2 * margin },
    );
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    y += 5;
  }

  if (invoice.introText?.trim()) {
    y += 6;
    checkPageBreak(20);
    const intro = doc.splitTextToSize(
      invoice.introText.trim(),
      pageWidth - 2 * margin,
    );
    doc.text(intro, margin, y);
    y += intro.length * 5;
  }

  y += 6;
  checkPageBreak(30);

  // Column layout: description grows, the three number columns are fixed and
  // right-aligned so the decimal points line up down the page.
  const amountX = rightEdge;
  const unitPriceX = rightEdge - 32;
  const quantityX = rightEdge - 62;
  const descriptionWidth = quantityX - margin - 14;

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 5, pageWidth - 2 * margin, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Position", margin + 2, y);
  doc.text("Menge", quantityX, y, { align: "right" });
  doc.text("Einzelpreis", unitPriceX, y, { align: "right" });
  doc.text("Betrag", amountX, y, { align: "right" });

  y += 8;
  doc.setFont("helvetica", "normal");

  for (const item of invoice.lineItems) {
    checkPageBreak(18);

    const descriptionLines = doc.splitTextToSize(
      item.description || "-",
      descriptionWidth,
    );
    doc.text(descriptionLines, margin + 2, y);
    // Quantities are usually whole participants; only show decimals when they exist.
    doc.text(
      Number.isInteger(item.quantity)
        ? String(item.quantity)
        : item.quantity.toLocaleString("de-DE"),
      quantityX,
      y,
      { align: "right" },
    );
    doc.text(formatEuro(item.unitPrice), unitPriceX, y, { align: "right" });
    doc.text(formatEuro(lineItemTotal(item)), amountX, y, { align: "right" });

    y += descriptionLines.length * 5;

    if (item.detail?.trim()) {
      doc.setFontSize(9);
      doc.setTextColor(110);
      const detailLines = doc.splitTextToSize(
        item.detail.trim(),
        descriptionWidth,
      );
      doc.text(detailLines, margin + 2, y);
      y += detailLines.length * 4.5;
      doc.setTextColor(0);
      doc.setFontSize(10);
    }

    y += 2;
  }

  y += 1;
  checkPageBreak(24);
  doc.setDrawColor(0);
  doc.line(margin, y, rightEdge, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Gesamtbetrag:", quantityX, y, { align: "right" });
  doc.text(formatEuro(total), amountX, y, { align: "right" });

  y += 8;
  checkPageBreak(30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const dueDateText = formatLongDate(invoice.dueDate);
  // With a course number the reference is more than the invoice number, so
  // the sentence points at the printed line instead of naming the number.
  const referenceHint = courseNumber
    ? "den unten angegebenen Verwendungszweck"
    : "als Verwendungszweck die Rechnungsnummer";
  const deadlineClause = dueDateText ? ` bis zum ${dueDateText}` : "";
  const paymentText = `Wir bitten Sie, den Rechnungsbetrag${deadlineClause} auf das unten angegebene Konto zu überweisen. Bitte geben Sie ${referenceHint} an.`;
  const splitPayment = doc.splitTextToSize(paymentText, pageWidth - 2 * margin);
  doc.text(splitPayment, margin, y);
  y += splitPayment.length * 5 + 3;

  // Sized to the bank details, not the QR: an ordinary invoice must fit on one
  // page including the closing.
  const leftTextTotalHeight = 22;
  const bankBlockHeight = leftTextTotalHeight + 6;
  const qrSize = bankBlockHeight - 4;

  y += 3;
  checkPageBreak(bankBlockHeight + 2);
  const bankBlockY = y - 4;

  // No payment QR on a draft or storno: both would invite a wrong transfer.
  let qrDataUrl: string | null = null;
  if (org.iban && invoice.status === "PUBLISHED" && total > 0) {
    try {
      qrDataUrl = await QRCode.toDataURL(
        buildEpcQrPayload(org.name, org.iban, total, paymentReference, org.bic),
        { errorCorrectionLevel: "M", margin: 1, width: 256 },
      );
    } catch {
      // A missing QR code is cosmetic — never fail an invoice over it.
    }
  }

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, bankBlockY, pageWidth - 2 * margin, bankBlockHeight, "F");

  let leftTextY = bankBlockY + (bankBlockHeight - leftTextTotalHeight) / 2 + 4;
  doc.setFont("helvetica", "bold");
  doc.text("Bankverbindung:", margin + 3, leftTextY);
  leftTextY += 6;
  doc.setFont("helvetica", "normal");
  doc.text(org.bankName, margin + 3, leftTextY);
  leftTextY += 5;
  doc.text(`IBAN: ${org.iban}`, margin + 3, leftTextY);
  doc.text(`BIC: ${org.bic}`, margin + 90, leftTextY);
  leftTextY += 5;
  doc.setFont("helvetica", "bold");
  doc.text(`Verwendungszweck: ${paymentReference}`, margin + 3, leftTextY);
  doc.setFont("helvetica", "normal");

  if (qrDataUrl) {
    try {
      const qrTop = bankBlockY + (bankBlockHeight - qrSize) / 2;
      const qrX = rightEdge - qrSize - 4;
      // Deliberately uncaptioned: a label would crowd the BIC or push the
      // sign-off onto a second page.
      doc.addImage(qrDataUrl, "PNG", qrX, qrTop, qrSize, qrSize);
    } catch {
      // Ignore image errors
    }
  }

  const closing = (invoice.closingText ?? DEFAULT_INVOICE_CLOSING_TEXT).trim();

  // Bedingung des Lehrgangs, kein Gruß: darum als Kleingedrucktes vor dem Schlusstext.
  y = bankBlockY + bankBlockHeight + 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  const noticeLines = doc.splitTextToSize(
    INVOICE_CANCELLATION_NOTICE,
    pageWidth - 2 * margin,
  );
  checkPageBreak(noticeLines.length * 4.5);
  doc.text(noticeLines, margin, y);
  y += noticeLines.length * 4.5 + 5;
  doc.setTextColor(0);
  doc.setFontSize(10);
  const closingLines = closing
    ? doc.splitTextToSize(closing, pageWidth - 2 * margin)
    : [];
  // Exactly what the sign-off needs, so it only breaks the page when it must.
  checkPageBreak(
    closingLines.length * 5 + 4 + 15 + (options.signatureBase64 ? 22 : 0),
  );

  if (closingLines.length > 0) {
    doc.text(closingLines, margin, y);
    y += closingLines.length * 5 + 4;
  }

  doc.text("Herzliche Grüße", margin, y);
  y += 10;

  if (options.signatureBase64) {
    try {
      doc.addImage(
        options.signatureBase64,
        imageFormat(options.signatureBase64),
        margin,
        y,
        40,
        20,
      );
      y += 22;
    } catch {
      // Ignore image errors
    }
  }

  if (invoice.signatureName?.trim()) {
    doc.text(invoice.signatureName.trim(), margin, y);
  } else {
    doc.setFont("helvetica", "italic");
    doc.text("Ihr Team vom Posaunenwerk Rheinland", margin, y);
    doc.setFont("helvetica", "normal");
  }

  // Footer on every page, so a detached second sheet is still attributable.
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.setFont("helvetica", "normal");
    doc.setDrawColor(200);
    doc.line(margin, pageHeight - 20, rightEdge, pageHeight - 20);
    doc.text(org.name, margin, pageHeight - 15);
    doc.text(`IBAN: ${org.iban} | BIC: ${org.bic}`, margin, pageHeight - 10);
    if (pageCount > 1) {
      doc.text(`Seite ${page} von ${pageCount}`, rightEdge, pageHeight - 10, {
        align: "right",
      });
    }
    if (invoice.status !== "PUBLISHED") {
      drawWatermark(doc, invoice.status === "DRAFT" ? "ENTWURF" : "STORNIERT");
    }
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
