import { NextRequest, NextResponse } from "next/server";
import { verifyEmailConnection } from "@/server/email/transporter";
import { sendVerificationEmail } from "@/server/email";
import { getBaseUrl } from "@/server/utils/get-base-url";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Test Email");

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { message: "Not available in production" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 },
      );
    }

    const connectionOk = await verifyEmailConnection();
    if (!connectionOk) {
      return NextResponse.json(
        { message: "SMTP connection failed. Please check your configuration." },
        { status: 500 },
      );
    }

    const baseUrl = getBaseUrl(request);
    const testVerificationUrl = `${baseUrl}/verify-email?token=test-token-123&email=${encodeURIComponent(email)}`;

    await sendVerificationEmail(email, testVerificationUrl, "Test User");

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${email}`,
    });
  } catch (error) {
    log.error("Error sending test email:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { message: "Not available in production" },
      { status: 403 },
    );
  }

  try {
    const connectionOk = await verifyEmailConnection();
    return NextResponse.json({
      configured: connectionOk,
      message: connectionOk
        ? "Email is configured and ready"
        : "Email is not configured or connection failed",
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
