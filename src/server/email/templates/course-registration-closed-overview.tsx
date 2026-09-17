import { Link, Text } from "@react-email/components";
import type { CourseRegistrationStats } from "@/lib/course-participants-export";
import {
  EmailLayout,
  Regel,
  abschnittskopf,
  farben,
  grundtext,
  kleintext,
  link,
} from "./email-layout";
import { emailText, textZeile } from "./email-text";

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
  const kursZeilen: { label: string; wert: string }[] = [
    { label: "Anmeldefrist endete", wert: formatDate(registrationDeadline) },
    { label: "Kursbeginn", wert: formatDateOnly(startDate) },
    { label: "Kursende", wert: formatDateOnly(endDate) },
  ];
  if (locationName) {
    kursZeilen.push({ label: "Ort", wert: locationName });
  }
  if (maxParticipants != null && maxParticipants > 0) {
    kursZeilen.push({
      label: "Max. Teilnehmerzahl",
      wert: String(maxParticipants),
    });
  }

  const uebersichtZeilen: { label: string; wert: string }[] = [
    {
      label: "Bestätigte Teilnehmende",
      wert: teilnehmerWert(stats.confirmedParticipants),
    },
    {
      label: "Anmeldungen (aktiv)",
      wert: String(stats.activeRegistrations),
    },
  ];
  if (allowWaitingList && stats.waitlistParticipants > 0) {
    uebersichtZeilen.push({
      label: "Warteliste",
      wert: teilnehmerWert(stats.waitlistParticipants),
    });
  }
  if (stats.cancelledParticipants > 0) {
    uebersichtZeilen.push({
      label: "Storniert",
      wert: teilnehmerWert(stats.cancelledParticipants),
    });
  }
  if (stats.totalRevenueConfirmed > 0) {
    uebersichtZeilen.push(
      {
        label: "Umsatz (bestätigt)",
        wert: formatPrice(stats.totalRevenueConfirmed),
      },
      { label: "Bereits bezahlt", wert: formatPrice(stats.paidRevenue) },
    );
  }
  if (stats.downPaymentsReceived > 0 || stats.downPaymentsOpen > 0) {
    uebersichtZeilen.push({
      label: "Anzahlungen",
      wert: `${formatPrice(stats.downPaymentsReceived)} eingegangen, ${formatPrice(stats.downPaymentsOpen)} offen`,
    });
  }

  const zuKlaeren: string[] = [];
  if (stats.pendingDiscountRegistrations > 0) {
    zuKlaeren.push(
      `Offene Rabattprüfungen: ${stats.pendingDiscountRegistrations} – bitte im Dashboard bearbeiten.`,
    );
  }
  if (stats.refundPendingRegistrations > 0) {
    zuKlaeren.push(
      `Anzahlung nach Stornierung zu klären: ${stats.refundPendingRegistrations} – bitte mit der Kasse abstimmen.`,
    );
  }

  return (
    <EmailLayout preview="Anmeldefrist beendet">
      <Text style={abschnittskopf}>Anmeldefrist beendet</Text>

      <Text style={grundtext}>
        Die Anmeldefrist für den folgenden Kurs ist abgelaufen. Im Anhang finden
        Sie eine Excel-Liste aller Teilnehmenden (ohne stornierte Anmeldungen).
      </Text>

      <Text style={kursname}>{courseTitle}</Text>
      <Werttabelle zeilen={kursZeilen} />

      <Regel />

      <Text style={abschnittskopf}>Übersicht für die Planung</Text>
      <Werttabelle zeilen={uebersichtZeilen} />

      {zuKlaeren.length > 0 ? (
        <>
          <Regel stark />
          {zuKlaeren.map((zeile) => (
            <Text key={zeile} style={hinweiszeile}>
              {zeile}
            </Text>
          ))}
        </>
      ) : null}

      <Text style={grundtext}>
        <Link href={participantsUrl} style={link}>
          Teilnehmer im Dashboard verwalten
        </Link>
      </Text>

      <Regel />

      <Text style={kleintext}>
        Diese E-Mail wurde automatisch versendet, sobald die Anmeldefrist
        abgelaufen ist.
      </Text>
    </EmailLayout>
  );
}

/** Nur-Text-Fassung — gleicher Wortlaut, ohne Auszeichnung. */
export function courseRegistrationClosedOverviewText({
  courseTitle,
  registrationDeadline,
  startDate,
  endDate,
  locationName,
  maxParticipants,
  allowWaitingList,
  stats,
  participantsUrl,
}: CourseRegistrationClosedOverviewProps): string {
  const kursZeilen = [
    textZeile("Anmeldefrist endete", formatDate(registrationDeadline)),
    textZeile("Kursbeginn", formatDateOnly(startDate)),
    textZeile("Kursende", formatDateOnly(endDate)),
    locationName ? textZeile("Ort", locationName) : null,
    maxParticipants != null && maxParticipants > 0
      ? textZeile("Max. Teilnehmerzahl", String(maxParticipants))
      : null,
  ];

  const uebersichtZeilen = [
    textZeile(
      "Bestätigte Teilnehmende",
      teilnehmerWert(stats.confirmedParticipants),
    ),
    textZeile("Anmeldungen (aktiv)", String(stats.activeRegistrations)),
    allowWaitingList && stats.waitlistParticipants > 0
      ? textZeile("Warteliste", teilnehmerWert(stats.waitlistParticipants))
      : null,
    stats.cancelledParticipants > 0
      ? textZeile("Storniert", teilnehmerWert(stats.cancelledParticipants))
      : null,
    stats.totalRevenueConfirmed > 0
      ? textZeile(
          "Umsatz (bestätigt)",
          formatPrice(stats.totalRevenueConfirmed),
        )
      : null,
    stats.totalRevenueConfirmed > 0
      ? textZeile("Bereits bezahlt", formatPrice(stats.paidRevenue))
      : null,
    stats.downPaymentsReceived > 0 || stats.downPaymentsOpen > 0
      ? textZeile(
          "Anzahlungen",
          `${formatPrice(stats.downPaymentsReceived)} eingegangen, ${formatPrice(stats.downPaymentsOpen)} offen`,
        )
      : null,
    stats.pendingDiscountRegistrations > 0
      ? textZeile(
          "Offene Rabattprüfungen",
          `${stats.pendingDiscountRegistrations} – bitte im Dashboard bearbeiten.`,
        )
      : null,
    stats.refundPendingRegistrations > 0
      ? textZeile(
          "Anzahlung nach Stornierung zu klären",
          `${stats.refundPendingRegistrations} – bitte mit der Kasse abstimmen.`,
        )
      : null,
  ];

  return emailText([
    "ANMELDEFRIST BEENDET",
    "",
    "Die Anmeldefrist für den folgenden Kurs ist abgelaufen. Im Anhang finden Sie eine Excel-Liste aller Teilnehmenden (ohne stornierte Anmeldungen).",
    "",
    courseTitle,
    ...kursZeilen,
    "",
    "ÜBERSICHT FÜR DIE PLANUNG",
    ...uebersichtZeilen,
    "",
    "Teilnehmer im Dashboard verwalten:",
    participantsUrl,
    "",
    "Diese E-Mail wurde automatisch versendet, sobald die Anmeldefrist abgelaufen ist.",
  ]);
}

const kursname = {
  ...grundtext,
  fontWeight: "bold" as const,
  fontSize: "17px",
  margin: "0 0 10px 0",
};

const hinweiszeile = {
  ...grundtext,
  fontWeight: "bold" as const,
  fontSize: "15px",
  margin: "14px 0 16px 0",
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
