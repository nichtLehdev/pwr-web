import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { verifyUnsubscribeToken } from "@/server/utils/unsubscribe-token";

type Credentials = { email: string | null; token: string | null };

/**
 * The address and token behind one unsubscribe, from either caller.
 *
 * The unsubscribe page posts them as JSON. A mail client acting on the
 * List-Unsubscribe header (RFC 8058) knows nothing of our body format — it
 * posts a fixed `List-Unsubscribe=One-Click` form body — so for one-click the
 * pair travels in the query string instead. Query wins when present; the JSON
 * body is only read when it has to be.
 */
async function readCredentials(request: NextRequest): Promise<Credentials> {
  const params = request.nextUrl.searchParams;
  const queryEmail = params.get("email");
  const queryToken = params.get("token");
  if (queryEmail && queryToken) {
    return { email: queryEmail, token: queryToken };
  }

  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object") {
      const { email, token } = body as { email?: unknown; token?: unknown };
      return {
        email: typeof email === "string" ? email : null,
        token: typeof token === "string" ? token : null,
      };
    }
  } catch {
    // A one-click body is form data, not JSON — nothing to recover here, and
    // the missing-credentials branch below already says so.
  }

  return { email: null, token: null };
}

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await readCredentials(request);

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 },
      );
    }

    if (!token) {
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
