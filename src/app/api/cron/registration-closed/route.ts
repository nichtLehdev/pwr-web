import { NextRequest, NextResponse } from "next/server";
import { processRegistrationClosedNotifications } from "@/server/jobs/registration-closed-notifications";
import { isEmailConfigured } from "@/server/email";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) {
    return true;
  }
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

/**
 * POST /api/cron/registration-closed
 *
 * Sends overview e-mails to course creators and ORGANIZER collaborators when
 * registrationDeadline has passed. In Docker, use the
 * registration-closed-cron compose service (default: every 6 hours).
 *
 * Optional: ?courseId=<uuid> to process a single course (e.g. for testing).
 * Requires Authorization: Bearer <CRON_SECRET> or ?secret=<CRON_SECRET>.
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
    console.error("[cron/registration-closed]", error);
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
