import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Img,
} from "@react-email/components";
import * as React from "react";

interface VerificationEmailProps {
  verificationUrl: string;
  userName?: string;
}

export function VerificationEmail({
  verificationUrl,
  userName,
}: VerificationEmailProps) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";

  return (
    <Html lang="de">
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>Posaunenwerk Rheinland</Text>
          </Section>

          <Section style={content}>
            <Text style={heading}>E-Mail-Adresse bestätigen</Text>

            <Text style={paragraph}>
              {userName ? `Hallo ${userName},` : "Hallo,"}
            </Text>

            <Text style={paragraph}>
              vielen Dank für deine Registrierung beim Posaunenwerk Rheinland!
              Um dein Konto zu aktivieren, bitte bestätige deine E-Mail-Adresse,
              indem du auf den folgenden Button klickst:
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={verificationUrl}>
                E-Mail-Adresse bestätigen
              </Button>
            </Section>

            <Text style={paragraph}>
              Oder kopiere diesen Link in deinen Browser:
            </Text>
            <Text style={link}>{verificationUrl}</Text>

            <Hr style={hr} />

            <Text style={footer}>
              Falls du dich nicht registriert hast, kannst du diese E-Mail
              ignorieren.
            </Text>

            <Text style={footer}>
              Dieser Link ist 24 Stunden gültig.
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

// Styles matching your website's design
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  backgroundColor: "#1e40af", // Primary blue color
  padding: "24px",
  textAlign: "center" as const,
};

const logoText = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0",
};

const content = {
  padding: "32px 24px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1f2937",
  marginBottom: "24px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#374151",
  marginBottom: "16px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#1e40af",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const link = {
  fontSize: "14px",
  color: "#3b82f6",
  wordBreak: "break-all" as const,
  marginBottom: "16px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footer = {
  fontSize: "14px",
  color: "#6b7280",
  lineHeight: "20px",
  marginBottom: "8px",
};

const footerSection = {
  padding: "24px",
  backgroundColor: "#f9fafb",
  textAlign: "center" as const,
};

const footerText = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: "0",
};

