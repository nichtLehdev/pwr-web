import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { verifyUnsubscribeToken } from "@/server/utils/unsubscribe-token";

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
        { message: "Invalid unsubscribe link" },
        { status: 400 },
      );
    }

    if (!verifyUnsubscribeToken(email, token)) {
      return NextResponse.json(
        { message: "Invalid unsubscribe link" },
        { status: 403 },
      );
    }

    const subscriber = await db.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      return NextResponse.json({
        success: true,
        message: "Unsubscribed successfully",
      });
    }

    await db.newsletterSubscriber.update({
      where: { email },
      data: {
        isActive: false,
        unsubscribedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Unsubscribed successfully",
    });
  } catch (error) {
    console.error("Error unsubscribing from newsletter:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An error occurred",
      },
      { status: 500 },
    );
  }
}
