import { Hr, Link, Text } from "@react-email/components";
import {
  EmailLayout,
  abschnittskopf,
  emailBaseUrl,
  farben,
  grundtext,
  haarlinie,
  kleintext,
  link,
} from "./email-layout";
import { emailText, textLink, textZeile } from "./email-text";

interface SiblingDiscountRejectedProps {
  registrantFirstName: string;
  registrantLastName: string;
  courseTitle: string;
  startDate: Date;
  endDate: Date;
  originalTotalPrice: number;
  participantsCount: number;
  registrationId: string;
  /** Magic link letting the registrant manage the anmeldung without an account. */
  manageUrl?: string;
}

function formatDate(date: Date) {
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

export function SiblingDiscountRejected({
  registrantFirstName,
  registrantLastName,
  courseTitle,
  startDate,
  endDate,
  originalTotalPrice,
  participantsCount,
  registrationId,
  manageUrl,
}: SiblingDiscountRejectedProps) {
  const manageHref =
    manageUrl ?? `${emailBaseUrl()}/registrations/${registrationId}`;

  return (
    <EmailLayout preview="Geschwisterkindrabatt abgelehnt">
      <Text style={abschnittskopf}>Geschwisterkindrabatt abgelehnt</Text>

      <Text style={grundtext}>
        Hallo {registrantFirstName} {registrantLastName},
      </Text>

      <Text style={grundtext}>
        leider können wir deinen Antrag auf Geschwisterkindrabatt für die
        folgende Anmeldung nicht genehmigen:
      </Text>

      <Text style={kursname}>{courseTitle}</Text>
      <Werttabelle
        zeilen={[
          { label: "Start", wert: formatDate(startDate) },
          { label: "Ende", wert: formatDate(endDate) },
          { label: "Teilnehmer", wert: teilnehmerWert(participantsCount) },
        ]}
      />

      <Hr style={haarlinie} />

      <Text style={abschnittskopf}>Preisübersicht</Text>
      <Text style={gesamtzeile}>
        Gesamtbetrag: {formatPrice(originalTotalPrice)}
      </Text>

      <Hr style={haarlinie} />

      <Text style={grundtext}>
        Du kannst deine Anmeldung weiterhin zum vollen Preis behalten oder sie
        stornieren. Du kannst deine Anmeldung unter folgendem Link bearbeiten:
      </Text>

      <Text style={grundtext}>
        <Link href={manageHref} style={link}>
          Anmeldung bearbeiten
        </Link>
      </Text>

      <Text style={grundtext}>
        Deine Anmelde-ID: <strong>{registrationId}</strong>
      </Text>

      <Text style={grundtext}>
        Bei Fragen kannst du dich gerne an uns wenden.
      </Text>
    </EmailLayout>
  );
}

/** Nur-Text-Fassung — gleicher Wortlaut, ohne Auszeichnung. */
export function siblingDiscountRejectedText({
  registrantFirstName,
  registrantLastName,
  courseTitle,
  startDate,
  endDate,
  originalTotalPrice,
  participantsCount,
  registrationId,
  manageUrl,
}: SiblingDiscountRejectedProps): string {
  const manageHref =
    manageUrl ?? `${emailBaseUrl()}/registrations/${registrationId}`;

  return emailText([
    "GESCHWISTERKINDRABATT ABGELEHNT",
    "",
    `Hallo ${registrantFirstName} ${registrantLastName},`,
    "",
    "leider können wir deinen Antrag auf Geschwisterkindrabatt für die folgende Anmeldung nicht genehmigen:",
    "",
    courseTitle,
    textZeile("Start", formatDate(startDate)),
    textZeile("Ende", formatDate(endDate)),
    textZeile("Teilnehmer", teilnehmerWert(participantsCount)),
    "",
    "PREISÜBERSICHT",
    textZeile("Gesamtbetrag", formatPrice(originalTotalPrice)),
    "",
    "Du kannst deine Anmeldung weiterhin zum vollen Preis behalten oder sie stornieren. Du kannst deine Anmeldung unter folgendem Link bearbeiten:",
    "",
    textLink("Anmeldung bearbeiten:", manageHref),
    "",
    `Deine Anmelde-ID: ${registrationId}`,
    "",
    "Bei Fragen kannst du dich gerne an uns wenden.",
  ]);
}

const kursname = {
  ...grundtext,
  fontWeight: "bold" as const,
  fontSize: "17px",
  margin: "0 0 10px 0",
};

const gesamtzeile = {
  ...grundtext,
  fontWeight: "bold" as const,
  fontSize: "17px",
  margin: "0",
};

const werttabelle = {
  width: "100%",
  borderCollapse: "collapse" as const,
  margin: "0 0 20px 0",
};

const werttabelleBeschriftung = {
  ...kleintext,
  width: "220px",
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
