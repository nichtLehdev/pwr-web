import { Button, Section, Text } from "@react-email/components";
import type { DownPaymentMailInfo } from "../down-payment";
import {
  DownPaymentSection,
  downPaymentSectionText,
} from "./down-payment-section";
import {
  EmailLayout,
  Regel,
  abschnittskopf,
  ersatzLink,
  grundtext,
  knopf,
  link,
} from "./email-layout";
import { emailText, textLink, textZeile } from "./email-text";
import { formatBerlin } from "@/lib/berlin-time";

export interface SplitPartMailInfo {
  registrationId: string;
  participantNames: string[];
  totalPrice: number;
  /** Magic link to this part of the registration. */
  manageUrl?: string;
  downPayment?: DownPaymentMailInfo | null;
}

interface CourseRegistrationSplitProps {
  registrantFirstName: string;
  registrantLastName: string;
  courseTitle: string;
  startDate: Date;
  endDate: Date;
  confirmed: SplitPartMailInfo;
  waitlist: SplitPartMailInfo;
  /** GiroCode der Anzahlung des bestätigten Teils als Inline-Anhang. */
  downPaymentHasQr: boolean;
  /** Geschwisterkindrabatt beantragt und noch nicht geprüft. */
  discountPending: boolean;
}

const formatDate = (date: Date) => formatBerlin(date, "datumZweistellig");

const formatPrice = (price: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    price,
  );

const EINLEITUNG =
  "vielen Dank für deine Anmeldung! Für den folgenden Kurs waren nicht mehr genug Plätze für alle frei. Wie von dir gewählt, haben wir deine Anmeldung aufgeteilt:";
const WARTELISTE_HINWEIS =
  "Sollten Plätze frei werden, benachrichtigen wir dich per E-Mail.";
const RABATT_HINWEIS =
  "Dein Antrag auf Geschwisterkindrabatt wird derzeit geprüft. Er gilt für beide Teile deiner Anmeldung; du erhältst eine separate E-Mail, sobald er genehmigt oder abgelehnt wurde.";
const WEITERE_INFOS =
  "Du erhältst in Kürze weitere Informationen zum Kurs per E-Mail. Bei Fragen kannst du dich gerne an uns wenden.";
const LINK_HINWEIS =
  "Über diese Links kannst du beide Teile deiner Anmeldung ändern oder stornieren — ganz ohne Benutzerkonto. Bitte gib sie nicht weiter.";

/**
 * Eine Mail für beide Teile einer aufgeteilten Anmeldung; zwei getrennte hätten
 * nebeneinander „bestätigt“ und „ausgebucht“ gemeldet.
 */
export function CourseRegistrationSplit({
  registrantFirstName,
  registrantLastName,
  courseTitle,
  startDate,
  endDate,
  confirmed,
  waitlist,
  downPaymentHasQr,
  discountPending,
}: CourseRegistrationSplitProps) {
  const priceSuffix = discountPending ? " (vorbehaltlich Rabattprüfung)" : "";

  return (
    <EmailLayout preview="Anmeldung teilweise bestätigt">
      <Text style={abschnittskopf}>Anmeldung teilweise bestätigt</Text>

      <Text style={grundtext}>
        Hallo {registrantFirstName} {registrantLastName},
      </Text>

      <Text style={grundtext}>{EINLEITUNG}</Text>

      <Regel stark />
      <Text style={unterTitel}>{courseTitle}</Text>
      <Text style={grundtext}>
        <strong>Start:</strong> {formatDate(startDate)}
      </Text>
      <Text style={grundtext}>
        <strong>Ende:</strong> {formatDate(endDate)}
      </Text>

      <Regel />
      <Text style={unterTitel}>✅ Bestätigt</Text>
      <Text style={grundtext}>{confirmed.participantNames.join(", ")}</Text>
      <Text style={grundtext}>
        <strong>Gesamtpreis{priceSuffix}:</strong>{" "}
        {formatPrice(confirmed.totalPrice)}
      </Text>

      {confirmed.downPayment && (
        <DownPaymentSection
          info={confirmed.downPayment}
          totalPrice={confirmed.totalPrice}
          hasQrCode={downPaymentHasQr}
        />
      )}

      <Regel />
      <Text style={unterTitel}>⏳ Auf der Warteliste</Text>
      <Text style={grundtext}>{waitlist.participantNames.join(", ")}</Text>
      <Text style={grundtext}>
        <strong>Gesamtpreis{priceSuffix}:</strong>{" "}
        {formatPrice(waitlist.totalPrice)}
      </Text>
      <Text style={grundtext}>{WARTELISTE_HINWEIS}</Text>

      {waitlist.downPayment && (
        <DownPaymentSection
          info={waitlist.downPayment}
          totalPrice={waitlist.totalPrice}
          hasQrCode={false}
        />
      )}

      {discountPending && (
        <>
          <Regel />
          <Text style={unterTitel}>Geschwisterkindrabatt</Text>
          <Text style={grundtext}>{RABATT_HINWEIS}</Text>
        </>
      )}

      <Regel />

      <Text style={grundtext}>{WEITERE_INFOS}</Text>

      {confirmed.manageUrl && waitlist.manageUrl && (
        <>
          <Section style={knopfFeld}>
            <Button style={knopf} href={confirmed.manageUrl}>
              Bestätigte Teilnehmer ansehen
            </Button>
          </Section>
          <Text style={zweitLinkFeld}>
            <a href={waitlist.manageUrl} style={link}>
              Warteliste ansehen
            </a>
          </Text>
          <Text style={grundtext}>
            {LINK_HINWEIS} Falls die Links nicht funktionieren, kopiere diese
            Adressen in deinen Browser:
          </Text>
          <Text style={ersatzLink}>Bestätigt: {confirmed.manageUrl}</Text>
          <Text style={ersatzLink}>Warteliste: {waitlist.manageUrl}</Text>
        </>
      )}

      <Text style={grundtext}>
        Deine Anmelde-IDs: <strong>{confirmed.registrationId}</strong>{" "}
        (bestätigt), <strong>{waitlist.registrationId}</strong> (Warteliste)
      </Text>
    </EmailLayout>
  );
}

const unterTitel = {
  ...abschnittskopf,
  fontSize: "18px",
  lineHeight: "24px",
  margin: "0 0 12px 0",
};

const knopfFeld = {
  textAlign: "center" as const,
  margin: "28px 0 12px 0",
};

/** Zweiter Weg als Textlink: Rahmen an Links verliert Outlook, ein zweiter voller Knopf konkurriert. */
const zweitLinkFeld = {
  ...grundtext,
  textAlign: "center" as const,
  margin: "0 0 28px 0",
};

/** Nur-Text-Fassung — gleicher Wortlaut, ohne Auszeichnung. */
export function courseRegistrationSplitText({
  registrantFirstName,
  registrantLastName,
  courseTitle,
  startDate,
  endDate,
  confirmed,
  waitlist,
  downPaymentHasQr,
  discountPending,
}: CourseRegistrationSplitProps): string {
  const priceSuffix = discountPending ? " (vorbehaltlich Rabattprüfung)" : "";

  return emailText([
    "ANMELDUNG TEILWEISE BESTÄTIGT",
    "",
    `Hallo ${registrantFirstName} ${registrantLastName},`,
    "",
    EINLEITUNG,
    "",
    courseTitle,
    textZeile("Start", formatDate(startDate)),
    textZeile("Ende", formatDate(endDate)),
    "",
    "BESTÄTIGT",
    confirmed.participantNames.join(", "),
    textZeile(`Gesamtpreis${priceSuffix}`, formatPrice(confirmed.totalPrice)),
    ...(confirmed.downPayment
      ? downPaymentSectionText({
          info: confirmed.downPayment,
          totalPrice: confirmed.totalPrice,
          hasQrCode: downPaymentHasQr,
        })
      : []),
    "",
    "AUF DER WARTELISTE",
    waitlist.participantNames.join(", "),
    textZeile(`Gesamtpreis${priceSuffix}`, formatPrice(waitlist.totalPrice)),
    WARTELISTE_HINWEIS,
    ...(waitlist.downPayment
      ? downPaymentSectionText({
          info: waitlist.downPayment,
          totalPrice: waitlist.totalPrice,
          hasQrCode: false,
        })
      : []),
    ...(discountPending ? ["", RABATT_HINWEIS] : []),
    "",
    WEITERE_INFOS,
    ...(confirmed.manageUrl && waitlist.manageUrl
      ? [
          "",
          textLink("Bestätigte Teilnehmer ansehen:", confirmed.manageUrl),
          "",
          textLink("Warteliste ansehen:", waitlist.manageUrl),
          "",
          LINK_HINWEIS,
        ]
      : []),
    "",
    `Deine Anmelde-IDs: ${confirmed.registrationId} (bestätigt), ${waitlist.registrationId} (Warteliste)`,
  ]);
}
