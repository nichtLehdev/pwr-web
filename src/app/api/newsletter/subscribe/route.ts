import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 },
      );
    }

    const existing = await db.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json(
          { message: "Email already subscribed" },
          { status: 409 },
        );
      }

      // Reactivate subscription
      await db.newsletterSubscriber.update({
        where: { email },
        data: {
          isActive: true,
          name: name || existing.name,
          subscribedAt: new Date(),
          unsubscribedAt: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Successfully subscribed to newsletter",
      });
    }

    // Create new subscription
    await db.newsletterSubscriber.create({
      data: {
        email,
        name: name || null,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to newsletter",
    });
  } catch (error) {
    console.error("Error subscribing to newsletter:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

