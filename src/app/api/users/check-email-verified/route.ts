import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        exists: false,
        emailVerified: false,
      });
    }

    return NextResponse.json({
      exists: true,
      emailVerified: user.emailVerified ?? false,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 },
    );
  }
}

