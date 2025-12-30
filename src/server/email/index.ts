import { render } from "@react-email/components";
import { sendEmail } from "./send-email";
import { VerificationEmail } from "./templates/verification-email";
import { CourseRegistrationConfirmed } from "./templates/course-registration-confirmed";
import { CourseRegistrationWaitlist } from "./templates/course-registration-waitlist";

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

// Export other email functions here as needed
export { sendEmail } from "./send-email";
export {
  transporter,
  verifyEmailConnection,
  isEmailConfigured,
} from "./transporter";
