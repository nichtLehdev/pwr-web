import { Hr, Text } from "@react-email/components";
import type { DownPaymentMailInfo } from "../down-payment";
import {
  DownPaymentSection,
  downPaymentSectionText,
} from "./down-payment-section";
import {
  EmailLayout,
  abschnittskopf,
  grundtext,
  haarlinie,
  tintenstrich,
} from "./email-layout";
import { emailText, textZeile } from "./email-text";
import {
  ManageRegistrationCta,
  manageRegistrationCtaText,
} from "./manage-registration-cta";

interface CourseRegistrationPendingDiscountProps {
  registrantFirstName: string;
  registrantLastName: string;
  courseTitle: string;
  startDate: Date;
  endDate: Date;
  originalTotalPrice: number;
  discountAmount: number;
  finalTotalPrice: number;
  participantsCount: number;
  registrationId: string;
  /** Magic link letting the registrant manage the anmeldung without an account. */
  manageUrl?: string;
  downPayment?: DownPaymentMailInfo | null;
  downPaymentHasQr?: boolean;
}

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

const formatPrice = (price: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    price,
  );

export function CourseRegistrationPendingDiscount({
  registrantFirstName,
  registrantLastName,
  courseTitle,
  startDate,
  endDate,
  originalTotalPrice,
  discountAmount,
  finalTotalPrice,
  participantsCount,
  registrationId,
  manageUrl,
  downPayment,
  downPaymentHasQr = false,
}: CourseRegistrationPendingDiscountProps) {
  return (
    <EmailLayout preview="Anmeldung erhalten (Rabatt wird geprüft)">
      <Text style={abschnittskopf}>Anmeldung erhalten</Text>

      <Text style={grundtext}>
        Hallo {registrantFirstName} {registrantLastName},
      </Text>

      <Text style={grundtext}>
        vielen Dank für deine Anmeldung! Wir haben deine Anmeldung für den
        folgenden Kurs erhalten:
      </Text>

      <Hr style={tintenstrich} />
      <Text style={unterTitel}>{courseTitle}</Text>
      <Text style={grundtext}>
        <strong>Start:</strong> {formatDate(startDate)}
      </Text>
      <Text style={grundtext}>
        <strong>Ende:</strong> {formatDate(endDate)}
      </Text>
      <Text style={grundtext}>
        <strong>Teilnehmer:</strong> {participantsCount}{" "}
        {participantsCount === 1 ? "Person" : "Personen"}
      </Text>

      <Hr style={haarlinie} />
      <Text style={unterTitel}>Preisübersicht</Text>
      <Text style={grundtext}>
        <strong>Ursprünglicher Gesamtbetrag:</strong>{" "}
        {formatPrice(originalTotalPrice)}
      </Text>
      <Text style={grundtext}>
        <strong>Geschwisterkindrabatt (20% pro weiteres Kind):</strong> -
        {formatPrice(discountAmount)}
      </Text>
      <Hr style={tintenstrich} />
      <Text style={grundtext}>
        <strong>Gesamtbetrag (vorbehaltlich Genehmigung):</strong>{" "}
        {formatPrice(finalTotalPrice)}
      </Text>

      <Hr style={haarlinie} />
      <Text style={unterTitel}>⏳ Rabatt prüfen</Text>
      <Text style={grundtext}>
        Dein Antrag auf Geschwisterkindrabatt wird derzeit geprüft. Du erhältst
        eine separate E-Mail, sobald der Rabatt genehmigt oder abgelehnt wurde.
        Deine Anmeldung ist bereits reserviert, auch während der Prüfung.
      </Text>

      {downPayment && (
        <DownPaymentSection
          info={downPayment}
          totalPrice={finalTotalPrice}
          hasQrCode={downPaymentHasQr}
        />
      )}

      <Hr style={haarlinie} />

      <Text style={grundtext}>
        Du erhältst in Kürze weitere Informationen zum Kurs per E-Mail. Bei
        Fragen kannst du dich gerne an uns wenden.
      </Text>

      <ManageRegistrationCta manageUrl={manageUrl} />

      <Text style={grundtext}>
        Deine Anmelde-ID: <strong>{registrationId}</strong>
      </Text>
    </EmailLayout>
  );
}

/** Sub-Überschrift für Kurstitel und Abschnitte wie „Preisübersicht". */
const unterTitel = {
  ...abschnittskopf,
  fontSize: "18px",
  lineHeight: "24px",
  margin: "0 0 12px 0",
};

/** Nur-Text-Fassung — gleicher Wortlaut, ohne Auszeichnung. */
export function courseRegistrationPendingDiscountText({
  registrantFirstName,
  registrantLastName,
  courseTitle,
  startDate,
  endDate,
  originalTotalPrice,
  discountAmount,
  finalTotalPrice,
  participantsCount,
  registrationId,
  manageUrl,
  downPayment,
  downPaymentHasQr = false,
}: CourseRegistrationPendingDiscountProps): string {
  return emailText([
    "ANMELDUNG ERHALTEN",
    "",
    `Hallo ${registrantFirstName} ${registrantLastName},`,
    "",
    "vielen Dank für deine Anmeldung! Wir haben deine Anmeldung für den folgenden Kurs erhalten:",
    "",
    courseTitle,
    textZeile("Start", formatDate(startDate)),
    textZeile("Ende", formatDate(endDate)),
    textZeile(
      "Teilnehmer",
      `${participantsCount} ${participantsCount === 1 ? "Person" : "Personen"}`,
    ),
    "",
    "PREISÜBERSICHT",
    // Lange Beschriftungen wie im HTML — textZeile richtet nur bis 18 Zeichen
    // aus, das reicht hier nicht für ein trennendes Leerzeichen.
    `Ursprünglicher Gesamtbetrag: ${formatPrice(originalTotalPrice)}`,
    `Geschwisterkindrabatt (20% pro weiteres Kind): -${formatPrice(discountAmount)}`,
    `Gesamtbetrag (vorbehaltlich Genehmigung): ${formatPrice(finalTotalPrice)}`,
    "",
    "RABATT PRÜFEN",
    "Dein Antrag auf Geschwisterkindrabatt wird derzeit geprüft. Du erhältst eine separate E-Mail, sobald der Rabatt genehmigt oder abgelehnt wurde. Deine Anmeldung ist bereits reserviert, auch während der Prüfung.",
    ...(downPayment
      ? downPaymentSectionText({
          info: downPayment,
          totalPrice: finalTotalPrice,
          hasQrCode: downPaymentHasQr,
        })
      : []),
    "",
    "Du erhältst in Kürze weitere Informationen zum Kurs per E-Mail. Bei Fragen kannst du dich gerne an uns wenden.",
    ...manageRegistrationCtaText({ manageUrl }),
    "",
    `Deine Anmelde-ID: ${registrationId}`,
  ]);
}
