import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { auth } from "@/server/better-auth";

export async function GET(request: NextRequest) {
  try {
    // Require authentication to prevent email enumeration
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow users to check their own email verification status
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        emailVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return only email verification status (no exists field to prevent enumeration)
    return NextResponse.json({
      emailVerified: user.emailVerified ?? false,
    });
  } catch (error) {
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
