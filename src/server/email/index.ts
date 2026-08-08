import { render } from "@react-email/components";
import { sendEmail, type EmailAttachment } from "./send-email";
import { VerificationEmail } from "./templates/verification-email";
import { PasswordResetEmail } from "./templates/password-reset-email";
import { CourseRegistrationConfirmed } from "./templates/course-registration-confirmed";
import { CourseRegistrationWaitlist } from "./templates/course-registration-waitlist";
import { SiblingDiscountApproved } from "./templates/sibling-discount-approved";
import { SiblingDiscountRejected } from "./templates/sibling-discount-rejected";
import { CourseRegistrationPendingDiscount } from "./templates/course-registration-pending-discount";
import { CourseRegistrationCancelled } from "./templates/course-registration-cancelled";
import { CourseRegistrationClosedOverview } from "./templates/course-registration-closed-overview";
import {
  ContentReviewResult,
  type ReviewedContentType,
} from "./templates/content-review-result";
import { ContactMessage } from "./templates/contact-message";
import { generateCourseMailHtml } from "./templates/course-mail-html";
import type { CourseRegistrationStats } from "@/lib/course-participants-export";

export async function sendVerificationEmail(
  email: string,
  verificationUrl: string,
  userName?: string,
) {
  const html = await render(
    VerificationEmail({
      verificationUrl,
      userName,
    }),
  );

  return sendEmail({
    to: email,
    subject: "E-Mail-Adresse bestätigen - Posaunenwerk Rheinland",
    html,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  userName?: string,
) {
  const html = await render(
    PasswordResetEmail({
      resetUrl,
      userName,
    }),
  );

  return sendEmail({
    to: email,
    subject: "Passwort zurücksetzen - Posaunenwerk Rheinland",
    html,
  });
}

export async function sendCourseRegistrationConfirmedEmail(
  email: string,
  registrantFirstName: string,
  registrantLastName: string,
  courseTitle: string,
  startDate: Date,
  endDate: Date,
  totalPrice: number,
  participantsCount: number,
  registrationId: string,
) {
  const html = await render(
    CourseRegistrationConfirmed({
      registrantFirstName,
      registrantLastName,
      courseTitle,
      startDate,
      endDate,
      totalPrice,
      participantsCount,
      registrationId,
    }),
  );

  return sendEmail({
    to: email,
    subject: `Anmeldung bestätigt: ${courseTitle} - Posaunenwerk Rheinland`,
    html,
  });
}

export async function sendCourseRegistrationWaitlistEmail(
  email: string,
  registrantFirstName: string,
  registrantLastName: string,
  courseTitle: string,
  startDate: Date,
  endDate: Date,
  totalPrice: number,
  participantsCount: number,
  registrationId: string,
) {
  const html = await render(
    CourseRegistrationWaitlist({
      registrantFirstName,
      registrantLastName,
      courseTitle,
      startDate,
      endDate,
      totalPrice,
      participantsCount,
      registrationId,
    }),
  );

  return sendEmail({
    to: email,
    subject: `Auf Warteliste: ${courseTitle} - Posaunenwerk Rheinland`,
    html,
  });
}

export async function sendSiblingDiscountApprovedEmail(
  email: string,
  registrantFirstName: string,
  registrantLastName: string,
  courseTitle: string,
  startDate: Date,
  endDate: Date,
  originalTotalPrice: number,
  discountAmount: number,
  finalTotalPrice: number,
  participantsCount: number,
  registrationId: string,
) {
  const html = await render(
    SiblingDiscountApproved({
      registrantFirstName,
      registrantLastName,
      courseTitle,
      startDate,
      endDate,
      originalTotalPrice,
      discountAmount,
      finalTotalPrice,
      participantsCount,
      registrationId,
    }),
  );

  return sendEmail({
    to: email,
    subject: `Geschwisterkindrabatt genehmigt: ${courseTitle} - Posaunenwerk Rheinland`,
    html,
  });
}

export async function sendCourseRegistrationPendingDiscountEmail(
  email: string,
  registrantFirstName: string,
  registrantLastName: string,
  courseTitle: string,
  startDate: Date,
  endDate: Date,
  originalTotalPrice: number,
  discountAmount: number,
  finalTotalPrice: number,
  participantsCount: number,
  registrationId: string,
) {
  const html = await render(
    CourseRegistrationPendingDiscount({
      registrantFirstName,
      registrantLastName,
      courseTitle,
      startDate,
      endDate,
      originalTotalPrice,
      discountAmount,
      finalTotalPrice,
      participantsCount,
      registrationId,
    }),
  );

  return sendEmail({
    to: email,
    subject: `Anmeldung erhalten (Rabatt prüfen): ${courseTitle} - Posaunenwerk Rheinland`,
    html,
  });
}

export async function sendSiblingDiscountRejectedEmail(
  email: string,
  registrantFirstName: string,
  registrantLastName: string,
  courseTitle: string,
  startDate: Date,
  endDate: Date,
  originalTotalPrice: number,
  participantsCount: number,
  registrationId: string,
) {
  const html = await render(
    SiblingDiscountRejected({
      registrantFirstName,
      registrantLastName,
      courseTitle,
      startDate,
      endDate,
      originalTotalPrice,
      participantsCount,
      registrationId,
    }),
  );

  return sendEmail({
    to: email,
    subject: `Geschwisterkindrabatt abgelehnt: ${courseTitle} - Posaunenwerk Rheinland`,
    html,
  });
}

export async function sendCourseRegistrationCancelledEmail(
  email: string,
  registrantFirstName: string,
  registrantLastName: string,
  courseTitle: string,
  startDate: Date,
  endDate: Date,
  participantsCount: number,
  registrationId: string,
) {
  const html = await render(
    CourseRegistrationCancelled({
      registrantFirstName,
      registrantLastName,
      courseTitle,
      startDate,
      endDate,
      participantsCount,
      registrationId,
    }),
  );

  return sendEmail({
    to: email,
    subject: `Anmeldung storniert: ${courseTitle} - Posaunenwerk Rheinland`,
    html,
  });
}

export async function sendCourseRegistrationClosedOverviewEmail(params: {
  to: string;
  courseTitle: string;
  registrationDeadline: Date;
  startDate: Date;
  endDate: Date;
  locationName: string | null;
  maxParticipants: number | null;
  allowWaitingList: boolean;
  stats: CourseRegistrationStats;
  participantsUrl: string;
  attachment: { filename: string; content: Buffer };
}) {
  const html = await render(
    CourseRegistrationClosedOverview({
      courseTitle: params.courseTitle,
      registrationDeadline: params.registrationDeadline,
      startDate: params.startDate,
      endDate: params.endDate,
      locationName: params.locationName,
      maxParticipants: params.maxParticipants,
      allowWaitingList: params.allowWaitingList,
      stats: params.stats,
      participantsUrl: params.participantsUrl,
    }),
  );

  return sendEmail({
    to: params.to,
    subject: `Anmeldefrist beendet: ${params.courseTitle} – Posaunenwerk Rheinland`,
    html,
    attachments: [
      {
        filename: params.attachment.filename,
        content: params.attachment.content,
      },
    ],
  });
}

export async function sendContentReviewResultEmail(params: {
  to: string;
  recipientName: string;
  contentType: ReviewedContentType;
  title: string;
  approved: boolean;
  reviewNotes?: string | null;
  dashboardUrl: string;
}) {
  const typeLabel =
    params.contentType === "event"
      ? "Veranstaltung"
      : params.contentType === "course"
        ? "Kurs"
        : "Beitrag";
  const html = await render(
    ContentReviewResult({
      recipientName: params.recipientName,
      contentType: params.contentType,
      title: params.title,
      approved: params.approved,
      reviewNotes: params.reviewNotes,
      dashboardUrl: params.dashboardUrl,
    }),
  );

  return sendEmail({
    to: params.to,
    subject: params.approved
      ? `${typeLabel} veröffentlicht: ${params.title} – Posaunenwerk Rheinland`
      : `${typeLabel} abgelehnt: ${params.title} – Posaunenwerk Rheinland`,
    html,
  });
}

export async function sendContactMessageEmail(params: {
  to: string;
  name: string;
  email: string;
  phone?: string;
  subjectLabel: string;
  message: string;
}) {
  const html = await render(
    ContactMessage({
      name: params.name,
      email: params.email,
      phone: params.phone,
      subjectLabel: params.subjectLabel,
      message: params.message,
    }),
  );

  return sendEmail({
    to: params.to,
    // Reply-To lets the office answer the sender directly from their client.
    replyTo: params.email,
    subject: `Kontaktformular: ${params.subjectLabel} – ${params.name}`,
    html,
  });
}

/**
 * Mail from a course organizer to a registrant.
 *
 * The From header stays on our own noreply address — putting the organizer's
 * address there would fail SPF/DKIM for their domain and land the mail in
 * spam. Their name is carried in the display name and their address in
 * Reply-To, so answers still reach them directly.
 */
export async function sendCourseMailToRegistrant(params: {
  to: string;
  recipientName?: string;
  subject: string;
  /** Already sanitized HTML. */
  bodyHtml: string;
  courseTitle: string;
  courseStartDate: Date;
  courseEndDate: Date;
  senderName: string;
  replyToEmail: string;
  courseUrl?: string;
  includeGreeting?: boolean;
  attachments?: EmailAttachment[];
}) {
  const html = generateCourseMailHtml({
    bodyHtml: params.bodyHtml,
    courseTitle: params.courseTitle,
    courseStartDate: params.courseStartDate,
    courseEndDate: params.courseEndDate,
    recipientName: params.recipientName,
    senderName: params.senderName,
    replyToEmail: params.replyToEmail,
    courseUrl: params.courseUrl,
    includeGreeting: params.includeGreeting,
  });

  return sendEmail({
    to: params.to,
    from: buildCourseMailFrom(params.senderName),
    replyTo: params.replyToEmail,
    subject: params.subject,
    html,
    attachments: params.attachments,
  });
}

/** `"Anna Beispiel (Posaunenwerk Rheinland)" <noreply@…>` */
function buildCourseMailFrom(senderName: string): string | undefined {
  const address = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  if (!address) return undefined;
  // Quotes and control characters in the display name would break the header.
  const displayName = senderName.replace(/["\\\r\n]/g, " ").trim();
  if (!displayName) return address;
  return `"${displayName} (Posaunenwerk Rheinland)" <${address}>`;
}

export { sendEmail } from "./send-email";
export {
  transporter,
  verifyEmailConnection,
  isEmailConfigured,
} from "./transporter";
