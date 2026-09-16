import { Button, Hr, Section, Text } from "@react-email/components";
import {
  EmailLayout,
  abschnittskopf,
  farben,
  grundtext,
  haarlinie,
  knopf,
  tintenstrich,
} from "./email-layout";
import { emailText, textLink } from "./email-text";

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
  const kopfzeile = approved
    ? `${typeLabel} veröffentlicht`
    : `${typeLabel} abgelehnt`;

  return (
    <EmailLayout preview={kopfzeile}>
      <Text style={abschnittskopf}>{kopfzeile}</Text>

      <Text style={grundtext}>Hallo {recipientName},</Text>

      <Text style={grundtext}>
        {approved
          ? `${contentType === "post" ? "dein" : "deine"} ${typeLabel} wurde geprüft und ist jetzt veröffentlicht:`
          : `${contentType === "post" ? "dein" : "deine"} ${typeLabel} wurde geprüft und leider abgelehnt:`}
      </Text>

      <Hr style={tintenstrich} />
      <Text style={titelStil}>{title}</Text>
      <Hr style={haarlinie} />

      {reviewNotes ? (
        <>
          <Text style={grundtext}>
            <strong>Anmerkungen der Prüfung:</strong>
          </Text>
          <Section style={anmerkungenFeld}>
            <Text style={anmerkungenText}>{reviewNotes}</Text>
          </Section>
        </>
      ) : null}

      {!approved && (
        <Text style={grundtext}>
          Du kannst {contentType === "post" ? "den Beitrag" : "sie"} im
          Dashboard überarbeiten und erneut zur Prüfung einreichen.
        </Text>
      )}

      <Section style={knopfFeld}>
        <Button style={knopf} href={dashboardUrl}>
          Im Dashboard ansehen
        </Button>
      </Section>

      <Text style={grundtext}>
        Bei Fragen kannst du dich gerne an uns wenden.
      </Text>
    </EmailLayout>
  );
}

/** Nur-Text-Fassung — gleicher Wortlaut, ohne Auszeichnung. */
export function contentReviewResultText({
  recipientName,
  contentType,
  title,
  approved,
  reviewNotes,
  dashboardUrl,
}: ContentReviewResultProps): string {
  const typeLabel = CONTENT_TYPE_LABELS[contentType];
  const kopfzeile = approved
    ? `${typeLabel} veröffentlicht`
    : `${typeLabel} abgelehnt`;

  return emailText([
    kopfzeile.toUpperCase(),
    "",
    `Hallo ${recipientName},`,
    "",
    approved
      ? `${contentType === "post" ? "dein" : "deine"} ${typeLabel} wurde geprüft und ist jetzt veröffentlicht:`
      : `${contentType === "post" ? "dein" : "deine"} ${typeLabel} wurde geprüft und leider abgelehnt:`,
    "",
    title,
    "",
    reviewNotes ? "Anmerkungen der Prüfung:" : null,
    reviewNotes ? reviewNotes : null,
    reviewNotes ? "" : null,
    !approved
      ? `Du kannst ${contentType === "post" ? "den Beitrag" : "sie"} im Dashboard überarbeiten und erneut zur Prüfung einreichen.`
      : null,
    !approved ? "" : null,
    textLink("Im Dashboard ansehen:", dashboardUrl),
    "",
    "Bei Fragen kannst du dich gerne an uns wenden.",
  ]);
}

const titelStil = {
  ...grundtext,
  fontSize: "18px",
  fontWeight: "bold" as const,
  margin: "16px 0",
};

const anmerkungenFeld = {
  borderLeft: `2px solid ${farben.ink}`,
  paddingLeft: "16px",
  margin: "0 0 16px 0",
};

const anmerkungenText = {
  ...grundtext,
  margin: "0",
  whiteSpace: "pre-wrap" as const,
};

const knopfFeld = {
  textAlign: "center" as const,
  margin: "28px 0",
};
