/**
 * Generate newsletter email HTML manually
 * This approach gives us full control over HTML injection
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

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter - Posaunenwerk Rheinland</title>
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
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="font-size: 18px; font-weight: bold; color: #58595b; margin: 0 0 24px 0;">${greeting}</p>
              
              <!-- Newsletter Content -->
              <div style="font-size: 16px; line-height: 26px; color: #58595b; margin-bottom: 16px;">
                ${content}
              </div>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
              
              <!-- Unsubscribe -->
              <div style="text-align: center; margin-top: 32px;">
                <p style="font-size: 12px; color: #6b7280; line-height: 20px; margin: 0;">
                  Du möchtest keine Newsletter mehr erhalten? 
                  <a href="${unsubscribeUrl}" style="color: #faa619; text-decoration: underline;">Hier abmelden</a>
                </p>
              </div>
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
