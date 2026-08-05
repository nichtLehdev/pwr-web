import { render } from "@react-email/components";
import { sendEmail } from "./send-email";
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

export { sendEmail } from "./send-email";
export {
  transporter,
  verifyEmailConnection,
  isEmailConfigured,
} from "./transporter";
