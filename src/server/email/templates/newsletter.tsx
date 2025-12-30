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
  Link,
} from "@react-email/components";
import * as React from "react";
import { marked } from "marked";

marked.use({
  gfm: true,
  breaks: true,
});

interface NewsletterEmailProps {
  subject: string;
  content: string; // HTML content
  unsubscribeUrl: string;
  subscriberName?: string;
}

export function NewsletterEmail({
  subject,
  content,
  unsubscribeUrl,
  subscriberName,
}: NewsletterEmailProps) {
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
            <Text style={greeting}>
              {subscriberName ? `Hallo ${subscriberName},` : "Hallo,"}
            </Text>

            {/* Newsletter content will be injected here */}
            <div
              data-newsletter-content="true"
              style={{
                fontSize: "16px",
                lineHeight: "26px",
                color: "#58595b",
                marginBottom: "16px",
              }}
            >
              {content || "NEWSLETTER_CONTENT_PLACEHOLDER_MARKER_12345"}
            </div>

            <Hr style={hr} />

            <Section style={unsubscribeSection}>
              <Text style={unsubscribeText}>
                Du möchtest keine Newsletter mehr erhalten?{" "}
                <Link href={unsubscribeUrl} style={unsubscribeLink}>
                  Hier abmelden
                </Link>
              </Text>
            </Section>
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

const greeting = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#58595b",
  marginBottom: "24px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const unsubscribeSection = {
  textAlign: "center" as const,
  marginTop: "32px",
};

const unsubscribeText = {
  fontSize: "12px",
  color: "#6b7280",
  lineHeight: "20px",
  margin: "0",
};

const unsubscribeLink = {
  color: "#faa619",
  textDecoration: "underline",
};

const footerSection = {
  padding: "24px",
  backgroundColor: "#f5f5f5",
  textAlign: "center" as const,
  borderRadius: "0 0 8px 8px",
};

const footerText = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: "0",
};
