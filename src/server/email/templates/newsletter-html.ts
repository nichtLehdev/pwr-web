import { emailBaseUrl, farben, schrift } from "./email-layout";
import { emailText, textLink } from "./email-text";

/** Doppelte Anführungszeichen aus `schrift` würden das `style="…"`-Attribut vorzeitig schließen. */
const htmlSchrift = schrift.replace(/"/g, "'");

/**
 * Zeichenketten-Bauer statt react-email: `content` ist bereits bereinigtes
 * Autoren-HTML und wird unverändert eingesetzt.
 */
export function generateNewsletterHtml({
  content,
  unsubscribeUrl,
  subscriberName,
}: {
  content: string; // HTML content
  unsubscribeUrl: string;
  subscriberName?: string;
}): string {
  const greeting = subscriberName ? `Hallo ${subscriberName},` : "Hallo,";
  const basis = emailBaseUrl();

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter - Posaunenwerk Rheinland</title>
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

          <!-- Inhalt -->
          <tr>
            <td style="padding: 32px 24px 8px 24px; border-top: 2px solid ${farben.ink};">
              <p style="font-family: ${htmlSchrift}; font-size: 16px; line-height: 26px; color: ${farben.ink}; font-weight: bold; margin: 0 0 16px 0;">${greeting}</p>

              <!-- Newsletter Content -->
              <div style="font-family: ${htmlSchrift}; font-size: 16px; line-height: 26px; color: ${farben.ink};">
                ${content}
              </div>

              <!-- Trennlinie als gefuellte Zelle: Outlook laesst Rahmen an
                   Trennelementen je nach Fassung fallen. -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 28px 0;">
                <tr><td style="height: 1px; line-height: 1px; font-size: 1px; background-color: ${farben.rule};">&nbsp;</td></tr>
              </table>

              <!-- Unsubscribe -->
              <div style="text-align: center; margin: 0 0 20px 0;">
                <p style="font-family: ${htmlSchrift}; font-size: 12px; color: ${farben.muted}; line-height: 20px; margin: 0;">
                  Du möchtest keine Newsletter mehr erhalten?
                  <a href="${unsubscribeUrl}" style="color: ${farben.primaryInk}; text-decoration: underline; font-weight: bold;">Hier abmelden</a>
                </p>
              </div>
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

/** Ohne den Rumpf: Autoren-HTML lässt sich nicht verlustfrei in Text verwandeln. */
export function generateNewsletterText({
  unsubscribeUrl,
  subscriberName,
}: {
  unsubscribeUrl: string;
  subscriberName?: string;
}): string {
  const greeting = subscriberName ? `Hallo ${subscriberName},` : "Hallo,";

  return emailText([
    "NEWSLETTER",
    "",
    greeting,
    "",
    "Diese Textfassung enthält den Newsletter-Inhalt nicht — er liegt nur als Gestaltung für das HTML-Postfach vor.",
    "",
    textLink("Newsletter abbestellen:", unsubscribeUrl),
  ]);
}
