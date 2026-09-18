// Runs inside the app container as mStudio cron job: node /app/scripts/trigger-registration-closed.mjs
// Exits non-zero on failure so mStudio's history and alerting reflect real outcomes.

const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET is not set");
  process.exit(1);
}

const port = process.env.PORT ?? "3000";
const url = `http://localhost:${port}/api/cron/registration-closed`;

try {
  // Stay below the route's maxDuration of 300s.
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(290_000),
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
