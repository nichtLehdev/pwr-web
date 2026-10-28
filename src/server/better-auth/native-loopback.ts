const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isHttpLoopback(uri: unknown): boolean {
  if (typeof uri !== "string") return false;
  try {
    const url = new URL(uri);
    return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Lokale MCP-Clients (Claude Code, Cursor, mcp-remote) registrieren sich mit
 * `http://localhost:<port>/callback`, nennen aber keinen `application_type`.
 * better-auth nimmt dann „web“ an, und das verlangt https. Nach RFC 8252 sind
 * solche Clients „native“; das tragen wir nach, wenn ausschließlich
 * Loopback-Adressen angegeben sind. Alles andere bleibt, wie es kam.
 *
 * @returns den ergänzten Body oder `null`, wenn nichts zu tun ist.
 */
export function withNativeLoopbackDefault(
  body: unknown,
): Record<string, unknown> | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }
  const registration = body as Record<string, unknown>;
  if (registration.application_type !== undefined) return null;

  const redirectUris = registration.redirect_uris;
  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length === 0 ||
    !redirectUris.every(isHttpLoopback)
  ) {
    return null;
  }
  return { ...registration, application_type: "native" };
}
