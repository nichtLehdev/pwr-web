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
import { DownPaymentSection } from "./down-payment-section";
import type { DownPaymentMailInfo } from "../down-payment";
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

/**
 * Eine Mail für beide Teile einer aufgeteilten Anmeldung: wer bestätigt ist,
 * wer wartet, und für jeden Teil Preis, Anzahlung und Link. Zwei getrennte
 * Mails hätten nebeneinander „bestätigt“ und „ausgebucht“ gemeldet.
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
  const formatDate = (date: Date) => {
    return formatBerlin(date, "datumZweistellig");
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  const priceSuffix = discountPending ? " (vorbehaltlich Rabattprüfung)" : "";

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
            <Text style={heading}>Anmeldung teilweise bestätigt</Text>

            <Text style={paragraph}>
              Hallo {registrantFirstName} {registrantLastName},
            </Text>

            <Text style={paragraph}>
              vielen Dank für deine Anmeldung! Für den folgenden Kurs waren
              nicht mehr genug Plätze für alle frei. Wie von dir gewählt, haben
              wir deine Anmeldung aufgeteilt:
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

            <Section style={confirmedBox}>
              <Text style={partTitle}>✅ Bestätigt</Text>
              <Text style={courseDetail}>
                {confirmed.participantNames.join(", ")}
              </Text>
              <Text style={courseDetail}>
                <strong>Gesamtpreis{priceSuffix}:</strong>{" "}
                {formatPrice(confirmed.totalPrice)}
              </Text>
            </Section>

            {confirmed.downPayment && (
              <DownPaymentSection
                info={confirmed.downPayment}
                totalPrice={confirmed.totalPrice}
                hasQrCode={downPaymentHasQr}
              />
            )}

            <Section style={waitlistBox}>
              <Text style={partTitle}>⏳ Auf der Warteliste</Text>
              <Text style={courseDetail}>
                {waitlist.participantNames.join(", ")}
              </Text>
              <Text style={courseDetail}>
                <strong>Gesamtpreis{priceSuffix}:</strong>{" "}
                {formatPrice(waitlist.totalPrice)}
              </Text>
              <Text style={courseDetail}>
                Sollten Plätze frei werden, benachrichtigen wir dich per E-Mail.
              </Text>
            </Section>

            {waitlist.downPayment && (
              <DownPaymentSection
                info={waitlist.downPayment}
                totalPrice={waitlist.totalPrice}
                hasQrCode={false}
              />
            )}

            {discountPending && (
              <Section style={pendingWarning}>
                <Text style={pendingWarningText}>
                  Dein Antrag auf Geschwisterkindrabatt wird derzeit geprüft. Er
                  gilt für beide Teile deiner Anmeldung; du erhältst eine
                  separate E-Mail, sobald er genehmigt oder abgelehnt wurde.
                </Text>
              </Section>
            )}

            <Hr style={hr} />

            <Text style={paragraph}>
              Du erhältst in Kürze weitere Informationen zum Kurs per E-Mail.
              Bei Fragen kannst du dich gerne an uns wenden.
            </Text>

            {confirmed.manageUrl && waitlist.manageUrl && (
              <>
                <Section style={buttonContainer}>
                  <Button style={button} href={confirmed.manageUrl}>
                    Bestätigte Teilnehmer ansehen
                  </Button>
                </Section>
                <Section style={buttonContainer}>
                  <Button style={secondaryButton} href={waitlist.manageUrl}>
                    Warteliste ansehen
                  </Button>
                </Section>
                <Text style={smallParagraph}>
                  Über diese Links kannst du beide Teile deiner Anmeldung ändern
                  oder stornieren — ganz ohne Benutzerkonto. Bitte gib sie nicht
                  weiter.
                </Text>
              </>
            )}

            <Text style={paragraph}>
              Deine Anmelde-IDs: <strong>{confirmed.registrationId}</strong>{" "}
              (bestätigt), <strong>{waitlist.registrationId}</strong>{" "}
              (Warteliste)
            </Text>
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

const heading = {
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
  marginBottom: "16px",
};

const courseInfo = {
  backgroundColor: "#f9fafb",
  padding: "20px",
  borderRadius: "8px",
  margin: "24px 0",
  border: "1px solid #e5e7eb",
};

const confirmedBox = {
  backgroundColor: "#f0fdf4",
  padding: "20px",
  borderRadius: "8px",
  margin: "24px 0 16px",
  border: "1px solid #bbf7d0",
};

const waitlistBox = {
  backgroundColor: "#fff7ed",
  padding: "20px",
  borderRadius: "8px",
  margin: "24px 0 16px",
  border: "1px solid #fed7aa",
};

const partTitle = {
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

const pendingWarning = {
  backgroundColor: "#fef3c7",
  padding: "16px",
  borderRadius: "8px",
  margin: "24px 0",
  border: "1px solid #fcd34d",
};

const pendingWarningText = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#92400e",
  margin: "0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "16px 0",
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

const secondaryButton = {
  ...button,
  backgroundColor: "#ffffff",
  color: "#faa619",
  border: "2px solid #faa619",
  boxShadow: "none",
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
