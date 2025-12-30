import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";

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

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists for security
      return NextResponse.json(
        { message: "Falls ein Konto mit dieser E-Mail existiert, wurde eine Verifizierungs-E-Mail gesendet." },
        { status: 200 },
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { message: "Diese E-Mail-Adresse ist bereits verifiziert." },
        { status: 400 },
      );
    }

    // Use Better Auth's API to resend verification email
    // Better Auth will handle the token generation and email sending
    try {
      await auth.api.sendVerificationEmail({
        body: {
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Error sending verification email:", error);
      return NextResponse.json(
        { message: "Fehler beim Senden der E-Mail. Bitte versuche es später erneut." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Verifizierungs-E-Mail wurde gesendet." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in resend verification:", error);
    return NextResponse.json(
      { message: "Ein Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

