import { Button, Section, Text } from "@react-email/components";
import {
  EmailLayout,
  Regel,
  abschnittskopf,
  ersatzLink,
  farben,
  grundtext,
  kleintext,
  knopf,
} from "./email-layout";
import { emailText, textLink, textZeile } from "./email-text";

export interface RegistrationAccessLinkEntry {
  courseTitle: string;
  startDate: Date;
  endDate: Date;
  statusLabel: string;
  participantsCount: number;
  manageUrl: string;
}

interface RegistrationAccessLinksProps {
  registrantFirstName: string;
  registrations: RegistrationAccessLinkEntry[];
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function teilnehmerWert(count: number) {
  return `${count} ${count === 1 ? "Person" : "Personen"}`;
}

/** Eine Angabe als Zeile im Tabellensatz — das HTML-Pendant zu textZeile. */
function Werttabelle({
  zeilen,
}: {
  zeilen: { label: string; wert: string }[];
}) {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={werttabelle}
    >
      <tbody>
        {zeilen.map((zeile, i) => {
          const letzte = i === zeilen.length - 1;
          return (
            <tr key={zeile.label}>
              <td
                style={
                  letzte
                    ? werttabelleBeschriftungLetzte
                    : werttabelleBeschriftung
                }
              >
                {zeile.label}
              </td>
              <td style={letzte ? werttabelleWertLetzte : werttabelleWert}>
                {zeile.wert}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Answer to "I registered without an account and lost the link". One mail with
 * a fresh magic link per anmeldung that is still open for changes.
 */
export function RegistrationAccessLinks({
  registrantFirstName,
  registrations,
}: RegistrationAccessLinksProps) {
  return (
    <EmailLayout preview="Deine Anmeldungen">
      <Text style={abschnittskopf}>Deine Anmeldungen</Text>

      <Text style={grundtext}>Hallo {registrantFirstName},</Text>

      <Text style={grundtext}>
        du hast einen Zugangslink zu deinen Anmeldungen angefordert. Über die
        folgenden Links kannst du deine Anmeldungen ansehen, ändern oder
        stornieren — ganz ohne Benutzerkonto.
      </Text>

      {registrations.map((registration) => (
        <Section key={registration.manageUrl}>
          <Regel />
          <Text style={kursname}>{registration.courseTitle}</Text>
          <Werttabelle
            zeilen={[
              {
                label: "Zeitraum",
                wert: `${formatDate(registration.startDate)} – ${formatDate(registration.endDate)}`,
              },
              { label: "Status", wert: registration.statusLabel },
              {
                label: "Teilnehmer",
                wert: teilnehmerWert(registration.participantsCount),
              },
            ]}
          />
          <Section style={knopfFeld}>
            <Button style={knopf} href={registration.manageUrl}>
              Anmeldung öffnen
            </Button>
          </Section>
          <Text style={ersatzLink}>{registration.manageUrl}</Text>
        </Section>
      ))}

      <Regel />

      <Text style={kleintext}>
        Die Links sind persönlich — bitte gib sie nicht weiter. Falls du diese
        E-Mail nicht angefordert hast, kannst du sie einfach ignorieren.
      </Text>
    </EmailLayout>
  );
}

/** Nur-Text-Fassung — gleicher Wortlaut, ohne Auszeichnung. */
export function registrationAccessLinksText({
  registrantFirstName,
  registrations,
}: RegistrationAccessLinksProps): string {
  const eintraege = registrations.flatMap((registration) => [
    registration.courseTitle,
    textZeile(
      "Zeitraum",
      `${formatDate(registration.startDate)} – ${formatDate(registration.endDate)}`,
    ),
    textZeile("Status", registration.statusLabel),
    textZeile("Teilnehmer", teilnehmerWert(registration.participantsCount)),
    textLink("Anmeldung öffnen:", registration.manageUrl),
    "",
  ]);

  return emailText([
    "DEINE ANMELDUNGEN",
    "",
    `Hallo ${registrantFirstName},`,
    "",
    "du hast einen Zugangslink zu deinen Anmeldungen angefordert. Über die folgenden Links kannst du deine Anmeldungen ansehen, ändern oder stornieren — ganz ohne Benutzerkonto.",
    "",
    ...eintraege,
    "Die Links sind persönlich — bitte gib sie nicht weiter. Falls du diese E-Mail nicht angefordert hast, kannst du sie einfach ignorieren.",
  ]);
}

const kursname = {
  ...grundtext,
  fontWeight: "bold" as const,
  fontSize: "17px",
  margin: "24px 0 10px 0",
};

const knopfFeld = {
  textAlign: "center" as const,
  margin: "20px 0 12px 0",
};

const werttabelle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  margin: "0 0 4px 0",
};

const werttabelleBeschriftung = {
  ...kleintext,
  width: "140px",
  padding: "7px 12px 7px 0",
  borderBottom: `1px solid ${farben.rule}`,
  verticalAlign: "top" as const,
  margin: 0,
};

const werttabelleBeschriftungLetzte = {
  ...werttabelleBeschriftung,
  borderBottom: "none",
};

const werttabelleWert = {
  ...grundtext,
  fontSize: "15px",
  padding: "7px 0",
  borderBottom: `1px solid ${farben.rule}`,
  margin: 0,
};

const werttabelleWertLetzte = {
  ...werttabelleWert,
  borderBottom: "none",
};
