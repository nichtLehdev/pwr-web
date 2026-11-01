import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { logAudit } from "../helpers/audit";

/**
 * KI-Verbindungen der angemeldeten Person: welche OAuth-Clients (MCP) sie
 * zugelassen hat, und Trennen einer Verbindung.
 */
export const oauthConnectionsRouter = createTRPCRouter({
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const consents = await ctx.db.oauthConsent.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        clientId: true,
        scopes: true,
        createdAt: true,
        client: { select: { name: true, uri: true } },
      },
    });

    const lastUsed = await ctx.db.oauthRefreshToken.groupBy({
      by: ["clientId"],
      where: { userId, clientId: { in: consents.map((c) => c.clientId) } },
      _max: { createdAt: true },
    });
    const lastUsedByClient = new Map(
      lastUsed.map((row) => [row.clientId, row._max.createdAt]),
    );

    return consents.map((consent) => ({
      clientId: consent.clientId,
      name: consent.client.name,
      uri: consent.client.uri,
      scopes: consent.scopes,
      connectedAt: consent.createdAt,
      lastUsedAt: lastUsedByClient.get(consent.clientId) ?? null,
    }));
  }),

  /**
   * Zustimmung und alle Token des Clients für diese Person entfernen. Laufende
   * Zugriffstoken lehnt der MCP-Server ab, sobald die Zustimmung fehlt.
   */
  revoke: protectedProcedure
    .input(z.object({ clientId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const where = { userId, clientId: input.clientId };

      const client = await ctx.db.oauthClient.findUnique({
        where: { clientId: input.clientId },
        select: { name: true },
      });
      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Verbindung nicht gefunden",
        });
      }

      await ctx.db.$transaction([
        ctx.db.oauthAccessToken.deleteMany({ where }),
        ctx.db.oauthRefreshToken.deleteMany({ where }),
        ctx.db.oauthConsent.deleteMany({ where }),
      ]);

      void logAudit(ctx.db, {
        actorId: userId,
        actorEmail: ctx.session.user.email,
        action: "oauth.revoke",
        entityType: "oauth_client",
        entityId: input.clientId,
        details: { name: client.name },
      });

      return { success: true };
    }),
});
