/**
 * Get the base URL for the application.
 * Tries multiple sources in order of preference:
 * 1. Request headers (if available) - most reliable for server-side
 * 2. BETTER_AUTH_URL environment variable
 * 3. NEXT_PUBLIC_APP_URL environment variable
 * 4. VERCEL_URL (for Vercel deployments)
 * 5. Default to localhost (development only)
 */
export function getBaseUrl(request?: {
  headers: Headers | { get: (key: string) => string | null };
}): string {
  // Try to get from request headers first (most reliable)
  if (request) {
    const host = request.headers.get("host");
    const protocol =
      request.headers.get("x-forwarded-proto") ||
      request.headers.get("x-forwarded-protocol") ||
      (request.headers.get("x-forwarded-ssl") === "on" ? "https" : "http");

    if (host) {
      // Remove port if it's the default port
      const cleanHost = host.replace(/:80$/, "").replace(/:443$/, "");
      return `${protocol}://${cleanHost}`;
    }
  }

  // Fall back to environment variables
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Vercel provides this automatically
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Default to localhost for development
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  // In production, if none are set, log a warning
  console.warn(
    "[getBaseUrl] No base URL configured. Set BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL environment variable.",
  );

  // Last resort: try to construct from common patterns
  // This should rarely be reached in production
  return "http://localhost:3000";
}

