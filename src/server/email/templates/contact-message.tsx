import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
} from "@react-email/components";

interface ContactMessageProps {
  name: string;
  email: string;
  phone?: string;
  subjectLabel: string;
  message: string;
}

/** Internal notification for messages from the public contact form. */
export function ContactMessage({
  name,
  email,
  phone,
  subjectLabel,
  message,
}: ContactMessageProps) {
  return (
    <Html lang="de">
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>Posaunenwerk Rheinland</Text>
            <Text style={tagline}>Neue Nachricht über das Kontaktformular</Text>
          </Section>

          <Section style={content}>
            <Text style={heading}>{subjectLabel}</Text>

            <Section style={metaInfo}>
              <Text style={metaDetail}>
                <strong>Name:</strong> {name}
              </Text>
              <Text style={metaDetail}>
                <strong>E-Mail:</strong> {email}
              </Text>
              {phone && (
                <Text style={metaDetail}>
                  <strong>Telefon:</strong> {phone}
                </Text>
              )}
            </Section>

            <Text style={messageText}>{message}</Text>

            <Hr style={hr} />

            <Text style={hint}>
              Antworten auf diese E-Mail gehen direkt an {name} ({email}).
            </Text>
          </Section>

          <Section style={footerSection}>
            <Text style={footerText}>
              Automatische Benachrichtigung vom Kontaktformular der Website
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

const metaInfo = {
  backgroundColor: "#f9fafb",
  padding: "20px",
  borderRadius: "8px",
  margin: "0 0 24px 0",
  border: "1px solid #e5e7eb",
};

const metaDetail = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#58595b",
  marginBottom: "8px",
};

const messageText = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#58595b",
  whiteSpace: "pre-wrap" as const,
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const hint = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#9ca3af",
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
