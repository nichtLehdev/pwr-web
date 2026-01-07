import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/better-auth/config";
import { getBaseUrl } from "@/server/utils/get-base-url";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "E-Mail-Adresse ist erforderlich" },
        { status: 400 },
      );
    }

    // Get base URL for redirect
    const baseUrl = getBaseUrl(request);
    const redirectTo = `${baseUrl}/reset-password`;

    // Use Better Auth's built-in requestPasswordReset API method
    // See: https://www.better-auth.com/docs/authentication/email-password#request-password-reset
    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo,
      },
    });

    // Better Auth handles user existence checking internally
    // It will return success even if user doesn't exist (security best practice)
    return NextResponse.json(
      {
        success: true,
        message:
          "Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail zum Zurücksetzen des Passworts gesendet.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          "Fehler beim Senden der E-Mail. Bitte versuche es später erneut.",
      },
      { status: 500 },
    );
  }
}
