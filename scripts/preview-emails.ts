/**
 * Rendert E-Mail-Vorlagen lokal nach HTML, damit man sie ansehen kann.
 * Nur für die Entwicklung.  pnpm exec tsx scripts/preview-emails.ts
 */
import { createElement } from "react";
import { render } from "@react-email/components";
import { writeFileSync, mkdirSync } from "fs";
import { CourseRegistrationConfirmed } from "../src/server/email/templates/course-registration-confirmed";
import { VerificationEmail } from "../src/server/email/templates/verification-email";
import { NewsletterConfirm } from "../src/server/email/templates/newsletter-confirm";
import { PasswordResetEmail } from "../src/server/email/templates/password-reset-email";

const OUT =
  "/private/tmp/claude-501/-Users-lars-Develompent-pwr-web/37912ebe-1f84-4649-8d3d-671da6870c0a/scratchpad/mails";
mkdirSync(OUT, { recursive: true });

const vorlagen = [
  [
    "anmeldung-bestaetigt",
    CourseRegistrationConfirmed,
    {
      registrantFirstName: "Claude",
      registrantLastName: "Test",
      courseTitle: "Lehrgang für Jungbläser*innen",
      startDate: new Date("2026-10-02"),
      endDate: new Date("2026-10-05"),
      totalPrice: 155,
      participantsCount: 2,
      registrationId: "31352115-b789-4bb7-b9ee-938ce1414a71",
      manageUrl: "https://example.org/anmeldung-verwalten?token=abc",
    },
  ],
  [
    "bestaetigung",
    VerificationEmail,
    {
      verificationUrl: "https://example.org/verify?token=abc",
      userName: "Claude Test",
    },
  ],
  [
    "newsletter-bestaetigen",
    NewsletterConfirm,
    {
      confirmUrl: "https://example.org/newsletter/bestaetigen?token=abc",
      subscriberName: "Claude",
    },
  ],
  [
    "passwort-zuruecksetzen",
    PasswordResetEmail,
    {
      resetUrl: "https://example.org/reset-password?token=abc",
      userName: "Claude Test",
    },
  ],
] as const;

async function main() {
  for (const [name, Komponente, props] of vorlagen) {
    const html = await render(
      createElement(Komponente as never, props as never),
    );
    writeFileSync(`${OUT}/${name}.html`, html);
    console.log(`gerendert: ${name}.html (${html.length} Zeichen)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
