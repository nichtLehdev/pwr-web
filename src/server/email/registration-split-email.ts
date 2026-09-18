import { render } from "@react-email/components";
import { sendEmail } from "./send-email";
import {
  CourseRegistrationSplit,
  courseRegistrationSplitText,
  type SplitPartMailInfo,
} from "./templates/course-registration-split";
import { downPaymentQrAttachment } from "./down-payment";

/**
 * Der GiroCode gehört zur Anzahlung des bestätigten Teils; der wartende zahlt
 * erst nach der Platzbestätigung.
 */
export async function sendCourseRegistrationSplitEmail(params: {
  email: string;
  registrantFirstName: string;
  registrantLastName: string;
  courseTitle: string;
  startDate: Date;
  endDate: Date;
  confirmed: SplitPartMailInfo;
  waitlist: SplitPartMailInfo;
  discountPending: boolean;
}) {
  const { email, ...props } = params;
  const qrCode = props.confirmed.downPayment
    ? await downPaymentQrAttachment(props.confirmed.downPayment)
    : null;
  const templateProps = { ...props, downPaymentHasQr: qrCode !== null };
  const html = await render(CourseRegistrationSplit(templateProps));

  return sendEmail({
    to: email,
    subject: `Anmeldung teilweise bestätigt: ${props.courseTitle} - Posaunenwerk Rheinland`,
    html,
    text: courseRegistrationSplitText(templateProps),
    ...(qrCode && { attachments: [qrCode] }),
  });
}
