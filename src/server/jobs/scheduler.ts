import "server-only";

import { schedule as scheduleCron, validate as validateCron } from "node-cron";

import { env } from "@/env";
import { isEmailConfigured } from "@/server/email";
import { processRegistrationClosedNotifications } from "@/server/jobs/registration-closed-notifications";

// Survives HMR module reloads in dev so the job is never scheduled twice.
const globalForScheduler = globalThis as unknown as {
  registrationClosedCronStarted?: boolean;
};

async function runRegistrationClosedJob(trigger: string): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn(
      `[cron/registration-closed] (${trigger}) SMTP is not configured, skipping run`,
    );
    return;
  }

  try {
    const result = await processRegistrationClosedNotifications();
    console.log(
      `[cron/registration-closed] (${trigger}) processed=${result.processed} emailed=${result.emailed} skipped=${result.skipped} errors=${result.errors.length}`,
    );
    for (const { courseId, error } of result.errors) {
      console.error(
        `[cron/registration-closed] (${trigger}) course ${courseId}: ${error}`,
      );
    }
  } catch (error) {
    console.error(`[cron/registration-closed] (${trigger})`, error);
  }
}

/**
 * Schedules the registration-closed overview e-mails inside the app process
 * (replaces the former registration-closed-cron sidecar container). Called
 * once from instrumentation.ts when the Node.js server boots.
 *
 * Only active with NODE_ENV=production and REGISTRATION_CLOSED_CRON_SCHEDULE
 * set. On mittwald the variable stays unset: an mStudio cron job triggers
 * the route via scripts/trigger-registration-closed.mjs instead.
 */
export function startRegistrationClosedCron(): void {
  if (env.NODE_ENV !== "production") {
    return;
  }
  if (globalForScheduler.registrationClosedCronStarted) {
    return;
  }
  globalForScheduler.registrationClosedCronStarted = true;

  const cronSchedule = env.REGISTRATION_CLOSED_CRON_SCHEDULE;
  if (!cronSchedule) {
    console.log(
      "[cron/registration-closed] REGISTRATION_CLOSED_CRON_SCHEDULE not set, in-app scheduling disabled",
    );
    return;
  }
  if (!validateCron(cronSchedule)) {
    console.error(
      `[cron/registration-closed] Invalid REGISTRATION_CLOSED_CRON_SCHEDULE "${cronSchedule}", job not scheduled`,
    );
    return;
  }

  scheduleCron(cronSchedule, () => {
    void runRegistrationClosedJob("schedule");
  });
  console.log(`[cron/registration-closed] Scheduled in-app (${cronSchedule})`);

  // Catch up on anything missed while the app was down, like the old
  // sidecar's initial check. Safe: the job claims each course in the DB
  // before mailing, so overlapping or repeated runs cannot double-send.
  void runRegistrationClosedJob("startup");
}
