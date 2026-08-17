import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { verifyNewsletterConfirmToken } from "@/server/utils/newsletter-confirm-token";

/**
 * Newsletter sign-up, step two: the click that turns a pending row into a
 * recipient. Behind a POST from the confirmation page rather than a plain GET,
 * so link scanners and mail-security prefetchers cannot confirm on the
 * subscriber's behalf — which is exactly what double opt-in exists to prevent.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 },
      );
    }

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { message: "Ungültiger Bestätigungslink" },
        { status: 400 },
      );
    }

    if (!verifyNewsletterConfirmToken(email, token)) {
      return NextResponse.json(
        {
          message:
            "Dieser Bestätigungslink ist ungültig oder abgelaufen. Bitte melde dich erneut an.",
        },
        { status: 403 },
      );
    }

    const subscriber = await db.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      return NextResponse.json(
        {
          message:
            "Zu dieser Adresse liegt keine Anmeldung vor. Bitte melde dich erneut an.",
        },
        { status: 404 },
      );
    }

    if (subscriber.isActive && subscriber.confirmedAt) {
      return NextResponse.json({
        success: true,
        alreadyConfirmed: true,
        message: "Deine Anmeldung war bereits bestätigt.",
      });
    }

    await db.newsletterSubscriber.update({
      where: { email },
      data: {
        isActive: true,
        confirmedAt: subscriber.confirmedAt ?? new Date(),
        unsubscribedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      alreadyConfirmed: false,
      message: "Deine Anmeldung zum Newsletter ist bestätigt.",
    });
  } catch (error) {
    console.error("Error confirming newsletter subscription:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred" },
      { status: 500 },
    );
  }
}
