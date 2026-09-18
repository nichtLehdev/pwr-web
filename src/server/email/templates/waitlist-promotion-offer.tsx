import type { ReactNode } from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Button,
} from "@react-email/components";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(date);

/** Frist mit Uhrzeit, im deutschen Kalendertag — nicht in der Serverzeitzone. */
const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(date);

const seatsText = (seats: number) =>
  seats === 1 ? "1 Platz" : `${seats} Plätze`;

function Layout({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <Html lang="de">
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>Posaunenwerk Rheinland</Text>
            <Text style={tagline}>
              Posaunenwerk der Evangelischen Kirche im Rheinland
            </Text>
          </Section>
          <Section style={content}>
            <Text style={headingStyle}>{heading}</Text>
            {children}
          </Section>
          <Section style={footerSection}>
            <Text style={footerText}>
              Posaunenwerk der Evangelischen Kirche im Rheinland
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function Cta({ href, label }: { href?: string; label: string }) {
  if (!href) return null;
  return (
    <>
      <Section style={buttonContainer}>
        <Button style={button} href={href}>
          {label}
        </Button>
      </Section>
      <Text style={smallParagraph}>
        Falls der Button nicht funktioniert, kopiere diese Adresse in deinen
        Browser:
      </Text>
      <Text style={linkText}>{href}</Text>
    </>
  );
}

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
    <Layout heading="Plätze frei geworden">
      <Text style={paragraph}>
        Hallo {registrantFirstName} {registrantLastName},
      </Text>
      <Text style={paragraph}>
        für deine Anmeldung auf der Warteliste sind Plätze frei geworden:
      </Text>

      <Section style={courseInfo}>
        <Text style={courseTitleStyle}>{courseTitle}</Text>
        <Text style={courseDetail}>
          <strong>Start:</strong> {formatDate(startDate)}
        </Text>
        <Text style={courseDetail}>
          <strong>Ende:</strong> {formatDate(endDate)}
        </Text>
      </Section>

      <Section style={offerBox}>
        <Text style={offerTitle}>
          {seatsText(seats)} frei – für {participantNames.length} Teilnehmer
        </Text>
        <Text style={courseDetail}>{participantNames.join(", ")}</Text>
        <Text style={courseDetail}>
          <strong>Antwort bis:</strong> {formatDateTime(expiresAt)} Uhr
        </Text>
      </Section>

      <Text style={paragraph}>
        Du kannst wählen, wer nachrückt: Die Gewählten sind dann bestätigt, die
        übrigen bleiben auf der Warteliste.
        {hasDownPayment
          ? " Für die Nachrückenden wird dann die Anzahlung fällig."
          : ""}
      </Text>
      <Text style={paragraph}>
        Möchtet ihr lieber gemeinsam warten, lehne das Angebot ab. Das Kursteam
        kann die Plätze dann den Nächsten auf der Warteliste anbieten, und deine
        Anmeldung behält ihren Platz. Das gilt ebenso, wenn die Frist
        verstreicht.
      </Text>

      <Hr style={hr} />

      <Cta href={manageUrl} label="Jetzt auswählen" />
    </Layout>
  );
}

export interface WaitlistPromotionOfferExpiredProps {
  registrantFirstName: string;
  registrantLastName: string;
  courseTitle: string;
  participantNames: string[];
  manageUrl?: string;
}

/** Das Angebot ist ohne Antwort abgelaufen; die Anmeldung wartet weiter. */
export function WaitlistPromotionOfferExpired({
  registrantFirstName,
  registrantLastName,
  courseTitle,
  participantNames,
  manageUrl,
}: WaitlistPromotionOfferExpiredProps) {
  return (
    <Layout heading="Platzangebot abgelaufen">
      <Text style={paragraph}>
        Hallo {registrantFirstName} {registrantLastName},
      </Text>
      <Text style={paragraph}>
        dein Angebot, für den Kurs <strong>{courseTitle}</strong> von der
        Warteliste nachzurücken, ist abgelaufen. Das Kursteam kann die freien
        Plätze nun den Nächsten auf der Warteliste anbieten.
      </Text>
      <Text style={paragraph}>
        Deine Anmeldung ({participantNames.join(", ")}) bleibt auf der
        Warteliste und behält ihren Platz. Werden weitere Plätze frei, melden
        wir uns wieder.
      </Text>

      <Hr style={hr} />

      <Cta href={manageUrl} label="Anmeldung ansehen" />
    </Layout>
  );
}

export interface WaitlistPromotionOfferExpiringTeamProps {
  courseTitle: string;
  registrantName: string;
  participantNames: string[];
  seats: number;
  expiresAt: Date;
  dashboardUrl: string;
}

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
    <Layout heading="Nachrück-Angebot läuft bald ab">
      <Text style={paragraph}>Hallo,</Text>
      <Text style={paragraph}>
        für den Kurs <strong>{courseTitle}</strong> läuft ein Nachrück-Angebot
        ab, auf das noch niemand geantwortet hat:
      </Text>

      <Section style={offerBox}>
        <Text style={offerTitle}>Anmeldung von {registrantName}</Text>
        <Text style={courseDetail}>{participantNames.join(", ")}</Text>
        <Text style={courseDetail}>
          <strong>Angeboten:</strong> {seatsText(seats)}
        </Text>
        <Text style={courseDetail}>
          <strong>Läuft ab:</strong> {formatDateTime(expiresAt)} Uhr
        </Text>
      </Section>

      <Text style={paragraph}>
        Bis dahin hält die Warteliste an. Antwortet niemand, wird das Angebot
        geschlossen; die Plätze bleiben frei, bis ihr die Warteliste im
        Dashboard nachrücken lasst – automatisch rückt niemand nach. Ihr könnt
        nachfragen oder die Anmeldung im Dashboard selbst bestätigen.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={dashboardUrl}>
          Anmeldung im Dashboard
        </Button>
      </Section>
    </Layout>
  );
}

const main = {
  backgroundColor: "#f5f5f5",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "0",
  marginBottom: "64px",
  maxWidth: "600px",
  borderRadius: "8px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
};

const header = {
  backgroundColor: "#faa619",
  padding: "32px 24px",
  textAlign: "center" as const,
  borderRadius: "8px 8px 0 0",
};

const logoText = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0 0 8px 0",
  letterSpacing: "0.5px",
};

const tagline = {
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "normal",
  margin: "0",
  opacity: 0.95,
  letterSpacing: "0.3px",
};

const content = {
  padding: "32px 24px",
};

const headingStyle = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#58595b",
  marginBottom: "24px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#58595b",
  marginBottom: "16px",
};

const smallParagraph = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#58595b",
  marginBottom: "8px",
};

const linkText = {
  fontSize: "12px",
  lineHeight: "20px",
  color: "#faa619",
  wordBreak: "break-all" as const,
  marginBottom: "16px",
};

const courseInfo = {
  backgroundColor: "#f9fafb",
  padding: "20px",
  borderRadius: "8px",
  margin: "24px 0",
  border: "1px solid #e5e7eb",
};

const offerBox = {
  backgroundColor: "#fff7ed",
  padding: "20px",
  borderRadius: "8px",
  margin: "24px 0",
  border: "1px solid #fed7aa",
};

const offerTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#58595b",
  marginBottom: "8px",
};

const courseTitleStyle = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#58595b",
  marginBottom: "16px",
};

const courseDetail = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#58595b",
  marginBottom: "8px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#faa619",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
  boxShadow: "0 2px 4px rgba(250, 166, 25, 0.3)",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footerSection = {
  padding: "24px",
  backgroundColor: "#f9fafb",
  textAlign: "center" as const,
  borderRadius: "0 0 8px 8px",
};

const footerText = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: "0",
};
