import { NextResponse, type NextRequest } from "next/server";
import { createCapChallenge } from "@/server/utils/cap";
import {
  clientKeyFromHeaders,
  rateLimit,
  rateLimitResponse,
} from "@/server/utils/rate-limit";

/** Cap-Widget, Schritt eins: eine signierte Aufgabe abholen. */
export async function POST(request: NextRequest) {
  const rl = rateLimit(
    `cap-challenge:${clientKeyFromHeaders(request.headers)}`,
    {
      maxRequests: 30,
      windowMs: 10 * 60 * 1000,
    },
  );
  if (!rl.success) return rateLimitResponse();

  const challenge = await createCapChallenge("newsletter");
  return NextResponse.json(challenge, {
    headers: { "Cache-Control": "no-store" },
  });
}
