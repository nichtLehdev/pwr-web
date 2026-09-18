"use client";

import { useId } from "react";
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
   * Aufgeteilt: `amount`/`totalPrice` gelten den Bestätigten, dies ist die Anzahlung der
   * Wartenden — fällig erst mit deren Platzbestätigung.
   */
  waitlistAmount?: number | null;
  /** Nur öffentlich; beim Kursteam gilt sie mit dessen Zustimmungs-Häkchen als gegeben. */
  acknowledgement?: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    /** Meldung am Kästchen, wenn „Verbindlich anmelden“ ohne Haken scheitert. */
    problem?: string;
  };
  /** „Meine Anmeldungen“ sucht nur nach der E-Mail-Adresse des Kontos. */
  listedInMyRegistrations: boolean;
}

/** Anzahlung im letzten Schritt: Preisaufteilung, Überweisungsdaten mit GiroCode, Erstattungshinweis. */
export function DownPaymentSummary({
  course,
  registrationData,
  amount,
  totalPrice,
  isWaitlist,
  waitlistAmount,
  acknowledgement,
  listedInMyRegistrations,
}: DownPaymentSummaryProps) {
  const problemId = useId();
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

      {waitlistAmount != null && waitlistAmount > 0 && (
        <p className="text-dark dark:text-night-muted mt-3 text-sm">
          Die Beträge gelten für die bestätigten Teilnehmer. Für die Teilnehmer
          auf der Warteliste wird eine Anzahlung von{" "}
          {formatEuro(waitlistAmount)} erst mit deren Platzbestätigung fällig.
        </p>
      )}

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
        <div className="mt-4">
          {/* Die ganze Beschriftung ist Trefferfläche, mindestens 44px hoch. */}
          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={acknowledgement.checked}
              onChange={(e) => acknowledgement.onChange(e.target.checked)}
              required
              data-focus-key="downPaymentAcknowledged"
              aria-invalid={acknowledgement.problem ? true : undefined}
              aria-describedby={acknowledgement.problem ? problemId : undefined}
              className="border-ink dark:border-night-text mt-1 h-4 w-4 shrink-0 rounded-none"
            />
            <span className="text-ink dark:text-night-text text-sm">
              Ich überweise die Anzahlung von {formatEuro(amount)}{" "}
              {isWaitlist ? "nach der Platzbestätigung" : "zeitnah"} mit dem
              angegebenen Verwendungszweck. {refundNotice} Teilnehmer
              hinzufügen, entfernen oder die Anmeldung stornieren kann danach
              nur noch das Kursteam.
            </span>
          </label>
          {acknowledgement.problem ? (
            <p
              id={problemId}
              className="mt-1 text-sm font-medium text-red-700 dark:text-red-400"
            >
              {acknowledgement.problem}
            </p>
          ) : null}
        </div>
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
