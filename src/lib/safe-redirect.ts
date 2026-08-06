/**
 * Only allow same-origin path redirects from ?redirect= query params.
 * Anything absolute ("https://evil.example", "//evil.example",
 * "/\evil.example") falls back — otherwise the login flow is an open
 * redirect for phishing links.
 */
export function safeInternalPath(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  // "//host" and "/\host" are protocol-relative escapes
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
