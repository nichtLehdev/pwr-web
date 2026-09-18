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
import { formatBerlin } from "@/lib/berlin-time";

interface CourseRegistrationWaitlistProps {
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
}

const formatDate = (date: Date) => formatBerlin(date, "datumZweistellig");

const formatPrice = (price: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    price,
  );

export function CourseRegistrationWaitlist({
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
}: CourseRegistrationWaitlistProps) {
  return (
    <EmailLayout preview="Auf Warteliste gesetzt">
      <Text style={abschnittskopf}>Auf Warteliste gesetzt</Text>

      <Text style={grundtext}>
        Hallo {registrantFirstName} {registrantLastName},
      </Text>

      <Text style={grundtext}>
        vielen Dank für deine Anmeldung! Leider ist der folgende Kurs bereits
        vollständig ausgebucht. Wir haben dich auf die Warteliste gesetzt:
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
          hasQrCode={false}
        />
      )}

      <Regel />

      <Text style={grundtext}>
        Sollte ein Platz frei werden, werden wir dich umgehend per E-Mail
        benachrichtigen. Du erhältst dann eine Bestätigung deiner Anmeldung.
      </Text>

      <Text style={grundtext}>
        Falls du Fragen hast oder deine Anmeldung stornieren möchtest, kannst du
        dich gerne an uns wenden.
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
export function courseRegistrationWaitlistText({
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
}: CourseRegistrationWaitlistProps): string {
  return emailText([
    "AUF WARTELISTE GESETZT",
    "",
    `Hallo ${registrantFirstName} ${registrantLastName},`,
    "",
    "vielen Dank für deine Anmeldung! Leider ist der folgende Kurs bereits vollständig ausgebucht. Wir haben dich auf die Warteliste gesetzt:",
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
          hasQrCode: false,
        })
      : []),
    "",
    "Sollte ein Platz frei werden, werden wir dich umgehend per E-Mail benachrichtigen. Du erhältst dann eine Bestätigung deiner Anmeldung.",
    "",
    "Falls du Fragen hast oder deine Anmeldung stornieren möchtest, kannst du dich gerne an uns wenden.",
    ...manageRegistrationCtaText({ manageUrl }),
    "",
    `Deine Anmelde-ID: ${registrationId}`,
  ]);
}
