import { Text } from "@react-email/components";
import {
  EmailLayout,
  Regel,
  abschnittskopf,
  farben,
  grundtext,
  kleintext,
} from "./email-layout";
import { emailText, textZeile } from "./email-text";
import {
  ManageRegistrationCta,
  manageRegistrationCtaText,
} from "./manage-registration-cta";
import { formatBerlin } from "@/lib/berlin-time";

interface SiblingDiscountApprovedProps {
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
  /** Magic link letting the registrant manage the anmeldung without an account. */
  manageUrl?: string;
}

function formatDate(date: Date) {
  return formatBerlin(date, "datumZweistellig");
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

export function SiblingDiscountApproved({
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
  manageUrl,
}: SiblingDiscountApprovedProps) {
  return (
    <EmailLayout preview="Geschwisterkindrabatt genehmigt">
      <Text style={abschnittskopf}>Geschwisterkindrabatt genehmigt</Text>

      <Text style={grundtext}>
        Hallo {registrantFirstName} {registrantLastName},
      </Text>

      <Text style={grundtext}>
        wir freuen uns, dir mitteilen zu können, dass dein Antrag auf
        Geschwisterkindrabatt für die folgende Anmeldung genehmigt wurde:
      </Text>

      <Text style={kursname}>{courseTitle}</Text>
      <Werttabelle
        zeilen={[
          { label: "Start", wert: formatDate(startDate) },
          { label: "Ende", wert: formatDate(endDate) },
          { label: "Teilnehmer", wert: teilnehmerWert(participantsCount) },
        ]}
      />

      <Regel />

      <Text style={abschnittskopf}>Preisübersicht</Text>
      <Werttabelle
        zeilen={[
          {
            label: "Ursprünglicher Gesamtbetrag",
            wert: formatPrice(originalTotalPrice),
          },
          {
            label: "Geschwisterkindrabatt (20% pro weiteres Kind)",
            wert: `-${formatPrice(discountAmount)}`,
          },
        ]}
      />
      <Regel stark />
      <Text style={gesamtzeile}>
        Gesamtbetrag: {formatPrice(finalTotalPrice)}
      </Text>

      <Regel />

      <Text style={grundtext}>
        Deine Anmeldung wurde bestätigt. Du erhältst in Kürze weitere
        Informationen zum Kurs per E-Mail.
      </Text>

      {/* Geteilter Baustein statt eigener Kopie: Beide waren wortgleich. */}
      <ManageRegistrationCta manageUrl={manageUrl} />

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
export function siblingDiscountApprovedText({
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
  manageUrl,
}: SiblingDiscountApprovedProps): string {
  return emailText([
    "GESCHWISTERKINDRABATT GENEHMIGT",
    "",
    `Hallo ${registrantFirstName} ${registrantLastName},`,
    "",
    "wir freuen uns, dir mitteilen zu können, dass dein Antrag auf Geschwisterkindrabatt für die folgende Anmeldung genehmigt wurde:",
    "",
    courseTitle,
    textZeile("Start", formatDate(startDate)),
    textZeile("Ende", formatDate(endDate)),
    textZeile("Teilnehmer", teilnehmerWert(participantsCount)),
    "",
    "PREISÜBERSICHT",
    textZeile("Ursprünglicher Gesamtbetrag", formatPrice(originalTotalPrice)),
    textZeile(
      "Geschwisterkindrabatt (20% pro weiteres Kind)",
      `-${formatPrice(discountAmount)}`,
    ),
    textZeile("Gesamtbetrag", formatPrice(finalTotalPrice)),
    "",
    "Deine Anmeldung wurde bestätigt. Du erhältst in Kürze weitere Informationen zum Kurs per E-Mail.",
    "",
    ...manageRegistrationCtaText({ manageUrl }),
    manageUrl ? "" : null,
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
  margin: "14px 0 0 0",
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
