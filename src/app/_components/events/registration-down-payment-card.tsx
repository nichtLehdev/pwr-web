"use client";

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
import {
  DownPaymentQrFigure,
  transferDetailRows,
} from "./down-payment-transfer-details";
import { Panel } from "@/app/_components/programmheft/panel";
import { Heading } from "@/app/_components/programmheft/section-head";
import { ValueTable } from "@/app/_components/programmheft/value-table";
import { Tag } from "@/app/_components/programmheft/tag";

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

/** Anzahlung der Anmeldenden; solange etwas offen ist, auch die Überweisungsdaten (falls die Mail fehlt). */
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
  const reference = downPaymentReference(
    course.courseNumber,
    registration.registrantFirstName,
    registration.registrantLastName,
  );
  const isWaitlist = registration.registrationStatus === "WAITLIST";
  const showTransferRows = !isWaitlist && open > 0;

  return (
    <Panel as="section" labelledBy="anzahlung-heading" className="mb-6">
      <Heading as="h2" id="anzahlung-heading" size="list">
        Anzahlung
      </Heading>
      <ValueTable
        className="mt-4"
        rows={[
          {
            label: "Status",
            value: <Tag tone="inverse">{DOWN_PAYMENT_STATE_LABELS[state]}</Tag>,
          },
          { label: "Anzahlung", value: formatEuro(amount) },
          {
            label: "Restbetrag (vor Kursbeginn)",
            value: formatEuro(remainder),
          },
          ...(showTransferRows
            ? [
                { label: "Zu überweisen", value: formatEuro(open) },
                ...transferDetailRows(open, reference),
              ]
            : []),
        ]}
      />

      {isWaitlist ? (
        <p className="text-dark dark:text-night-muted mt-4 text-sm">
          Die Anzahlung wird erst fällig, wenn Ihr Platz bestätigt ist.
        </p>
      ) : showTransferRows ? (
        <DownPaymentQrFigure amount={open} reference={reference} />
      ) : null}

      <p className="text-dark dark:text-night-muted mt-4 text-xs">
        {refundNotice} Für zusätzliche oder entfallende Teilnehmer und für eine
        Stornierung wenden Sie sich bitte an das Kursteam.
      </p>
    </Panel>
  );
}
