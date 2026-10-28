import { oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";

import { auth } from "@/server/better-auth";
import { METADATA_CORS_HEADERS } from "@/server/mcp/metadata";

/** Manche MCP-Clients fragen statt RFC 8414 die OpenID-Konfiguration ab. */
export const GET = oauthProviderOpenIdConfigMetadata(auth, {
  headers: METADATA_CORS_HEADERS,
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: METADATA_CORS_HEADERS });
}
