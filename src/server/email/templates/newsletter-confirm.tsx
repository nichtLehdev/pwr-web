import { Button, Section, Text } from "@react-email/components";
import {
  EmailLayout,
  Regel,
  abschnittskopf,
  ersatzLink,
  grundtext,
  kleintext,
  knopf,
} from "./email-layout";
import { emailText, textLink } from "./email-text";

interface NewsletterConfirmProps {
  confirmUrl: string;
  subscriberName?: string;
}

/**
 * Double opt-in mail: the only thing standing between a typed-in address and
 * an active subscription. Deliberately contains no newsletter content — it is
 * a confirmation request, not a first issue.
 */
export function NewsletterConfirm({
  confirmUrl,
  subscriberName,
}: NewsletterConfirmProps) {
  return (
    <EmailLayout preview="Newsletter-Anmeldung bestätigen">
      <Text style={abschnittskopf}>Newsletter-Anmeldung bestätigen</Text>

      <Text style={grundtext}>
        {subscriberName ? `Hallo ${subscriberName},` : "Hallo,"}
      </Text>

      <Text style={grundtext}>
        diese E-Mail-Adresse wurde für den Newsletter des Posaunenwerks
        Rheinland angemeldet. Bitte bestätige die Anmeldung mit einem Klick —
        erst danach schicken wir dir den Newsletter.
      </Text>

      <Section style={knopfFeld}>
        <Button style={knopf} href={confirmUrl}>
          Anmeldung bestätigen
        </Button>
      </Section>

      <Text style={grundtext}>
        Falls der Button nicht funktioniert, kopiere diesen Link in deinen
        Browser:
      </Text>
      <Text style={ersatzLink}>{confirmUrl}</Text>

      <Regel />

      <Text style={kleintext}>
        Du hast dich nicht angemeldet? Dann ignoriere diese E-Mail einfach. Ohne
        deine Bestätigung versenden wir nichts an diese Adresse, und die
        Anmeldung verfällt von selbst.
      </Text>

      <Text style={kleintext}>Dieser Link ist 7 Tage gültig.</Text>
    </EmailLayout>
  );
}

/** Nur-Text-Fassung — gleicher Wortlaut, ohne Auszeichnung. */
export function newsletterConfirmText({
  confirmUrl,
  subscriberName,
}: NewsletterConfirmProps): string {
  return emailText([
    "NEWSLETTER-ANMELDUNG BESTÄTIGEN",
    "",
    subscriberName ? `Hallo ${subscriberName},` : "Hallo,",
    "",
    "diese E-Mail-Adresse wurde für den Newsletter des Posaunenwerks Rheinland angemeldet. Bitte bestätige die Anmeldung über die folgende Adresse — erst danach schicken wir dir den Newsletter:",
    "",
    textLink("Anmeldung bestätigen:", confirmUrl),
    "",
    "Du hast dich nicht angemeldet? Dann ignoriere diese E-Mail einfach. Ohne deine Bestätigung versenden wir nichts an diese Adresse, und die Anmeldung verfällt von selbst.",
    "",
    "Dieser Link ist 7 Tage gültig.",
  ]);
}

const knopfFeld = {
  textAlign: "center" as const,
  margin: "28px 0",
};
