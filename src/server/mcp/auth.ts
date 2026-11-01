import { verifyJwsAccessToken } from "better-auth/oauth2";

import { auth } from "@/server/better-auth";
import { AUTH_ISSUER, MCP_RESOURCE } from "@/server/better-auth/urls";
import { db } from "@/server/db";
import { createLogger } from "@/server/utils/logger";

const log = createLogger("MCP");

/** Hält die JWKS im Prozess zwischen, statt sie bei jedem Aufruf zu laden. */
const JWKS_CACHE_KEY = {};

export interface McpAuth {
  userId: string;
  clientId: string;
  scopes: Set<string>;
  tokenExpiresAt: Date;
}

/**
 * Prüft das OAuth-Zugriffstoken eines MCP-Aufrufs. `null` heißt: nicht
 * angemeldet – die Route antwortet dann mit 401 und dem Verweis auf die
 * Metadaten, damit der Client die Anmeldung startet.
 */
export async function authenticateMcpRequest(
  request: Request,
): Promise<McpAuth | null> {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice("bearer ".length).trim();
  if (!token) return null;

  let payload: Awaited<ReturnType<typeof verifyJwsAccessToken>>;
  try {
    payload = await verifyJwsAccessToken(token, {
      jwksFetch: () => auth.api.getJwks(),
      jwksCacheKey: JWKS_CACHE_KEY,
      verifyOptions: {
        issuer: AUTH_ISSUER,
        audience: MCP_RESOURCE,
        typ: "at+jwt",
      },
    });
  } catch (error) {
    log.debug("rejected access token:", error);
    return null;
  }

  // DPoP-gebundene Tokens bräuchten die Beweisprüfung; die bieten wir nicht an.
  if (payload.cnf !== undefined) return null;

  const userId = typeof payload.sub === "string" ? payload.sub : null;
  const clientId =
    typeof payload.client_id === "string" ? payload.client_id : null;
  if (!userId || !clientId || typeof payload.exp !== "number") return null;

  // Ohne gültige Zustimmung kein Zugriff: Wer die Verbindung unter
  // Einstellungen trennt, sperrt damit auch noch laufende Zugriffstoken.
  const consent = await db.oauthConsent.findFirst({
    where: {
      userId,
      clientId,
      client: { OR: [{ disabled: false }, { disabled: null }] },
    },
    select: { id: true },
  });
  if (!consent) return null;

  const scope = typeof payload.scope === "string" ? payload.scope : "";
  return {
    userId,
    clientId,
    scopes: new Set(scope.split(" ").filter(Boolean)),
    tokenExpiresAt: new Date(payload.exp * 1000),
  };
}
