import { Button, Section, Text } from "@react-email/components";
import {
  EmailLayout,
  Regel,
  abschnittskopf,
  ersatzLink,
  grundtext,
  knopf,
} from "./email-layout";
import { emailText, textLink, textZeile } from "./email-text";
import { formatBerlin } from "@/lib/berlin-time";

const formatDate = (date: Date) => formatBerlin(date, "datumZweistellig");

/** Frist mit Uhrzeit, im deutschen Kalendertag — nicht in der Serverzeitzone. */
const formatDateTime = (date: Date) =>
  `${formatBerlin(date, "datumUhrzeit")} Uhr`;

const seatsText = (seats: number) =>
  seats === 1 ? "1 Platz" : `${seats} Plätze`;

const ERSATZ_HINWEIS =
  "Falls der Button nicht funktioniert, kopiere diese Adresse in deinen Browser:";

function Cta({ href, label }: { href?: string; label: string }) {
  if (!href) return null;
  return (
    <>
      <Section style={knopfFeld}>
        <Button style={knopf} href={href}>
          {label}
        </Button>
      </Section>
      <Text style={grundtext}>{ERSATZ_HINWEIS}</Text>
      <Text style={ersatzLink}>{href}</Text>
    </>
  );
}

const ctaText = (href: string | undefined, label: string): string[] =>
  href ? ["", textLink(`${label}:`, href)] : [];

export interface WaitlistPromotionOfferProps {
  registrantFirstName: string;
  registrantLastName: string;
  courseTitle: string;
  startDate: Date;
  endDate: Date;
  participantNames: string[];
  /** Wie viele der Teilnehmer die freien Plätze nutzen könnten. */
  seats: number;
  expiresAt: Date;
  /** Magic link to the registration, where the choice is made. */
  manageUrl?: string;
  /** Mit dem Nachrücken wird für die Gewählten eine Anzahlung fällig. */
  hasDownPayment: boolean;
}

const offerAuswahl = (hasDownPayment: boolean) =>
  `Du kannst wählen, wer nachrückt: Die Gewählten sind dann bestätigt, die übrigen bleiben auf der Warteliste.${hasDownPayment ? " Für die Nachrückenden wird dann die Anzahlung fällig." : ""}`;
const OFFER_ABLEHNEN =
  "Möchtet ihr lieber gemeinsam warten, lehne das Angebot ab. Das Kursteam kann die Plätze dann den Nächsten auf der Warteliste anbieten, und deine Anmeldung behält ihren Platz. Das gilt ebenso, wenn die Frist verstreicht.";

/**
 * Angebot an die erste wartende Anmeldung, wenn die frei gewordenen Plätze
 * nicht für alle ihre Teilnehmer reichen.
 */
export function WaitlistPromotionOffer({
  registrantFirstName,
  registrantLastName,
  courseTitle,
  startDate,
  endDate,
  participantNames,
  seats,
  expiresAt,
  manageUrl,
  hasDownPayment,
}: WaitlistPromotionOfferProps) {
  return (
    <EmailLayout
      preview={`Plätze frei geworden – Antwort bis ${formatDateTime(expiresAt)}`}
    >
      <Text style={abschnittskopf}>Plätze frei geworden</Text>
      <Text style={grundtext}>
        Hallo {registrantFirstName} {registrantLastName},
      </Text>
      <Text style={grundtext}>
        für deine Anmeldung auf der Warteliste sind Plätze frei geworden:
      </Text>

      <Regel stark />
      <Text style={unterTitel}>{courseTitle}</Text>
      <Text style={grundtext}>
        <strong>Start:</strong> {formatDate(startDate)}
      </Text>
      <Text style={grundtext}>
        <strong>Ende:</strong> {formatDate(endDate)}
      </Text>

      <Regel />
      <Text style={unterTitel}>
        {seatsText(seats)} frei – für {participantNames.length} Teilnehmer
      </Text>
      <Text style={grundtext}>{participantNames.join(", ")}</Text>
      <Text style={grundtext}>
        <strong>Antwort bis:</strong> {formatDateTime(expiresAt)}
      </Text>

      <Regel />
      <Text style={grundtext}>{offerAuswahl(hasDownPayment)}</Text>
      <Text style={grundtext}>{OFFER_ABLEHNEN}</Text>

      <Cta href={manageUrl} label="Jetzt auswählen" />
    </EmailLayout>
  );
}

export function waitlistPromotionOfferText({
  registrantFirstName,
  registrantLastName,
  courseTitle,
  startDate,
  endDate,
  participantNames,
  seats,
  expiresAt,
  manageUrl,
  hasDownPayment,
}: WaitlistPromotionOfferProps): string {
  return emailText([
    "PLÄTZE FREI GEWORDEN",
    "",
    `Hallo ${registrantFirstName} ${registrantLastName},`,
    "",
    "für deine Anmeldung auf der Warteliste sind Plätze frei geworden:",
    "",
    courseTitle,
    textZeile("Start", formatDate(startDate)),
    textZeile("Ende", formatDate(endDate)),
    "",
    `${seatsText(seats)} frei – für ${participantNames.length} Teilnehmer`,
    participantNames.join(", "),
    textZeile("Antwort bis", formatDateTime(expiresAt)),
    "",
    offerAuswahl(hasDownPayment),
    "",
    OFFER_ABLEHNEN,
    ...ctaText(manageUrl, "Jetzt auswählen"),
  ]);
}

export interface WaitlistPromotionOfferExpiredProps {
  registrantFirstName: string;
  registrantLastName: string;
  courseTitle: string;
  participantNames: string[];
  manageUrl?: string;
}

const expiredWeiter = (participantNames: string[]) =>
  `Deine Anmeldung (${participantNames.join(", ")}) bleibt auf der Warteliste und behält ihren Platz. Werden weitere Plätze frei, melden wir uns wieder.`;

/** Das Angebot ist ohne Antwort abgelaufen; die Anmeldung wartet weiter. */
export function WaitlistPromotionOfferExpired({
  registrantFirstName,
  registrantLastName,
  courseTitle,
  participantNames,
  manageUrl,
}: WaitlistPromotionOfferExpiredProps) {
  return (
    <EmailLayout preview="Platzangebot abgelaufen">
      <Text style={abschnittskopf}>Platzangebot abgelaufen</Text>
      <Text style={grundtext}>
        Hallo {registrantFirstName} {registrantLastName},
      </Text>
      <Text style={grundtext}>
        dein Angebot, für den Kurs <strong>{courseTitle}</strong> von der
        Warteliste nachzurücken, ist abgelaufen. Das Kursteam kann die freien
        Plätze nun den Nächsten auf der Warteliste anbieten.
      </Text>
      <Text style={grundtext}>{expiredWeiter(participantNames)}</Text>

      <Regel />

      <Cta href={manageUrl} label="Anmeldung ansehen" />
    </EmailLayout>
  );
}

export function waitlistPromotionOfferExpiredText({
  registrantFirstName,
  registrantLastName,
  courseTitle,
  participantNames,
  manageUrl,
}: WaitlistPromotionOfferExpiredProps): string {
  return emailText([
    "PLATZANGEBOT ABGELAUFEN",
    "",
    `Hallo ${registrantFirstName} ${registrantLastName},`,
    "",
    `dein Angebot, für den Kurs ${courseTitle} von der Warteliste nachzurücken, ist abgelaufen. Das Kursteam kann die freien Plätze nun den Nächsten auf der Warteliste anbieten.`,
    "",
    expiredWeiter(participantNames),
    ...ctaText(manageUrl, "Anmeldung ansehen"),
  ]);
}

export interface WaitlistPromotionOfferExpiringTeamProps {
  courseTitle: string;
  registrantName: string;
  participantNames: string[];
  seats: number;
  expiresAt: Date;
  dashboardUrl: string;
}

const TEAM_ABLAUF =
  "Bis dahin ruht die Warteliste. Läuft die Frist ohne Antwort ab, wird das Angebot geschlossen. Die Plätze bleiben frei, bis die Warteliste im Dashboard erneut nachrückt; ein automatisches Nachrücken gibt es nicht. Alternativ könnt ihr bei den Anmeldenden nachfragen oder die Anmeldung im Dashboard selbst bestätigen.";

/** Hinweis ans Kursteam, dass ein Angebot bald ohne Antwort abläuft. */
export function WaitlistPromotionOfferExpiringTeam({
  courseTitle,
  registrantName,
  participantNames,
  seats,
  expiresAt,
  dashboardUrl,
}: WaitlistPromotionOfferExpiringTeamProps) {
  return (
    <EmailLayout preview="Nachrück-Angebot läuft bald ab">
      <Text style={abschnittskopf}>Nachrück-Angebot läuft bald ab</Text>
      <Text style={grundtext}>Hallo,</Text>
      <Text style={grundtext}>
        für den Kurs <strong>{courseTitle}</strong> läuft ein Nachrück-Angebot
        ab, auf das noch niemand geantwortet hat:
      </Text>

      <Regel stark />
      <Text style={unterTitel}>Anmeldung von {registrantName}</Text>
      <Text style={grundtext}>{participantNames.join(", ")}</Text>
      <Text style={grundtext}>
        <strong>Angeboten:</strong> {seatsText(seats)}
      </Text>
      <Text style={grundtext}>
        <strong>Läuft ab:</strong> {formatDateTime(expiresAt)}
      </Text>

      <Regel />
      <Text style={grundtext}>{TEAM_ABLAUF}</Text>

      <Cta href={dashboardUrl} label="Anmeldung im Dashboard" />
    </EmailLayout>
  );
}

export function waitlistPromotionOfferExpiringTeamText({
  courseTitle,
  registrantName,
  participantNames,
  seats,
  expiresAt,
  dashboardUrl,
}: WaitlistPromotionOfferExpiringTeamProps): string {
  return emailText([
    "NACHRÜCK-ANGEBOT LÄUFT BALD AB",
    "",
    "Hallo,",
    "",
    `für den Kurs ${courseTitle} läuft ein Nachrück-Angebot ab, auf das noch niemand geantwortet hat:`,
    "",
    `Anmeldung von ${registrantName}`,
    participantNames.join(", "),
    textZeile("Angeboten", seatsText(seats)),
    textZeile("Läuft ab", formatDateTime(expiresAt)),
    "",
    TEAM_ABLAUF,
    ...ctaText(dashboardUrl, "Anmeldung im Dashboard"),
  ]);
}

const unterTitel = {
  ...abschnittskopf,
  fontSize: "18px",
  lineHeight: "24px",
  margin: "0 0 12px 0",
};

const knopfFeld = {
  textAlign: "center" as const,
  margin: "28px 0",
};
