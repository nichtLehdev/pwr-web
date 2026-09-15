/**
 * Anzahlungsblock der Anmeldemails: Betrag, Bankverbindung, Verwendungszweck
 * und GiroCode — dieselben Angaben wie im letzten Schritt des Anmeldeformulars.
 *
 * Der QR-Code geht als Inline-Anhang (CID) mit, nicht als data:-URL: viele
 * Mailprogramme (Gmail vorneweg) blenden eingebettete data:-Bilder aus.
 */
import QRCode from "qrcode";
import { buildEpcQrPayload } from "@/lib/epc-qr";
import { DEFAULT_INVOICE_ORGANIZATION } from "@/lib/invoice-document";
import {
  downPaymentReference,
  downPaymentRefundNotice,
  type DownPaymentRefundPolicyValue,
  type DownPaymentStatusValue,
} from "@/lib/course-down-payment";
import type { EmailAttachment } from "./send-email";
import { createLogger } from "@/server/utils/logger";

const log = createLogger("Email");

export const DOWN_PAYMENT_QR_CID = "anzahlung-girocode";

export type DownPaymentMailInfo = {
  amount: number;
  reference: string;
  refundNotice: string;
  /**
   * Auf der Warteliste steht der Betrag fest, fällig wird er aber erst mit der
   * Platzbestätigung — dann ohne Bankdaten, damit niemand zu früh überweist.
   */
  dueNow: boolean;
  /** Schon eingegangen, etwa weil das Team sie bei der Erfassung verbucht hat. */
  alreadyPaid: boolean;
  beneficiary: string;
  iban: string;
  bic: string;
  bankName: string;
};

export function downPaymentMailInfo(
  registration: {
    downPaymentAmount: number | null;
    downPaymentStatus: DownPaymentStatusValue | null;
    registrantFirstName: string;
    registrantLastName: string;
    registrationStatus: "CONFIRMED" | "WAITLIST" | "CANCELLED";
  },
  course: {
    courseNumber: string | null;
    downPaymentRefundPolicy: DownPaymentRefundPolicyValue;
    downPaymentRefundText: string | null;
  },
): DownPaymentMailInfo | null {
  if (!registration.downPaymentAmount || !registration.downPaymentStatus) {
    return null;
  }
  const org = DEFAULT_INVOICE_ORGANIZATION;
  return {
    amount: registration.downPaymentAmount,
    reference: downPaymentReference(
      course.courseNumber,
      registration.registrantFirstName,
      registration.registrantLastName,
    ),
    refundNotice: downPaymentRefundNotice(course),
    dueNow: registration.registrationStatus === "CONFIRMED",
    alreadyPaid: registration.downPaymentStatus !== "OPEN",
    beneficiary: org.name,
    iban: org.iban,
    bic: org.bic,
    bankName: org.bankName,
  };
}

/** GiroCode als Inline-Bild — nur, wenn jetzt tatsächlich überwiesen werden soll. */
export async function downPaymentQrAttachment(
  info: DownPaymentMailInfo,
): Promise<EmailAttachment | null> {
  if (!info.dueNow || info.alreadyPaid) return null;
  try {
    const content = await QRCode.toBuffer(
      buildEpcQrPayload(
        info.beneficiary,
        info.iban,
        info.amount,
        info.reference,
        info.bic,
      ),
      { type: "png", width: 320, margin: 1, errorCorrectionLevel: "M" },
    );
    return {
      filename: "anzahlung-girocode.png",
      content,
      cid: DOWN_PAYMENT_QR_CID,
      contentType: "image/png",
    };
  } catch (error) {
    // Ohne QR-Code bleiben die Bankdaten als Text — die Mail geht trotzdem raus.
    log.error("Failed to render down payment QR code:", error);
    return null;
  }
}
