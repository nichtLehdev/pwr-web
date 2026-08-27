import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/better-auth/config";
import { getBaseUrl } from "@/server/utils/get-base-url";
import { rateLimit, rateLimitResponse } from "@/server/utils/rate-limit";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Forgot Password");

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

    const rl = rateLimit(`forgot-password:${email.toLowerCase()}`, {
      maxRequests: 3,
      windowMs: 15 * 60 * 1000,
    });
    if (!rl.success) return rateLimitResponse();

    const baseUrl = getBaseUrl(request);
    const redirectTo = `${baseUrl}/reset-password`;

    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail zum Zurücksetzen des Passworts gesendet.",
      },
      { status: 200 },
    );
  } catch (error) {
    log.error("Forgot password error:", error);
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
