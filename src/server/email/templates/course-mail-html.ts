import { emailBaseUrl, farben, schrift } from "./email-layout";
import { emailText, textLink } from "./email-text";
import { formatBerlin } from "@/lib/berlin-time";

/**
 * `schrift` enthält Schriftnamen in doppelten Anführungszeichen (für
 * React-Inline-Styles unproblematisch). In einem HTML-`style="…"`-Attribut
 * würden sie die Anführung vorzeitig schließen und alles Folgende
 * verschlucken — deshalb hier auf einfache umgesetzt.
 */
const htmlSchrift = schrift.replace(/"/g, "'");

/**
 * Mail an organizer writes to the registrants of a course.
 *
 * Built as an HTML string rather than a react-email component for the same
 * reason as the newsletter: the body is author-provided HTML that has to be
 * injected verbatim. Callers MUST pass body HTML that already went through
 * sanitizeHtml().
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const formatDate = (date: Date) => formatBerlin(date, "datumZweistellig");

export function generateCourseMailHtml({
  bodyHtml,
  courseTitle,
  courseStartDate,
  courseEndDate,
  recipientName,
  senderName,
  replyToEmail,
  courseUrl,
  includeGreeting = true,
}: {
  /** Already sanitized HTML. */
  bodyHtml: string;
  courseTitle: string;
  courseStartDate: Date;
  courseEndDate: Date;
  recipientName?: string;
  senderName: string;
  replyToEmail: string;
  courseUrl?: string;
  /** Off when the author wrote their own salutation with placeholders. */
  includeGreeting?: boolean;
}): string {
  const greetingLine = includeGreeting
    ? `<p style="font-family: ${htmlSchrift}; font-size: 16px; font-weight: bold; color: ${farben.ink}; margin: 0 0 16px 0;">${
        recipientName ? `Hallo ${escapeHtml(recipientName)},` : "Hallo,"
      }</p>`
    : "";
  const safeTitle = escapeHtml(courseTitle);
  const dateRange =
    formatDate(courseStartDate) === formatDate(courseEndDate)
      ? formatDate(courseStartDate)
      : `${formatDate(courseStartDate)} – ${formatDate(courseEndDate)}`;

  const courseLink = courseUrl
    ? `<p style="font-family: ${htmlSchrift}; font-size: 14px; color: ${farben.muted}; line-height: 22px; margin: 8px 0 0 0;">
                  <a href="${escapeHtml(courseUrl)}" style="color: ${farben.primaryInk}; text-decoration: underline; font-weight: bold;">Kurs auf der Website ansehen</a>
                </p>`
    : "";
  const basis = emailBaseUrl();

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} - Posaunenwerk Rheinland</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${farben.paper}; font-family: ${htmlSchrift};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${farben.paper};">
    <tr>
      <td align="center" style="padding: 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: ${farben.paper};">
          <!-- Kopf -->
          <tr>
            <td style="background-color: ${farben.primary}; padding: 28px 24px; text-align: center;">
              <img src="${basis}/images/logo-icon-ink.png" width="24" height="59" alt="" style="display: block; margin: 0 auto 12px auto; border: 0;">
              <p style="font-family: ${htmlSchrift}; color: ${farben.ink}; font-size: 24px; line-height: 28px; font-weight: bold; margin: 0 0 4px 0;">Posaunenwerk Rheinland</p>
              <p style="font-family: ${htmlSchrift}; color: ${farben.ink}; font-size: 12px; line-height: 18px; margin: 0;">Posaunenwerk der Evangelischen Kirche im Rheinland</p>
            </td>
          </tr>

          <!-- Kursangaben -->
          <tr>
            <td style="padding: 24px 24px 0 24px; border-top: 2px solid ${farben.ink};">
              <p style="font-family: ${htmlSchrift}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: ${farben.muted}; margin: 0 0 4px 0;">Information zum Kurs</p>
              <p style="font-family: ${htmlSchrift}; font-size: 18px; font-weight: bold; color: ${farben.ink}; margin: 0;">${safeTitle}</p>
              <p style="font-family: ${htmlSchrift}; font-size: 14px; color: ${farben.muted}; margin: 4px 0 0 0;">${dateRange}</p>
            </td>
          </tr>

          <!-- Inhalt -->
          <tr>
            <td style="padding: 24px;">
              ${greetingLine}
              <div style="font-family: ${htmlSchrift}; font-size: 16px; line-height: 26px; color: ${farben.ink};">
                ${bodyHtml}
              </div>

              <!-- Trennlinie als gefuellte Zelle: Outlook laesst Rahmen an
                   Trennelementen je nach Fassung fallen. -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 28px 0;">
                <tr><td style="height: 1px; line-height: 1px; font-size: 1px; background-color: ${farben.rule};">&nbsp;</td></tr>
              </table>

              <p style="font-family: ${htmlSchrift}; font-size: 14px; color: ${farben.muted}; line-height: 22px; margin: 0;">
                Diese Nachricht wurde dir von <strong>${escapeHtml(senderName)}</strong> geschickt,
                weil du eine Anmeldung für den Kurs „${safeTitle}“ vorgenommen hast.
                Antworten auf diese E-Mail gehen an
                <a href="mailto:${escapeHtml(replyToEmail)}" style="color: ${farben.primaryInk}; text-decoration: underline; font-weight: bold;">${escapeHtml(replyToEmail)}</a>.
              </p>${courseLink}
            </td>
          </tr>

          <!-- Fuß -->
          <tr>
            <td style="padding: 20px 24px 32px 24px; border-top: 1px solid ${farben.rule};">
              <p style="font-family: ${htmlSchrift}; font-size: 12px; line-height: 18px; color: ${farben.muted}; margin: 0; text-align: center;">
                Posaunenwerk der Evangelischen Kirche im Rheinland e.V.
              </p>
              <p style="font-family: ${htmlSchrift}; font-size: 12px; line-height: 18px; color: ${farben.muted}; margin: 0; text-align: center;">
                Rudolf-Harbig-Str. 20 · 56179 Vallendar
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Nur-Text-Fassung. Der Rumpf ist vom Autor verfasstes HTML und lässt sich
 * nicht verlustfrei in Text verwandeln — daher nur Kursangaben, Anrede,
 * Kontakthinweis und Kurslink, ohne den eigentlichen Inhalt.
 */
export function generateCourseMailText({
  courseTitle,
  courseStartDate,
  courseEndDate,
  recipientName,
  senderName,
  replyToEmail,
  courseUrl,
  includeGreeting = true,
}: {
  courseTitle: string;
  courseStartDate: Date;
  courseEndDate: Date;
  recipientName?: string;
  senderName: string;
  replyToEmail: string;
  courseUrl?: string;
  includeGreeting?: boolean;
}): string {
  const dateRange =
    formatDate(courseStartDate) === formatDate(courseEndDate)
      ? formatDate(courseStartDate)
      : `${formatDate(courseStartDate)} – ${formatDate(courseEndDate)}`;

  return emailText([
    courseTitle,
    dateRange,
    "",
    includeGreeting
      ? recipientName
        ? `Hallo ${recipientName},`
        : "Hallo,"
      : null,
    includeGreeting ? "" : null,
    "Diese Textfassung enthält die Nachricht nicht — sie liegt nur als Gestaltung für das HTML-Postfach vor.",
    "",
    `Diese Nachricht wurde dir von ${senderName} geschickt, weil du eine Anmeldung für den Kurs „${courseTitle}“ vorgenommen hast. Antworten auf diese E-Mail gehen an ${replyToEmail}.`,
    courseUrl ? "" : null,
    courseUrl ? textLink("Kurs auf der Website ansehen:", courseUrl) : null,
  ]);
}
