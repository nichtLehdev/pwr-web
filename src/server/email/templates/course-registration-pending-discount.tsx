import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import * as React from "react";

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
}

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
}: CourseRegistrationPendingDiscountProps) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000";

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  return (
    <Html lang="de">
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>Posaunenwerk Rheinland</Text>
            <Text style={tagline}>
              Evangelisches Posaunenwerk in der Evangelischen Kirche im
              Rheinland
            </Text>
          </Section>

          <Section style={content}>
            <Text style={heading}>Anmeldung erhalten</Text>

            <Text style={paragraph}>
              Hallo {registrantFirstName} {registrantLastName},
            </Text>

            <Text style={paragraph}>
              vielen Dank für deine Anmeldung! Wir haben deine Anmeldung für den
              folgenden Kurs erhalten:
            </Text>

            <Section style={courseInfo}>
              <Text style={courseTitleStyle}>{courseTitle}</Text>
              <Text style={courseDetail}>
                <strong>Start:</strong> {formatDate(startDate)}
              </Text>
              <Text style={courseDetail}>
                <strong>Ende:</strong> {formatDate(endDate)}
              </Text>
              <Text style={courseDetail}>
                <strong>Teilnehmer:</strong> {participantsCount}{" "}
                {participantsCount === 1 ? "Person" : "Personen"}
              </Text>
            </Section>

            <Section style={priceInfo}>
              <Text style={priceTitle}>Preisübersicht</Text>
              <Text style={priceDetail}>
                <strong>Ursprünglicher Gesamtbetrag:</strong>{" "}
                {formatPrice(originalTotalPrice)}
              </Text>
              <Text style={priceDetailDiscount}>
                <strong>Geschwisterrabatt (20%):</strong> -
                {formatPrice(discountAmount)}
              </Text>
              <Hr style={priceHr} />
              <Text style={priceTotal}>
                <strong>Gesamtbetrag (vorbehaltlich Genehmigung):</strong>{" "}
                {formatPrice(finalTotalPrice)}
              </Text>
            </Section>

            <Section style={pendingWarning}>
              <Text style={pendingWarningTitle}>⏳ Rabatt prüfen</Text>
              <Text style={pendingWarningText}>
                Dein Antrag auf Geschwisterrabatt wird derzeit geprüft. Du
                erhältst eine separate E-Mail, sobald der Rabatt genehmigt oder
                abgelehnt wurde. Deine Anmeldung ist bereits reserviert, auch
                während der Prüfung.
              </Text>
            </Section>

            <Hr style={hr} />

            <Section style={betaWarning}>
              <Text style={betaWarningTitle}>⚠️ Wichtiger Hinweis</Text>
              <Text style={betaWarningText}>
                Dies ist eine Beta-Version der Website. Anmeldungen und
                Buchungen sind noch nicht gültig und werden nicht bearbeitet.
              </Text>
            </Section>

            <Hr style={hr} />

            <Text style={paragraph}>
              Du erhältst in Kürze weitere Informationen zum Kurs per E-Mail.
              Bei Fragen kannst du dich gerne an uns wenden.
            </Text>

            <Text style={paragraph}>
              Deine Anmelde-ID: <strong>{registrationId}</strong>
            </Text>
          </Section>

          <Section style={footerSection}>
            <Text style={footerText}>
              Evangelisches Posaunenwerk in der Evangelischen Kirche im
              Rheinland
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

const courseInfo = {
  backgroundColor: "#f9fafb",
  padding: "20px",
  borderRadius: "8px",
  margin: "24px 0",
  border: "1px solid #e5e7eb",
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

const priceInfo = {
  backgroundColor: "#fef3c7",
  padding: "20px",
  borderRadius: "8px",
  margin: "24px 0",
  border: "2px solid #fbbf24",
};

const priceTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#92400e",
  marginBottom: "16px",
};

const priceDetail = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#58595b",
  marginBottom: "8px",
};

const priceDetailDiscount = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#92400e",
  marginBottom: "8px",
  fontWeight: "600",
};

const priceHr = {
  borderColor: "#fbbf24",
  margin: "16px 0",
};

const priceTotal = {
  fontSize: "18px",
  lineHeight: "28px",
  color: "#92400e",
  fontWeight: "bold",
  marginTop: "8px",
};

const pendingWarning = {
  backgroundColor: "#dbeafe",
  padding: "16px",
  borderRadius: "8px",
  margin: "24px 0",
  border: "2px solid #60a5fa",
};

const pendingWarningTitle = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#1e40af",
  marginBottom: "8px",
};

const pendingWarningText = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#1e3a8a",
  margin: "0",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const betaWarning = {
  backgroundColor: "#fef3c7",
  padding: "16px",
  borderRadius: "8px",
  margin: "24px 0",
  border: "2px solid #fbbf24",
};

const betaWarningTitle = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#92400e",
  marginBottom: "8px",
};

const betaWarningText = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#78350f",
  margin: "0",
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
