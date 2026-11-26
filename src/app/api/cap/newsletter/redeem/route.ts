import { NextResponse, type NextRequest } from "next/server";
import { redeemCapChallenge } from "@/server/utils/cap";
import {
  clientKeyFromHeaders,
  rateLimit,
  rateLimitResponse,
} from "@/server/utils/rate-limit";

/** Cap-Widget, Schritt zwei: Lösung gegen ein Token tauschen. */
export async function POST(request: NextRequest) {
  const rl = rateLimit(`cap-redeem:${clientKeyFromHeaders(request.headers)}`, {
    maxRequests: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.success) return rateLimitResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const result = await redeemCapChallenge("newsletter", body);
  return NextResponse.json(result, {
    status: result.success ? 200 : 403,
    headers: { "Cache-Control": "no-store" },
  });
}
