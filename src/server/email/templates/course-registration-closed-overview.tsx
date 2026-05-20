import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Link,
} from "@react-email/components";
import type { CourseRegistrationStats } from "@/lib/course-participants-export";

interface CourseRegistrationClosedOverviewProps {
  courseTitle: string;
  registrationDeadline: Date;
  startDate: Date;
  endDate: Date;
  locationName: string | null;
  maxParticipants: number | null;
  allowWaitingList: boolean;
  stats: CourseRegistrationStats;
  participantsUrl: string;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateOnly(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export function CourseRegistrationClosedOverview({
  courseTitle,
  registrationDeadline,
  startDate,
  endDate,
  locationName,
  maxParticipants,
  allowWaitingList,
  stats,
  participantsUrl,
}: CourseRegistrationClosedOverviewProps) {
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
            <Text style={heading}>Anmeldefrist beendet</Text>

            <Text style={paragraph}>
              Die Anmeldefrist für den folgenden Kurs ist abgelaufen. Im Anhang
              finden Sie eine Excel-Liste aller Teilnehmenden (ohne
              stornierte Anmeldungen).
            </Text>

            <Section style={courseInfo}>
              <Text style={courseTitleStyle}>{courseTitle}</Text>
              <Text style={courseDetail}>
                <strong>Anmeldefrist endete:</strong>{" "}
                {formatDate(registrationDeadline)}
              </Text>
              <Text style={courseDetail}>
                <strong>Kursbeginn:</strong> {formatDateOnly(startDate)}
              </Text>
              <Text style={courseDetail}>
                <strong>Kursende:</strong> {formatDateOnly(endDate)}
              </Text>
              {locationName ? (
                <Text style={courseDetail}>
                  <strong>Ort:</strong> {locationName}
                </Text>
              ) : null}
              {maxParticipants != null && maxParticipants > 0 ? (
                <Text style={courseDetail}>
                  <strong>Max. Teilnehmerzahl:</strong> {maxParticipants}
                </Text>
              ) : null}
            </Section>

            <Section style={statsBox}>
              <Text style={statsTitle}>Übersicht für die Planung</Text>
              <Text style={statsLine}>
                <strong>Bestätigte Teilnehmende:</strong>{" "}
                {stats.confirmedParticipants}{" "}
                {stats.confirmedParticipants === 1 ? "Person" : "Personen"}
              </Text>
              <Text style={statsLine}>
                <strong>Anmeldungen (aktiv):</strong>{" "}
                {stats.activeRegistrations}
              </Text>
              {allowWaitingList && stats.waitlistParticipants > 0 ? (
                <Text style={statsLine}>
                  <strong>Warteliste:</strong> {stats.waitlistParticipants}{" "}
                  {stats.waitlistParticipants === 1 ? "Person" : "Personen"}
                </Text>
              ) : null}
              {stats.cancelledParticipants > 0 ? (
                <Text style={statsLine}>
                  <strong>Storniert:</strong> {stats.cancelledParticipants}{" "}
                  {stats.cancelledParticipants === 1 ? "Person" : "Personen"}
                </Text>
              ) : null}
              {stats.pendingDiscountRegistrations > 0 ? (
                <Text style={statsLineHighlight}>
                  <strong>Offene Rabattprüfungen:</strong>{" "}
                  {stats.pendingDiscountRegistrations} – bitte im Dashboard
                  bearbeiten.
                </Text>
              ) : null}
              {stats.totalRevenueConfirmed > 0 ? (
                <>
                  <Text style={statsLine}>
                    <strong>Umsatz (bestätigt):</strong>{" "}
                    {formatPrice(stats.totalRevenueConfirmed)}
                  </Text>
                  <Text style={statsLine}>
                    <strong>Bereits bezahlt:</strong>{" "}
                    {formatPrice(stats.paidRevenue)}
                  </Text>
                </>
              ) : null}
            </Section>

            <Text style={paragraph}>
              <Link href={participantsUrl} style={link}>
                Teilnehmer im Dashboard verwalten
              </Link>
            </Text>

            <Hr style={hr} />

            <Text style={paragraphSmall}>
              Diese E-Mail wurde automatisch versendet, sobald die Anmeldefrist
              abgelaufen ist.
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

const paragraphSmall = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#6b7280",
  marginBottom: "0",
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

const statsBox = {
  backgroundColor: "#eff6ff",
  padding: "20px",
  borderRadius: "8px",
  margin: "24px 0",
  border: "1px solid #bfdbfe",
};

const statsTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#1e40af",
  marginBottom: "12px",
};

const statsLine = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#374151",
  marginBottom: "6px",
};

const statsLineHighlight = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#92400e",
  marginBottom: "6px",
  marginTop: "8px",
};

const link = {
  color: "#faa619",
  fontWeight: "bold",
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
