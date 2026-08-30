// =============================================================================
// Trigger for the newsletter-cleanup cron route (from inside the app container)
// =============================================================================
//
// Used by the mStudio cron job targeting the "app" stack service:
//   command: node /app/scripts/trigger-newsletter-cleanup.mjs
//
// Deletes newsletter sign-ups that were never confirmed. Daily is plenty —
// the rows only become deletable after 30 days.
//
// Calls the app's own /api/cron/newsletter-cleanup route on localhost using
// CRON_SECRET from the container environment. Exits non-zero on any failure
// so mStudio's execution history and failure alerting reflect real outcomes.
//
// =============================================================================

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
