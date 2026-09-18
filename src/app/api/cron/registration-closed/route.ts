import { NextRequest, NextResponse } from "next/server";
import { processRegistrationClosedNotifications } from "@/server/jobs/registration-closed-notifications";
import { isEmailConfigured } from "@/server/email";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Cron");

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

/**
 * Mails course creators and ORGANIZERs an overview once the deadline passed.
 * On mittwald triggered by an mStudio cron job (scripts/trigger-registration-closed.mjs).
 * Optional `?courseId=<uuid>`; requires Authorization: Bearer <CRON_SECRET>.
 */
export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "SMTP is not configured" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId") ?? undefined;

  try {
    const result = await processRegistrationClosedNotifications({
      courseId,
    });
    return NextResponse.json(result);
  } catch (error) {
    log.error("Registration-closed run failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal error",
      },
      { status: 500 },
    );
  }
}

/** Allow GET for simple cron services that only support GET. */
export async function GET(request: NextRequest) {
  return POST(request);
}
