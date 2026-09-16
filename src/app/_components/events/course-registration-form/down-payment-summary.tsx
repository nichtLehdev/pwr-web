"use client";

import type { CourseWithRelations, RegistrationData } from "./types";
import { formatEuro } from "@/lib/invoice-document";
import { roundMoney } from "@/lib/sibling-discount";
import {
  downPaymentReference,
  downPaymentRefundNotice,
} from "@/lib/course-down-payment";
import {
  DownPaymentQrFigure,
  transferDetailRows,
} from "../down-payment-transfer-details";
import { Panel } from "@/app/_components/programmheft/panel";
import { Heading } from "@/app/_components/programmheft/section-head";
import { ValueTable } from "@/app/_components/programmheft/value-table";

interface DownPaymentSummaryProps {
  course: CourseWithRelations;
  registrationData: RegistrationData;
  /** Anzahlung dieser Anmeldung, siehe `calculateDownPayment`. */
  amount: number;
  totalPrice: number;
  isWaitlist: boolean;
  /**
   * Die Bestätigung der Hinweise — nur bei der öffentlichen Anmeldung. Erfasst
   * das Kursteam, gilt sie mit dessen Zustimmungs-Häkchen als gegeben.
   */
  acknowledgement?: {
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
  /**
   * Die Anmeldung erscheint unter „Meine Anmeldungen“: angemeldet und mit der
   * E-Mail-Adresse des Kontos angemeldet — nur danach sucht diese Seite.
   */
  listedInMyRegistrations: boolean;
}

/**
 * Anzahlung im letzten Schritt: Preisaufteilung, Überweisungsdaten mit
 * GiroCode und der Erstattungshinweis, den die Anmeldung bestätigen muss.
 * Dieselben Angaben gehen mit der Bestätigungsmail noch einmal hinaus — der
 * Hinweis darauf erspart das Abschreiben der Bankdaten vor dem Absenden.
 */
export function DownPaymentSummary({
  course,
  registrationData,
  amount,
  totalPrice,
  isWaitlist,
  acknowledgement,
  listedInMyRegistrations,
}: DownPaymentSummaryProps) {
  const reference = downPaymentReference(
    course.courseNumber,
    registrationData.registrantFirstName,
    registrationData.registrantLastName,
  );
  const refundNotice = downPaymentRefundNotice(course);
  const remainder = Math.max(0, roundMoney(totalPrice - amount));
  const remainderLabel =
    registrationData.paymentMethod === "CASH"
      ? "Restbetrag (bar vor Ort)"
      : "Restbetrag (nach Erhalt der Rechnung)";

  return (
    <Panel as="section" labelledBy="anzahlung-summary-heading">
      <Heading as="h4" id="anzahlung-summary-heading" size="list">
        Anzahlung
      </Heading>

      <ValueTable
        className="mt-4"
        rows={[
          { label: "Gesamtpreis", value: formatEuro(totalPrice) },
          {
            label: isWaitlist
              ? "Anzahlung (nach Platzbestätigung)"
              : "Anzahlung (jetzt fällig)",
            value: formatEuro(amount),
          },
          { label: remainderLabel, value: formatEuro(remainder) },
          ...(!isWaitlist ? transferDetailRows(amount, reference) : []),
        ]}
      />

      {isWaitlist ? (
        <p className="text-dark dark:text-night-muted mt-4 text-sm">
          Die Anzahlung wird erst fällig, wenn Ihr Platz bestätigt ist. Betrag,
          Bankverbindung und Verwendungszweck erhalten Sie dann mit der
          Bestätigung per E-Mail
          {listedInMyRegistrations
            ? " und finden sie ab dann auch unter „Meine Anmeldungen“"
            : ""}
          .
        </p>
      ) : (
        <div className="mt-4">
          <DownPaymentQrFigure amount={amount} reference={reference} />
          {acknowledgement && (
            <p className="text-dark dark:text-night-muted mt-3 text-sm">
              Alle Angaben zur Anzahlung – Betrag, Bankverbindung und
              Verwendungszweck – finden Sie auch in Ihrer Bestätigungsmail
              {listedInMyRegistrations
                ? " und jederzeit unter „Meine Anmeldungen“"
                : ""}
              .
            </p>
          )}
        </div>
      )}

      {acknowledgement ? (
        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={acknowledgement.checked}
            onChange={(e) => acknowledgement.onChange(e.target.checked)}
            required
            className="border-ink dark:border-night-text mt-1 h-4 w-4 shrink-0 rounded-none"
          />
          <span className="text-ink dark:text-night-text text-sm">
            Ich überweise die Anzahlung von {formatEuro(amount)}{" "}
            {isWaitlist ? "nach der Platzbestätigung" : "zeitnah"} mit dem
            angegebenen Verwendungszweck. {refundNotice} Teilnehmer hinzufügen,
            entfernen oder die Anmeldung stornieren kann danach nur noch das
            Kursteam.
          </span>
        </label>
      ) : (
        refundNotice && (
          <p className="text-dark dark:text-night-muted mt-3 text-xs">
            {refundNotice}
          </p>
        )
      )}
    </Panel>
  );
}
