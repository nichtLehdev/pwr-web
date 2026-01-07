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
    subject: `Geschwisterrabatt genehmigt: ${courseTitle} - Posaunenwerk Rheinland`,
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
    subject: `Geschwisterrabatt abgelehnt: ${courseTitle} - Posaunenwerk Rheinland`,
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

// Export other email functions here as needed
export { sendEmail } from "./send-email";
export {
  transporter,
  verifyEmailConnection,
  isEmailConfigured,
} from "./transporter";
