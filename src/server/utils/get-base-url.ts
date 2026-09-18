import { createLogger } from "@/server/utils/logger";

const log = createLogger("getBaseUrl");

/**
 * Environment variables only, never request headers: those can be forged
 * (host-header injection, poisoned password reset links).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getBaseUrl(request?: {
  headers: Headers | { get: (key: string) => string | null };
}): string {
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  log.warn(
    "No base URL configured. Set BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL environment variable.",
  );

  return "http://localhost:3000";
}
