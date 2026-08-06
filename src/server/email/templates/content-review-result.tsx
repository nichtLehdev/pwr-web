import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
} from "@react-email/components";

export type ReviewedContentType = "event" | "course" | "post";

const CONTENT_TYPE_LABELS: Record<ReviewedContentType, string> = {
  event: "Veranstaltung",
  course: "Kurs",
  post: "Beitrag",
};

interface ContentReviewResultProps {
  recipientName: string;
  contentType: ReviewedContentType;
  title: string;
  approved: boolean;
  reviewNotes?: string | null;
  dashboardUrl: string;
}

export function ContentReviewResult({
  recipientName,
  contentType,
  title,
  approved,
  reviewNotes,
  dashboardUrl,
}: ContentReviewResultProps) {
  const typeLabel = CONTENT_TYPE_LABELS[contentType];

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
            <Text style={heading}>
              {approved
                ? `${typeLabel} veröffentlicht`
                : `${typeLabel} abgelehnt`}
            </Text>

            <Text style={paragraph}>Hallo {recipientName},</Text>

            <Text style={paragraph}>
              {approved
                ? `${contentType === "post" ? "dein" : "deine"} ${typeLabel} wurde geprüft und ist jetzt veröffentlicht:`
                : `${contentType === "post" ? "dein" : "deine"} ${typeLabel} wurde geprüft und leider abgelehnt:`}
            </Text>

            <Section style={infoBox}>
              <Text style={titleStyle}>{title}</Text>
            </Section>

            {reviewNotes ? (
              <>
                <Text style={paragraph}>
                  <strong>Anmerkungen der Prüfung:</strong>
                </Text>
                <Section style={notesBox}>
                  <Text style={notesText}>{reviewNotes}</Text>
                </Section>
              </>
            ) : null}

            {!approved && (
              <Text style={paragraph}>
                Du kannst {contentType === "post" ? "den Beitrag" : "sie"} im
                Dashboard überarbeiten und erneut zur Prüfung einreichen.
              </Text>
            )}

            <Section style={buttonSection}>
              <Button style={button} href={dashboardUrl}>
                Im Dashboard ansehen
              </Button>
            </Section>

            <Text style={paragraph}>
              Bei Fragen kannst du dich gerne an uns wenden.
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
  color: "#1a1a1a",
  margin: "0 0 24px 0",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#333333",
  margin: "0 0 16px 0",
};

const infoBox = {
  backgroundColor: "#f9f9f9",
  borderRadius: "6px",
  padding: "16px 20px",
  margin: "0 0 16px 0",
};

const titleStyle = {
  fontSize: "17px",
  fontWeight: "bold",
  color: "#1a1a1a",
  margin: "0",
};

const notesBox = {
  backgroundColor: "#fff8ec",
  borderLeft: "4px solid #faa619",
  borderRadius: "4px",
  padding: "12px 16px",
  margin: "0 0 16px 0",
};

const notesText = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#333333",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#faa619",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "bold",
  textDecoration: "none",
  padding: "12px 24px",
  display: "inline-block",
};

const footerSection = {
  padding: "24px",
  textAlign: "center" as const,
};

const footerText = {
  fontSize: "12px",
  color: "#999999",
  margin: "0",
};
