"use client";

import { Landmark } from "lucide-react";
import { formatEuro } from "@/lib/invoice-document";
import { roundMoney } from "@/lib/sibling-discount";
import {
  DOWN_PAYMENT_STATE_LABELS,
  downPaymentOpenAmount,
  downPaymentReference,
  downPaymentRefundNotice,
  downPaymentState,
  type DownPaymentRefundPolicyValue,
  type DownPaymentStatusValue,
} from "@/lib/course-down-payment";
import { DownPaymentTransferDetails } from "./down-payment-transfer-details";

interface RegistrationDownPaymentCardProps {
  registration: {
    registrantFirstName: string;
    registrantLastName: string;
    registrationStatus: "CONFIRMED" | "WAITLIST" | "CANCELLED";
    totalPrice: number;
    downPaymentAmount: number | null;
    downPaymentStatus: DownPaymentStatusValue | null;
    downPaymentPaidAmount: number | null;
  };
  course: {
    courseNumber: string | null;
    downPaymentRefundPolicy: DownPaymentRefundPolicyValue;
    downPaymentRefundText: string | null;
  };
}

/**
 * Anzahlung auf der Anmeldungsseite der Anmeldenden: Stand, Restbetrag und —
 * solange noch etwas offen ist — die Überweisungsdaten, falls die Mail
 * verloren gegangen ist.
 */
export function RegistrationDownPaymentCard({
  registration,
  course,
}: RegistrationDownPaymentCardProps) {
  const amount = registration.downPaymentAmount;
  if (!amount) return null;

  const state = downPaymentState(registration);
  const open = downPaymentOpenAmount(registration);
  const remainder = Math.max(0, roundMoney(registration.totalPrice - amount));
  const refundNotice = downPaymentRefundNotice(course);

  return (
    <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-dark dark:text-dark-text mb-4 flex items-center gap-2 text-lg font-semibold">
        <Landmark className="text-primary h-5 w-5" />
        Anzahlung
      </h2>
      <dl className="mb-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-gray-600 dark:text-gray-400">Anzahlung</dt>
          <dd className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <span className="dark:bg-dark-background-secondary rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">
              {DOWN_PAYMENT_STATE_LABELS[state]}
            </span>
            <span className="font-semibold">{formatEuro(amount)}</span>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-gray-600 dark:text-gray-400">
            Restbetrag (vor Kursbeginn)
          </dt>
          <dd className="font-semibold text-gray-900 dark:text-gray-100">
            {formatEuro(remainder)}
          </dd>
        </div>
      </dl>

      {registration.registrationStatus === "WAITLIST" ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Die Anzahlung wird erst fällig, wenn Ihr Platz bestätigt ist.
        </p>
      ) : open > 0 ? (
        <>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Bitte überweisen Sie {formatEuro(open)} auf folgendes Konto:
          </p>
          <DownPaymentTransferDetails
            amount={open}
            reference={downPaymentReference(
              course.courseNumber,
              registration.registrantFirstName,
              registration.registrantLastName,
            )}
          />
        </>
      ) : null}

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        {refundNotice} Für zusätzliche oder entfallende Teilnehmer und für eine
        Stornierung wenden Sie sich bitte an das Kursteam.
      </p>
    </div>
  );
}
