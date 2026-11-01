import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";

import { auth } from "@/server/better-auth";
import { METADATA_CORS_HEADERS } from "@/server/mcp/metadata";

/**
 * RFC 8414: Der Issuer ist `/api/auth`, Clients suchen die Metadaten daher
 * unter `/.well-known/oauth-authorization-server/api/auth` (und teils ohne Pfad).
 */
export const GET = oauthProviderAuthServerMetadata(auth, {
  headers: METADATA_CORS_HEADERS,
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: METADATA_CORS_HEADERS });
}
