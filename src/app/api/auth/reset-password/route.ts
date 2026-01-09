import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/better-auth/config";

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

    console.log("[Reset Password] Attempting to reset password with token");

    const result = await auth.api.resetPassword({
      body: {
        token,
        newPassword: password,
      },
    });

    if (!result.status) {
      console.error("[Reset Password] Password reset failed");
      return NextResponse.json(
        {
          error: "Der Reset-Link ist ungültig oder abgelaufen.",
        },
        { status: 400 },
      );
    }

    console.log("[Reset Password] Password reset successful");

    return NextResponse.json({
      success: true,
      message: "Passwort wurde erfolgreich zurückgesetzt.",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
