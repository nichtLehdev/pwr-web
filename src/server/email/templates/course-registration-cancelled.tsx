import { Text } from "@react-email/components";
import { EmailLayout, Regel, abschnittskopf, grundtext } from "./email-layout";
import { emailText, textZeile } from "./email-text";
import { formatBerlin } from "@/lib/berlin-time";

interface CourseRegistrationCancelledProps {
  registrantFirstName: string;
  registrantLastName: string;
  courseTitle: string;
  startDate: Date;
  endDate: Date;
  participantsCount: number;
  registrationId: string;
}

const formatDate = (date: Date) => formatBerlin(date, "datumZweistellig");

export function CourseRegistrationCancelled({
  registrantFirstName,
  registrantLastName,
  courseTitle,
  startDate,
  endDate,
  participantsCount,
  registrationId,
}: CourseRegistrationCancelledProps) {
  return (
    <EmailLayout preview="Anmeldung storniert">
      <Text style={abschnittskopf}>Anmeldung storniert</Text>

      <Text style={grundtext}>
        Hallo {registrantFirstName} {registrantLastName},
      </Text>

      <Text style={grundtext}>
        deine Anmeldung für den folgenden Kurs wurde erfolgreich storniert:
      </Text>

      <Regel stark />
      <Text style={kursTitel}>{courseTitle}</Text>
      <Text style={grundtext}>
        <strong>Start:</strong> {formatDate(startDate)}
      </Text>
      <Text style={grundtext}>
        <strong>Ende:</strong> {formatDate(endDate)}
      </Text>
      <Text style={grundtext}>
        <strong>Teilnehmer:</strong> {participantsCount}{" "}
        {participantsCount === 1 ? "Person" : "Personen"}
      </Text>

      <Regel />

      <Text style={kursTitel}>ℹ️ Wichtige Informationen</Text>
      <Text style={grundtext}>
        Deine Anmeldung wurde vollständig storniert. Falls bereits eine Zahlung
        erfolgt ist, wende dich bitte an uns, um die Rückerstattung zu klären.
      </Text>

      <Regel />

      <Text style={grundtext}>
        Bei Fragen kannst du dich gerne an uns wenden.
      </Text>

      <Text style={grundtext}>
        Deine Anmelde-ID: <strong>{registrationId}</strong>
      </Text>
    </EmailLayout>
  );
}

/** Kurstitel als Sub-Überschrift über der Werttabelle. */
const kursTitel = {
  ...abschnittskopf,
  fontSize: "18px",
  lineHeight: "24px",
  margin: "0 0 12px 0",
};

/** Nur-Text-Fassung — gleicher Wortlaut, ohne Auszeichnung. */
export function courseRegistrationCancelledText({
  registrantFirstName,
  registrantLastName,
  courseTitle,
  startDate,
  endDate,
  participantsCount,
  registrationId,
}: CourseRegistrationCancelledProps): string {
  return emailText([
    "ANMELDUNG STORNIERT",
    "",
    `Hallo ${registrantFirstName} ${registrantLastName},`,
    "",
    "deine Anmeldung für den folgenden Kurs wurde erfolgreich storniert:",
    "",
    courseTitle,
    textZeile("Start", formatDate(startDate)),
    textZeile("Ende", formatDate(endDate)),
    textZeile(
      "Teilnehmer",
      `${participantsCount} ${participantsCount === 1 ? "Person" : "Personen"}`,
    ),
    "",
    "WICHTIGE INFORMATIONEN",
    "Deine Anmeldung wurde vollständig storniert. Falls bereits eine Zahlung erfolgt ist, wende dich bitte an uns, um die Rückerstattung zu klären.",
    "",
    "Bei Fragen kannst du dich gerne an uns wenden.",
    "",
    `Deine Anmelde-ID: ${registrationId}`,
  ]);
}
