import { Text } from "@react-email/components";
import type { DownPaymentMailInfo } from "../down-payment";
import {
  DownPaymentSection,
  downPaymentSectionText,
} from "./down-payment-section";
import { EmailLayout, Regel, abschnittskopf, grundtext } from "./email-layout";
import { emailText, textZeile } from "./email-text";
import {
  ManageRegistrationCta,
  manageRegistrationCtaText,
} from "./manage-registration-cta";

interface CourseRegistrationConfirmedProps {
  registrantFirstName: string;
  registrantLastName: string;
  courseTitle: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
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

export function CourseRegistrationConfirmed({
  registrantFirstName,
  registrantLastName,
  courseTitle,
  startDate,
  endDate,
  totalPrice,
  participantsCount,
  registrationId,
  manageUrl,
  downPayment,
  downPaymentHasQr = false,
}: CourseRegistrationConfirmedProps) {
  return (
    <EmailLayout preview="Anmeldung bestätigt">
      <Text style={abschnittskopf}>Anmeldung bestätigt</Text>

      <Text style={grundtext}>
        Hallo {registrantFirstName} {registrantLastName},
      </Text>

      <Text style={grundtext}>
        vielen Dank für deine Anmeldung! Deine Anmeldung für den folgenden Kurs
        wurde erfolgreich bestätigt:
      </Text>

      <Regel stark />
      <Text style={kursTitel}>{courseTitle}</Text>
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
      <Text style={grundtext}>
        <strong>Gesamtpreis:</strong> {formatPrice(totalPrice)}
      </Text>

      {downPayment && (
        <DownPaymentSection
          info={downPayment}
          totalPrice={totalPrice}
          hasQrCode={downPaymentHasQr}
        />
      )}

      <Regel />

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

/** Kurstitel als Sub-Überschrift über der Werttabelle. */
const kursTitel = {
  ...abschnittskopf,
  fontSize: "18px",
  lineHeight: "24px",
  margin: "0 0 12px 0",
};

/** Nur-Text-Fassung — gleicher Wortlaut, ohne Auszeichnung. */
export function courseRegistrationConfirmedText({
  registrantFirstName,
  registrantLastName,
  courseTitle,
  startDate,
  endDate,
  totalPrice,
  participantsCount,
  registrationId,
  manageUrl,
  downPayment,
  downPaymentHasQr = false,
}: CourseRegistrationConfirmedProps): string {
  return emailText([
    "ANMELDUNG BESTÄTIGT",
    "",
    `Hallo ${registrantFirstName} ${registrantLastName},`,
    "",
    "vielen Dank für deine Anmeldung! Deine Anmeldung für den folgenden Kurs wurde erfolgreich bestätigt:",
    "",
    courseTitle,
    textZeile("Start", formatDate(startDate)),
    textZeile("Ende", formatDate(endDate)),
    textZeile(
      "Teilnehmer",
      `${participantsCount} ${participantsCount === 1 ? "Person" : "Personen"}`,
    ),
    textZeile("Gesamtpreis", formatPrice(totalPrice)),
    ...(downPayment
      ? downPaymentSectionText({
          info: downPayment,
          totalPrice,
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
