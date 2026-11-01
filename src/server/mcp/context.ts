import type { createTRPCContext } from "@/server/api/trpc";
import type { PermissionKey } from "@/lib/permissions";
import type { Session } from "@/server/better-auth/config";
import { db } from "@/server/db";
import type { McpAuth } from "./auth";

type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * tRPC-Kontext für einen MCP-Aufruf: dieselbe Gestalt wie bei einer
 * Browser-Sitzung, nur aus dem OAuth-Token statt aus dem Cookie. Damit greifen
 * alle Rechteprüfungen der Prozeduren unverändert.
 */
export async function createMcpTrpcContext(
  mcpAuth: McpAuth,
  headers: Headers,
): Promise<TRPCContext | null> {
  const user = await db.user.findUnique({ where: { id: mcpAuth.userId } });
  if (!user) return null;

  const now = new Date();
  // Die Prozeduren lesen nur `user.id` und `user.email`; die übrigen Felder
  // spiegeln die better-auth-Sitzung, damit der Typ ehrlich bleibt.
  const session = {
    session: {
      id: `mcp:${mcpAuth.clientId}`,
      userId: user.id,
      token: "",
      expiresAt: mcpAuth.tokenExpiresAt,
      createdAt: now,
      updatedAt: now,
      ipAddress: null,
      userAgent: headers.get("user-agent"),
    },
    user: {
      ...user,
      name: user.displayName ?? "",
      image: user.profileImageId,
      emailVerified: user.emailVerified ?? false,
      preferences: user.preferences ? JSON.stringify(user.preferences) : null,
    },
  } as unknown as Session;

  return {
    db,
    session,
    permissionCache: new Map<string, Promise<Set<PermissionKey>>>(),
    headers,
  };
}
