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

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        {
          message:
            "Falls ein Konto mit dieser E-Mail existiert, wurde eine Verifizierungs-E-Mail gesendet.",
        },
        { status: 200 },
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: "Diese E-Mail-Adresse ist bereits verifiziert." },
        { status: 400 },
      );
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await db.$transaction(async (tx) => {
      await tx.verification.deleteMany({
        where: {
          identifier: user.email,
        },
      });

      await tx.verification.create({
        data: {
          id: randomBytes(16).toString("hex"),
          identifier: user.email,
          value: token,
          expiresAt,
        },
      });
    });

    const baseUrl = getBaseUrl(request);
    const verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;

    await sendVerificationEmail(
      user.email,
      verificationUrl,
      user.displayName || undefined,
    );

    return NextResponse.json(
      { message: "Verifizierungs-E-Mail wurde gesendet." },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        message:
          "Fehler beim Senden der E-Mail. Bitte versuche es später erneut.",
      },
      { status: 500 },
    );
  }
}
