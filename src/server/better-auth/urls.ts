/** Öffentliche Basis-URL der App, ohne abschließenden Schrägstrich. */
export const AUTH_BASE_URL = (
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

/** better-auth hängt an `/api/auth`; das ist zugleich der OAuth-Issuer. */
export const AUTH_ISSUER = `${AUTH_BASE_URL}/api/auth`;

/**
 * Ressourcen-Kennung (RFC 8707) des MCP-Servers. Steht als `aud` im
 * Zugriffstoken; Tokens für eine andere Ressource weist der Server ab.
 */
export const MCP_RESOURCE = `${AUTH_BASE_URL}/api/mcp`;
