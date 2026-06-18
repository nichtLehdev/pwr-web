/**
 * Get the base URL for the application.
 * Uses environment variables only -- never trusts request headers, which can
 * be forged and lead to host-header-injection attacks (e.g. poisoned password
 * reset links).
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

  console.warn(
    "[getBaseUrl] No base URL configured. Set BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL environment variable.",
  );

  return "http://localhost:3000";
}
