"use client";

import { Landmark } from "lucide-react";
import type { CourseWithRelations, RegistrationData } from "./types";
import { formatEuro } from "@/lib/invoice-document";
import { roundMoney } from "@/lib/sibling-discount";
import {
  downPaymentReference,
  downPaymentRefundNotice,
} from "@/lib/course-down-payment";
import { DownPaymentTransferDetails } from "../down-payment-transfer-details";

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
}

/**
 * Anzahlung im letzten Schritt: Preisaufteilung, Überweisungsdaten mit
 * GiroCode und der Erstattungshinweis, den die Anmeldung bestätigen muss.
 * Dieselben Angaben gehen mit der Bestätigungsmail noch einmal hinaus.
 */
export function DownPaymentSummary({
  course,
  registrationData,
  amount,
  totalPrice,
  isWaitlist,
  acknowledgement,
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
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 sm:p-6 dark:border-amber-800 dark:bg-amber-900/20">
      <h4 className="text-dark dark:text-dark-text mb-3 flex items-center gap-2 font-bold">
        <Landmark className="text-primary h-5 w-5" aria-hidden />
        Anzahlung
      </h4>

      <dl className="space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-gray-700 dark:text-gray-300">Gesamtpreis</dt>
          <dd className="font-semibold text-gray-900 dark:text-gray-100">
            {formatEuro(totalPrice)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gray-700 dark:text-gray-300">
            {isWaitlist
              ? "Anzahlung (nach Platzbestätigung)"
              : "Anzahlung (jetzt fällig)"}
          </dt>
          <dd className="font-semibold text-gray-900 dark:text-gray-100">
            {formatEuro(amount)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gray-700 dark:text-gray-300">{remainderLabel}</dt>
          <dd className="font-semibold text-gray-900 dark:text-gray-100">
            {formatEuro(remainder)}
          </dd>
        </div>
      </dl>

      {isWaitlist ? (
        <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
          Die Anzahlung wird erst fällig, wenn Ihr Platz bestätigt ist. Die
          Überweisungsdaten erhalten Sie dann mit der Bestätigung per E-Mail.
        </p>
      ) : (
        <div className="mt-4">
          <DownPaymentTransferDetails amount={amount} reference={reference} />
        </div>
      )}

      {acknowledgement ? (
        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={acknowledgement.checked}
            onChange={(e) => acknowledgement.onChange(e.target.checked)}
            required
            className="text-primary focus:ring-primary mt-1 h-4 w-4"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Ich überweise die Anzahlung von {formatEuro(amount)}{" "}
            {isWaitlist ? "nach der Platzbestätigung" : "zeitnah"} mit dem
            angegebenen Verwendungszweck. {refundNotice} Teilnehmer hinzufügen,
            entfernen oder die Anmeldung stornieren kann danach nur noch das
            Kursteam.
          </span>
        </label>
      ) : (
        refundNotice && (
          <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
            {refundNotice}
          </p>
        )
      )}
    </div>
  );
}
