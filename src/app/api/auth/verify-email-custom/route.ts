import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return NextResponse.json(
        { error: "Token und E-Mail-Adresse sind erforderlich" },
        { status: 400 },
      );
    }

    console.log("[verify-email-custom] Verifying token for:", email);

    // Find verification record
    const verification = await db.verification.findFirst({
      where: {
        identifier: email,
        value: token,
        expiresAt: {
          gte: new Date(), // Token must not be expired
        },
      },
    });

    if (!verification) {
      console.log("[verify-email-custom] ❌ Invalid or expired token");
      return NextResponse.json(
        { error: "Der Verifizierungslink ist ungültig oder abgelaufen." },
        { status: 400 },
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log("[verify-email-custom] ❌ User not found");
      return NextResponse.json(
        { error: "Benutzer nicht gefunden" },
        { status: 404 },
      );
    }

    // Mark email as verified
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
      },
    });

    // Delete the verification token (one-time use)
    await db.verification.delete({
      where: { id: verification.id },
    });

    console.log("[verify-email-custom] ✅ Email verified successfully for:", email);

    return NextResponse.json({
      success: true,
      message: "E-Mail-Adresse erfolgreich verifiziert.",
    });
  } catch (error) {
    console.error("[verify-email-custom] Error:", error);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

