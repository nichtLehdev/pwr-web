import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { sendVerificationEmail } from "@/server/email";
import { getBaseUrl } from "@/server/utils/get-base-url";
import { randomBytes } from "crypto";
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
        {
          message:
            "Falls ein Konto mit dieser E-Mail existiert, wurde eine Verifizierungs-E-Mail gesendet.",
        },
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

    // Generate a new verification token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

    // Delete existing tokens and create new one atomically
    await db.$transaction(async (tx) => {
      // Delete any existing verification tokens for this email
      await tx.verification.deleteMany({
        where: {
          identifier: user.email,
        },
      });

      // Create new verification record
      await tx.verification.create({
        data: {
          id: randomBytes(16).toString("hex"),
          identifier: user.email,
          value: token,
          expiresAt,
        },
      });
    });

    // Create verification URL using request headers for accurate base URL
    const baseUrl = getBaseUrl(request);
    const verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;

    // Send verification email directly
    await sendVerificationEmail(
      user.email,
      verificationUrl,
      user.displayName || undefined,
    );

    return NextResponse.json(
      { message: "Verifizierungs-E-Mail wurde gesendet." },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          "Fehler beim Senden der E-Mail. Bitte versuche es später erneut.",
      },
      { status: 500 },
    );
  }
}
