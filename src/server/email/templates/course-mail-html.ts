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

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

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
    ? `<p style="font-size: 16px; font-weight: bold; color: #58595b; margin: 0 0 16px 0;">${
        recipientName ? `Hallo ${escapeHtml(recipientName)},` : "Hallo,"
      }</p>`
    : "";
  const safeTitle = escapeHtml(courseTitle);
  const dateRange =
    formatDate(courseStartDate) === formatDate(courseEndDate)
      ? formatDate(courseStartDate)
      : `${formatDate(courseStartDate)} – ${formatDate(courseEndDate)}`;

  const courseLink = courseUrl
    ? `<p style="font-size: 14px; color: #6b7280; line-height: 22px; margin: 8px 0 0 0;">
                  <a href="${escapeHtml(courseUrl)}" style="color: #faa619; text-decoration: underline;">Kurs auf der Website ansehen</a>
                </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} - Posaunenwerk Rheinland</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #faa619; padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0 0 8px 0; letter-spacing: 0.5px;">Posaunenwerk Rheinland</h1>
              <p style="color: #ffffff; font-size: 12px; font-weight: normal; margin: 0; opacity: 0.95; letter-spacing: 0.3px;">Evangelisches Posaunenwerk in der Evangelischen Kirche im Rheinland</p>
            </td>
          </tr>

          <!-- Course context -->
          <tr>
            <td style="padding: 24px 24px 0 24px;">
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px;">
                <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; margin: 0 0 4px 0;">Information zum Kurs</p>
                <p style="font-size: 18px; font-weight: bold; color: #58595b; margin: 0;">${safeTitle}</p>
                <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0 0;">${dateRange}</p>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px;">
              ${greetingLine}
              <div style="font-size: 16px; line-height: 26px; color: #58595b;">
                ${bodyHtml}
              </div>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />

              <p style="font-size: 14px; color: #6b7280; line-height: 22px; margin: 0;">
                Diese Nachricht wurde dir von <strong>${escapeHtml(senderName)}</strong> geschickt,
                weil du eine Anmeldung für den Kurs „${safeTitle}“ vorgenommen hast.
                Antworten auf diese E-Mail gehen an
                <a href="mailto:${escapeHtml(replyToEmail)}" style="color: #faa619; text-decoration: underline;">${escapeHtml(replyToEmail)}</a>.
              </p>${courseLink}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f5f5f5; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                Evangelisches Posaunenwerk in der Evangelischen Kirche im Rheinland
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
