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
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000";

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
              Falls der Button nicht funktioniert, kopiere diesen Link in deinen
              Browser:
            </Text>
            <Text style={link}>{verificationUrl}</Text>

            <Hr style={hr} />

            <Text style={footer}>
              Falls du dich nicht registriert hast, kannst du diese E-Mail
              ignorieren.
            </Text>

            <Text style={footer}>Dieser Link ist 24 Stunden gültig.</Text>
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
  backgroundColor: "#f5f5f5", // Background secondary color
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
  backgroundColor: "#faa619", // Primary brand color (orange)
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
  color: "#58595b", // Brand dark color
  marginBottom: "24px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#58595b", // Brand dark color
  marginBottom: "16px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#faa619", // Primary brand color
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

const link = {
  fontSize: "14px",
  color: "#faa619", // Primary brand color for links
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
  backgroundColor: "#f5f5f5", // Background secondary color
  textAlign: "center" as const,
  borderRadius: "0 0 8px 8px",
};

const footerText = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: "0",
};
