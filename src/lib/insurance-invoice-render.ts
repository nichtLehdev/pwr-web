/**
 * PDF der Versicherungsbeitragsrechnung, im Erscheinungsbild der Kursrechnungen
 * (siehe invoice-render.ts). Frei von `window` und `fs`, wie dort.
 */
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import {
  DEFAULT_INVOICE_ORGANIZATION,
  formatDate,
  formatEuro,
  formatLongDate,
  type InvoiceOrganization,
} from "./invoice-document";
import {
  insuranceCategoryLabel,
  insuranceInvoiceTotal,
  type InsuranceInvoiceLine,
} from "./insurance-billing";
import { buildEpcQrPayload } from "./epc-qr";
import { drawWatermark } from "./invoice-render";

export interface InsuranceInvoiceDocument {
  year: number;
  invoiceDate: Date | string;
  dueDate: Date | string;
  choirNumber: string;
  choirName: string | null;
  recipient: {
    name1: string | null;
    name2: string | null;
    street: string | null;
    city: string | null;
  };
  lines: InsuranceInvoiceLine[];
  paymentReference: string;
  /** Platzhalter bereits ersetzt. */
  introText: string;
  closingText: string;
  signatureName: string;
  /** Entwurf: Stempel "ENTWURF" und kein QR-Code, wie bei den Kursrechnungen. */
  draft?: boolean;
}

export interface RenderInsuranceInvoiceOptions {
  organization?: Partial<InvoiceOrganization>;
  /** data: URL des Briefkopf-Logos; ohne fällt der Kopf auf Text zurück. */
  logoBase64?: string;
}

export async function renderInsuranceInvoicePdf(
  invoice: InsuranceInvoiceDocument,
  options: RenderInsuranceInvoiceOptions = {},
): Promise<Uint8Array> {
  const org = { ...DEFAULT_INVOICE_ORGANIZATION, ...options.organization };
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const rightEdge = pageWidth - margin;
  const textWidth = pageWidth - 2 * margin;
  let y = 20;

  const total = insuranceInvoiceTotal(invoice.lines);

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
        "PNG",
        margin,
        y - 5,
        60,
        LOGO_HEIGHT,
        undefined,
        // Ohne Kompression wöge jedes PDF über 1 MB — zu viel für 150 Mailanhänge.
        "FAST",
      );
      logoDrawn = true;
      y += LOGO_HEIGHT;
    } catch {
      // Textkopf unten.
    }
  }
  if (!logoDrawn) {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(88, 89, 91);
    doc.text(org.name, margin, y, { maxWidth: 110 });
    y += 10;
  }

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

  // Empfänger links, Rechnungsangaben rechts — wie bei den Kursrechnungen.
  y += 8;
  const bandTop = y;
  const infoLabelX = 112;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Rechnungsempfänger:", margin, y);
  let leftY = y + 6;
  doc.setFont("helvetica", "normal");

  const addressLines = [
    invoice.recipient.name1,
    invoice.recipient.name2,
    invoice.recipient.street,
    invoice.recipient.city,
  ].filter((line): line is string => Boolean(line?.trim()));

  const addressWidth = infoLabelX - margin - 6;
  for (const line of addressLines) {
    const wrapped = doc.splitTextToSize(line, addressWidth);
    doc.text(wrapped, margin, leftY);
    leftY += wrapped.length * 5;
  }

  const infoRows: [string, string][] = [
    ["Rechnungsdatum", formatDate(invoice.invoiceDate)],
    ["Chor-Nr.", invoice.choirNumber],
    ["Beitragsjahr", String(invoice.year)],
    ["Zahlbar bis", formatDate(invoice.dueDate)],
  ];

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

  y += 5;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`Versicherungsbeitrag für das Jahr ${invoice.year}`, margin, y);
  y += 6;
  if (invoice.choirName?.trim()) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90);
    doc.text(invoice.choirName.trim(), margin, y, { maxWidth: textWidth });
    doc.setTextColor(0);
    y += 5;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (invoice.introText.trim()) {
    y += 6;
    const intro = doc.splitTextToSize(invoice.introText.trim(), textWidth);
    checkPageBreak(intro.length * 5);
    doc.text(intro, margin, y);
    y += intro.length * 5;
  }

  y += 6;
  checkPageBreak(30);

  // Spalten rechtsbündig, damit die Dezimalstellen untereinander stehen.
  const amountX = rightEdge;
  const unitPriceX = rightEdge - 32;
  const quantityX = rightEdge - 68;

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 5, textWidth, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Versicherte Instrumente", margin + 2, y);
  doc.text("Anzahl", quantityX, y, { align: "right" });
  doc.text("Prämie pro Stück", unitPriceX, y, { align: "right" });
  doc.text("Betrag", amountX, y, { align: "right" });

  y += 8;
  doc.setFont("helvetica", "normal");

  for (const line of invoice.lines) {
    checkPageBreak(10);
    // Leere Klassen bleiben sichtbar, damit die Preisliste vollständig ist,
    // treten aber zurück.
    if (line.quantity === 0) doc.setTextColor(140);
    doc.text(insuranceCategoryLabel(line.maxValue), margin + 2, y);
    doc.text(line.quantity === 0 ? "–" : String(line.quantity), quantityX, y, {
      align: "right",
    });
    doc.text(formatEuro(line.unitPrice), unitPriceX, y, { align: "right" });
    doc.text(formatEuro(line.amount), amountX, y, { align: "right" });
    doc.setTextColor(0);
    y += 7;
  }

  checkPageBreak(24);
  doc.setDrawColor(0);
  doc.line(margin, y - 2, rightEdge, y - 2);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Zu zahlender Gesamtbetrag:", unitPriceX, y, { align: "right" });
  doc.text(formatEuro(total), amountX, y, { align: "right" });

  y += 10;
  checkPageBreak(30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const paymentText = `Wir bitten Sie, den Rechnungsbetrag bis zum ${formatLongDate(invoice.dueDate)} auf das unten angegebene Konto zu überweisen. Bitte geben Sie den unten angegebenen Verwendungszweck an.`;
  const splitPayment = doc.splitTextToSize(paymentText, textWidth);
  doc.text(splitPayment, margin, y);
  y += splitPayment.length * 5 + 6;

  const bankBlockHeight = 28;
  const qrSize = bankBlockHeight - 4;
  checkPageBreak(bankBlockHeight + 2);
  const bankBlockY = y - 4;

  let qrDataUrl: string | null = null;
  // Kein Zahlungs-QR auf einem Entwurf: er lüde zur falschen Überweisung ein.
  if (org.iban && total > 0 && !invoice.draft) {
    try {
      qrDataUrl = await QRCode.toDataURL(
        buildEpcQrPayload(
          org.name,
          org.iban,
          total,
          invoice.paymentReference,
          org.bic,
        ),
        { errorCorrectionLevel: "M", margin: 1, width: 256 },
      );
    } catch {
      // Ein fehlender QR-Code ist kosmetisch.
    }
  }

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, bankBlockY, textWidth, bankBlockHeight, "F");

  let bankY = bankBlockY + 7;
  doc.setFont("helvetica", "bold");
  doc.text("Bankverbindung:", margin + 3, bankY);
  bankY += 6;
  doc.setFont("helvetica", "normal");
  doc.text(org.bankName, margin + 3, bankY);
  bankY += 5;
  doc.text(`IBAN: ${org.iban}`, margin + 3, bankY);
  doc.text(`BIC: ${org.bic}`, margin + 90, bankY);
  bankY += 5;
  doc.setFont("helvetica", "bold");
  doc.text(`Verwendungszweck: ${invoice.paymentReference}`, margin + 3, bankY);
  doc.setFont("helvetica", "normal");

  if (qrDataUrl) {
    try {
      const qrTop = bankBlockY + (bankBlockHeight - qrSize) / 2;
      doc.addImage(
        qrDataUrl,
        "PNG",
        rightEdge - qrSize - 4,
        qrTop,
        qrSize,
        qrSize,
      );
    } catch {
      // Bildfehler ignorieren.
    }
  }

  y = bankBlockY + bankBlockHeight + 8;
  const closingLines = invoice.closingText.trim()
    ? doc.splitTextToSize(invoice.closingText.trim(), textWidth)
    : [];
  const signatureLines = doc.splitTextToSize(invoice.signatureName, textWidth);
  // Genau so viel Platz, wie der Gruß braucht, bis knapp über die Fußlinie —
  // sonst landet er allein auf einer zweiten Seite.
  const closingHeight =
    (closingLines.length > 0 ? closingLines.length * 5 + 4 : 0) +
    8 +
    signatureLines.length * 5;
  if (y + closingHeight > pageHeight - 24) {
    doc.addPage();
    y = 20;
  }
  if (closingLines.length > 0) {
    doc.text(closingLines, margin, y);
    y += closingLines.length * 5 + 4;
  }
  doc.text("Mit freundlichen Grüßen", margin, y);
  y += 8;
  doc.setFont("helvetica", "italic");
  doc.text(signatureLines, margin, y);
  doc.setFont("helvetica", "normal");

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.setDrawColor(200);
    doc.line(margin, pageHeight - 20, rightEdge, pageHeight - 20);
    doc.text(org.name, margin, pageHeight - 15);
    doc.text(`IBAN: ${org.iban} | BIC: ${org.bic}`, margin, pageHeight - 10);
    if (pageCount > 1) {
      doc.text(`Seite ${page} von ${pageCount}`, rightEdge, pageHeight - 10, {
        align: "right",
      });
    }
    if (invoice.draft) drawWatermark(doc, "ENTWURF");
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
