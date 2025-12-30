import { render } from "@react-email/components";
import { sendEmail } from "./send-email";
import { VerificationEmail } from "./templates/verification-email";

export async function sendVerificationEmail(
  email: string,
  verificationUrl: string,
  userName?: string,
) {
  console.log("[sendVerificationEmail] Starting email render and send...");
  console.log("[sendVerificationEmail] To:", email);
  console.log("[sendVerificationEmail] URL:", verificationUrl);
  
  try {
    console.log("[sendVerificationEmail] Rendering email template...");
    const html = await render(
      VerificationEmail({
        verificationUrl,
        userName,
      }),
    );
    console.log("[sendVerificationEmail] Email template rendered successfully");

    console.log("[sendVerificationEmail] Sending email...");
    const result = await sendEmail({
      to: email,
      subject: "E-Mail-Adresse bestätigen - Posaunenwerk Rheinland",
      html,
    });
    
    console.log("[sendVerificationEmail] ✅ Email sent successfully");
    return result;
  } catch (error) {
    console.error("[sendVerificationEmail] ❌ Error:", error);
    throw error;
  }
}

// Export other email functions here as needed
export { sendEmail } from "./send-email";
export { transporter, verifyEmailConnection, isEmailConfigured } from "./transporter";

