import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { sendVerificationEmail } from "@/server/email";
import { getBaseUrl } from "@/server/utils/get-base-url";
import { randomBytes } from "crypto";
import {
  clientKeyFromHeaders,
  rateLimit,
  rateLimitResponse,
} from "@/server/utils/rate-limit";

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

    // better-auth legt Konten kleingeschrieben an; eine Suche mit der
    // getippten Schreibweise findet sie sonst nicht.
    const normalizedEmail = email.trim().toLowerCase();

    // Pro Adresse gegen wiederholte Mails an dieselbe Person, pro Herkunft
    // gegen den Bot, der für jede Anfrage eine neue Adresse erfindet.
    const perIp = rateLimit(
      `send-verification-ip:${clientKeyFromHeaders(request.headers)}`,
      { maxRequests: 10, windowMs: 60 * 60 * 1000 },
    );
    if (!perIp.success) return rateLimitResponse();

    const rl = rateLimit(`send-verification:${normalizedEmail}`, {
      maxRequests: 3,
      windowMs: 15 * 60 * 1000,
    });
    if (!rl.success) return rateLimitResponse();

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
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
        {
          code: "ALREADY_VERIFIED",
          message: "Diese E-Mail-Adresse ist bereits verifiziert.",
        },
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
      { success: true, message: "Verifizierungs-E-Mail wurde gesendet." },
      { status: 200 },
    );
  } catch {
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
