import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/server/utils/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`feedback:${ip}`, {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.success) return rateLimitResponse();

  const { feedback, email, type, subject, url, device } = await req.json();
  if (!feedback || typeof feedback !== "string" || !subject) {
    return NextResponse.json(
      { error: "Feedback and subject required" },
      { status: 400 },
    );
  }

  const title = `[${type === "bug" ? "🐞 Bug" : type === "feature" ? "✨ Feature" : "💬 Feedback"}] ${subject}`;
  let body = `**Typ:** ${type || "other"}\n`;
  body += `**Betreff:** ${subject}\n`;
  body += `**Feedback:**\n${feedback}\n`;
  if (url) body += `\n**URL:** ${url}`;
  if (device) body += `\n**Gerät/Betriebssystem & Browser:** ${device}`;
  body += `\n\n**E-Mail:** ${email || "Nicht angegeben"}`;

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO;

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 },
    );
  }

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        body,
        labels: [type || "feedback"],
      }),
    },
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to create issue" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
