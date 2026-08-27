import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/better-auth/config";
import { createLogger } from "@/server/utils/logger";

const log = createLogger("Reset Password");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token und Passwort sind erforderlich" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Das Passwort muss mindestens 8 Zeichen lang sein" },
        { status: 400 },
      );
    }

    log.debug("Attempting to reset password with token");

    const result = await auth.api.resetPassword({
      body: {
        token,
        newPassword: password,
      },
    });

    if (!result.status) {
      log.warn("Password reset failed: link invalid or expired");
      return NextResponse.json(
        {
          error: "Der Reset-Link ist ungültig oder abgelaufen.",
        },
        { status: 400 },
      );
    }

    log.info("Password reset successful");

    return NextResponse.json({
      success: true,
      message: "Passwort wurde erfolgreich zurückgesetzt.",
    });
  } catch (error) {
    log.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
