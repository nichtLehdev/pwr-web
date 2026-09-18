// Runs inside the app container as mStudio cron job: node /app/scripts/trigger-newsletter-cleanup.mjs
// Exits non-zero on failure so mStudio's history and alerting reflect real outcomes.
// Unconfirmed sign-ups only become deletable after 30 days, so daily is plenty.

const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET is not set");
  process.exit(1);
}

const port = process.env.PORT ?? "3000";
const url = `http://localhost:${port}/api/cron/newsletter-cleanup`;

try {
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(60_000),
  });
  const body = await response.text();
  console.log(`HTTP ${response.status}: ${body}`);
  if (!response.ok) {
    process.exit(1);
  }
} catch (error) {
  console.error("Trigger failed:", error);
  process.exit(1);
}
