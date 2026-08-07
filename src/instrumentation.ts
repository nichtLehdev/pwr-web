export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startRegistrationClosedCron } =
      await import("@/server/jobs/scheduler");
    startRegistrationClosedCron();
  }
}
