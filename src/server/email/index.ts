import { render } from "@react-email/components";
import { sendEmail } from "./send-email";
import { VerificationEmail } from "./templates/verification-email";

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

// Export other email functions here as needed
export { sendEmail } from "./send-email";
export { transporter, verifyEmailConnection, isEmailConfigured } from "./transporter";

