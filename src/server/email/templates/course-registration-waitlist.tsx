import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
} from "@react-email/components";

interface CourseRegistrationWaitlistProps {
  registrantFirstName: string;
  registrantLastName: string;
  courseTitle: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  participantsCount: number;
  registrationId: string;
}

export function CourseRegistrationWaitlist({
  registrantFirstName,
  registrantLastName,
  courseTitle,
  startDate,
  endDate,
  totalPrice,
  participantsCount,
  registrationId,
}: CourseRegistrationWaitlistProps) {
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
            <Text style={heading}>Auf Warteliste gesetzt</Text>

            <Text style={paragraph}>
              Hallo {registrantFirstName} {registrantLastName},
            </Text>

            <Text style={paragraph}>
              vielen Dank für deine Anmeldung! Leider ist der folgende Kurs
              bereits vollständig ausgebucht. Wir haben dich auf die Warteliste
              gesetzt:
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
              <Text style={courseDetail}>
                <strong>Gesamtpreis:</strong> {formatPrice(totalPrice)}
              </Text>
            </Section>

            <Hr style={hr} />

            <Text style={paragraph}>
              Sollte ein Platz frei werden, werden wir dich umgehend per E-Mail
              benachrichtigen. Du erhältst dann eine Bestätigung deiner
              Anmeldung.
            </Text>

            <Text style={paragraph}>
              Falls du Fragen hast oder deine Anmeldung stornieren möchtest,
              kannst du dich gerne an uns wenden.
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
