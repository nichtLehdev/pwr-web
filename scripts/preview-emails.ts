/**
 * Rendert E-Mail-Vorlagen lokal nach HTML, damit man sie ansehen kann.
 * Nur für die Entwicklung.  pnpm exec tsx scripts/preview-emails.ts
 */
import { createElement } from "react";
import { render } from "@react-email/components";
import { writeFileSync, mkdirSync } from "fs";
import {
  CourseRegistrationConfirmed,
  courseRegistrationConfirmedText,
} from "../src/server/email/templates/course-registration-confirmed";
import {
  CourseRegistrationWaitlist,
  courseRegistrationWaitlistText,
} from "../src/server/email/templates/course-registration-waitlist";
import {
  CourseRegistrationCancelled,
  courseRegistrationCancelledText,
} from "../src/server/email/templates/course-registration-cancelled";
import {
  CourseRegistrationPendingDiscount,
  courseRegistrationPendingDiscountText,
} from "../src/server/email/templates/course-registration-pending-discount";
import {
  VerificationEmail,
  verificationEmailText,
} from "../src/server/email/templates/verification-email";
import {
  NewsletterConfirm,
  newsletterConfirmText,
} from "../src/server/email/templates/newsletter-confirm";
import { PasswordResetEmail } from "../src/server/email/templates/password-reset-email";
import {
  NewsletterEmail,
  newsletterEmailText,
} from "../src/server/email/templates/newsletter";
import {
  ContactMessage,
  contactMessageText,
} from "../src/server/email/templates/contact-message";
import {
  ContentReviewResult,
  contentReviewResultText,
} from "../src/server/email/templates/content-review-result";
import {
  generateNewsletterHtml,
  generateNewsletterText,
} from "../src/server/email/templates/newsletter-html";
import {
  generateCourseMailHtml,
  generateCourseMailText,
} from "../src/server/email/templates/course-mail-html";
import {
  SiblingDiscountApproved,
  siblingDiscountApprovedText,
} from "../src/server/email/templates/sibling-discount-approved";
import {
  SiblingDiscountRejected,
  siblingDiscountRejectedText,
} from "../src/server/email/templates/sibling-discount-rejected";
import {
  RegistrationAccessLinks,
  registrationAccessLinksText,
} from "../src/server/email/templates/registration-access-links";
import {
  CourseRegistrationClosedOverview,
  courseRegistrationClosedOverviewText,
} from "../src/server/email/templates/course-registration-closed-overview";
import type { DownPaymentMailInfo } from "../src/server/email/down-payment";
import type { CourseRegistrationStats } from "../src/lib/course-participants-export";

const OUT =
  "/private/tmp/claude-501/-Users-lars-Develompent-pwr-web/37912ebe-1f84-4649-8d3d-671da6870c0a/scratchpad/mails";
mkdirSync(OUT, { recursive: true });

/** Anzahlung noch offen, jetzt fällig — zeigt Bankdaten und (Platzhalter-)GiroCode. */
const downPaymentFaellig: DownPaymentMailInfo = {
  amount: 50,
  reference: "K-2026-10 Test, Claude",
  refundNotice:
    "Bei Stornierung bis 4 Wochen vor Kursbeginn erstatten wir die Anzahlung vollständig.",
  dueNow: true,
  alreadyPaid: false,
  beneficiary: "Posaunenwerk der Evangelischen Kirche im Rheinland e.V.",
  iban: "DE12 3456 7890 1234 5678 90",
  bic: "GENODED1XXX",
  bankName: "KD-Bank",
};

/** Anzahlung noch nicht fällig — Warteliste, Betrag steht, Bankdaten fehlen noch. */
const downPaymentNichtFaellig: DownPaymentMailInfo = {
  ...downPaymentFaellig,
  dueNow: false,
};

/** Anzahlung schon eingegangen — z. B. vom Team bei der Erfassung verbucht. */
const downPaymentBezahlt: DownPaymentMailInfo = {
  ...downPaymentFaellig,
  alreadyPaid: true,
};

const vorlagen = [
  [
    "anmeldung-bestaetigt",
    CourseRegistrationConfirmed,
    courseRegistrationConfirmedText,
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
      downPayment: downPaymentFaellig,
      downPaymentHasQr: true,
    },
  ],
  [
    "auf-warteliste",
    CourseRegistrationWaitlist,
    courseRegistrationWaitlistText,
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
      downPayment: downPaymentNichtFaellig,
    },
  ],
  [
    "anmeldung-storniert",
    CourseRegistrationCancelled,
    courseRegistrationCancelledText,
    {
      registrantFirstName: "Claude",
      registrantLastName: "Test",
      courseTitle: "Lehrgang für Jungbläser*innen",
      startDate: new Date("2026-10-02"),
      endDate: new Date("2026-10-05"),
      participantsCount: 2,
      registrationId: "31352115-b789-4bb7-b9ee-938ce1414a71",
    },
  ],
  [
    "anmeldung-rabatt-pruefung",
    CourseRegistrationPendingDiscount,
    courseRegistrationPendingDiscountText,
    {
      registrantFirstName: "Claude",
      registrantLastName: "Test",
      courseTitle: "Lehrgang für Jungbläser*innen",
      startDate: new Date("2026-10-02"),
      endDate: new Date("2026-10-05"),
      originalTotalPrice: 310,
      discountAmount: 62,
      finalTotalPrice: 248,
      participantsCount: 2,
      registrationId: "31352115-b789-4bb7-b9ee-938ce1414a71",
      manageUrl: "https://example.org/anmeldung-verwalten?token=abc",
      downPayment: downPaymentBezahlt,
      downPaymentHasQr: false,
    },
  ],
  [
    "bestaetigung",
    VerificationEmail,
    verificationEmailText,
    {
      verificationUrl: "https://example.org/verify?token=abc",
      userName: "Claude Test",
    },
  ],
  [
    "newsletter-bestaetigen",
    NewsletterConfirm,
    newsletterConfirmText,
    {
      confirmUrl: "https://example.org/newsletter/bestaetigen?token=abc",
      subscriberName: "Claude",
    },
  ],
  [
    "passwort-zuruecksetzen",
    PasswordResetEmail,
    null,
    {
      resetUrl: "https://example.org/reset-password?token=abc",
      userName: "Claude Test",
    },
  ],
  [
    "geschwisterkindrabatt-genehmigt",
    SiblingDiscountApproved,
    siblingDiscountApprovedText,
    {
      registrantFirstName: "Claude",
      registrantLastName: "Test",
      courseTitle: "Lehrgang für Jungbläser*innen",
      startDate: new Date("2026-10-02"),
      endDate: new Date("2026-10-05"),
      originalTotalPrice: 310,
      discountAmount: 62,
      finalTotalPrice: 248,
      participantsCount: 2,
      registrationId: "31352115-b789-4bb7-b9ee-938ce1414a71",
      manageUrl: "https://example.org/anmeldung-verwalten?token=abc",
    },
  ],
  [
    "geschwisterkindrabatt-abgelehnt",
    SiblingDiscountRejected,
    siblingDiscountRejectedText,
    {
      registrantFirstName: "Claude",
      registrantLastName: "Test",
      courseTitle: "Lehrgang für Jungbläser*innen",
      startDate: new Date("2026-10-02"),
      endDate: new Date("2026-10-05"),
      originalTotalPrice: 310,
      participantsCount: 2,
      registrationId: "31352115-b789-4bb7-b9ee-938ce1414a71",
      manageUrl: "https://example.org/anmeldung-verwalten?token=abc",
    },
  ],
  [
    "anmeldungen-zugang",
    RegistrationAccessLinks,
    registrationAccessLinksText,
    {
      registrantFirstName: "Claude",
      registrations: [
        {
          courseTitle: "Lehrgang für Jungbläser*innen",
          startDate: new Date("2026-10-02"),
          endDate: new Date("2026-10-05"),
          statusLabel: "Bestätigt",
          participantsCount: 2,
          manageUrl: "https://example.org/anmeldung-verwalten?token=abc1",
        },
        {
          courseTitle: "Bläserfreizeit Herbst",
          startDate: new Date("2026-11-06"),
          endDate: new Date("2026-11-08"),
          statusLabel: "Warteliste",
          participantsCount: 1,
          manageUrl: "https://example.org/anmeldung-verwalten?token=abc2",
        },
      ],
    },
  ],
  [
    "anmeldefrist-beendet",
    CourseRegistrationClosedOverview,
    courseRegistrationClosedOverviewText,
    {
      courseTitle: "Lehrgang für Jungbläser*innen",
      registrationDeadline: new Date("2026-09-20T18:00:00"),
      startDate: new Date("2026-10-02"),
      endDate: new Date("2026-10-05"),
      locationName: "Freizeitheim Vallendar",
      maxParticipants: 40,
      allowWaitingList: true,
      stats: {
        confirmedParticipants: 34,
        waitlistParticipants: 6,
        cancelledParticipants: 2,
        activeRegistrations: 20,
        pendingDiscountRegistrations: 3,
        totalRevenueConfirmed: 5270,
        paidRevenue: 3100,
        downPaymentsReceived: 1200,
        downPaymentsOpen: 400,
        refundPendingRegistrations: 1,
      } satisfies CourseRegistrationStats,
      participantsUrl: "https://example.org/dashboard/kurse/abc/teilnehmer",
    },
  ],
  [
    "newsletter",
    NewsletterEmail,
    newsletterEmailText,
    {
      content:
        "<p>Liebe Bläserinnen und Bläser,</p><p>der Herbstlehrgang ist ausgebucht — die Warteliste läuft noch bis Ende der Woche.</p><ul><li>Anmeldeschluss: 20.09.2026</li><li>Neue Termine für 2027 folgen im Winter</li></ul>",
      unsubscribeUrl: "https://example.org/newsletter/abmelden?token=abc",
      subscriberName: "Claude",
    },
  ],
  [
    "kontaktformular",
    ContactMessage,
    contactMessageText,
    {
      name: "Claude Test",
      email: "claude@example.org",
      phone: "0261 1234567",
      subjectLabel: "Allgemeine Anfrage",
      message:
        "Hallo,\n\nich wollte fragen, ob es noch freie Plätze im Herbstlehrgang gibt.\n\nViele Grüße\nClaude",
    },
  ],
  [
    "pruefergebnis-veroeffentlicht",
    ContentReviewResult,
    contentReviewResultText,
    {
      recipientName: "Claude",
      contentType: "course",
      title: "Lehrgang für Jungbläser*innen",
      approved: true,
      reviewNotes: null,
      dashboardUrl: "https://example.org/dashboard/kurse/abc",
    },
  ],
  [
    "pruefergebnis-abgelehnt",
    ContentReviewResult,
    contentReviewResultText,
    {
      recipientName: "Claude",
      contentType: "post",
      title: "Rückblick: Landesposaunentag 2026",
      approved: false,
      reviewNotes:
        "Bitte noch ein Titelbild ergänzen und die Quellen der Zitate nennen.",
      dashboardUrl: "https://example.org/dashboard/beitraege/abc",
    },
  ],
] as const;

/** Die beiden HTML-Zeichenketten-Bauer — kein react-email, direkter Aufruf. */
const htmlBauer = [
  [
    "newsletter-html",
    () =>
      generateNewsletterHtml({
        content:
          "<p>Liebe Bläserinnen und Bläser,</p><p>der Herbstlehrgang ist ausgebucht — die Warteliste läuft noch bis Ende der Woche.</p><ul><li>Anmeldeschluss: 20.09.2026</li><li>Neue Termine für 2027 folgen im Winter</li></ul>",
        unsubscribeUrl: "https://example.org/newsletter/abmelden?token=abc",
        subscriberName: "Claude",
      }),
    () =>
      generateNewsletterText({
        unsubscribeUrl: "https://example.org/newsletter/abmelden?token=abc",
        subscriberName: "Claude",
      }),
  ],
  [
    "kursmail-html",
    () =>
      generateCourseMailHtml({
        bodyHtml:
          "<p>bitte denkt daran, festes Schuhwerk und eine Regenjacke einzupacken.</p><p>Wir freuen uns auf euch!</p>",
        courseTitle: "Lehrgang für Jungbläser*innen",
        courseStartDate: new Date("2026-10-02"),
        courseEndDate: new Date("2026-10-05"),
        recipientName: "Claude",
        senderName: "Anna Organisatorin",
        replyToEmail: "anna@example.org",
        courseUrl: "https://example.org/kurse/lehrgang-jungblaeser",
        includeGreeting: true,
      }),
    () =>
      generateCourseMailText({
        courseTitle: "Lehrgang für Jungbläser*innen",
        courseStartDate: new Date("2026-10-02"),
        courseEndDate: new Date("2026-10-05"),
        recipientName: "Claude",
        senderName: "Anna Organisatorin",
        replyToEmail: "anna@example.org",
        courseUrl: "https://example.org/kurse/lehrgang-jungblaeser",
        includeGreeting: true,
      }),
  ],
] as const;

async function main() {
  for (const [name, Komponente, textFn, props] of vorlagen) {
    const html = await render(
      createElement(Komponente as never, props as never),
    );
    writeFileSync(`${OUT}/${name}.html`, html);
    console.log(`gerendert: ${name}.html (${html.length} Zeichen)`);

    if (textFn) {
      const text = (textFn as (p: never) => string)(props as never);
      console.log(`\n----- Nur-Text-Fassung: ${name} -----`);
      console.log(text);
      console.log(`----- Ende: ${name} -----\n`);
    }
  }

  for (const [name, htmlFn, textFn] of htmlBauer) {
    const html = htmlFn();
    writeFileSync(`${OUT}/${name}.html`, html);
    console.log(`gerendert: ${name}.html (${html.length} Zeichen)`);

    const text = textFn();
    console.log(`\n----- Nur-Text-Fassung: ${name} -----`);
    console.log(text);
    console.log(`----- Ende: ${name} -----\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
