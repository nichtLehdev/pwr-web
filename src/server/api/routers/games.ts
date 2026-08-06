import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { GAMES, type GameId } from "@/app/spiele/_lib/games";
import type { Prisma } from "~/generated/prisma/client";

const gameIdSchema = z.enum(GAMES.map((g) => g.slug) as [GameId, ...GameId[]]);

const resultSchema = z.object({
  clientId: z.string().min(8).max(64),
  gameId: gameIdSchema,
  playedAt: z.coerce.date(),
  score: z.number().int().min(0).max(1_000_000),
  maxScore: z.number().int().min(0).max(1_000_000).optional(),
  streak: z.number().int().min(0).max(100_000).optional(),
  durationMs: z
    .number()
    .int()
    .min(0)
    .max(24 * 60 * 60 * 1000)
    .optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const gamesRouter = createTRPCRouter({
  /**
   * Offline-Outbox-Upload: idempotent über das Unique-Paar (userId, clientId) —
   * `skipDuplicates` macht wiederholte Sends desselben Batches harmlos.
   */
  submitResults: protectedProcedure
    .input(z.object({ results: z.array(resultSchema).min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const created = await ctx.db.gameResult.createMany({
        data: input.results.map((r) => ({
          userId: ctx.session.user.id,
          game: r.gameId,
          score: r.score,
          maxScore: r.maxScore,
          streak: r.streak,
          durationMs: r.durationMs,
          meta: r.meta as Prisma.InputJsonValue | undefined,
          playedAt: r.playedAt,
          clientId: r.clientId,
        })),
        skipDuplicates: true,
      });
      return { accepted: created.count };
    }),

  /** Aggregation zur Lesezeit — Event-Zeilen bleiben die Quelle der Wahrheit. */
  getMyStats: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.gameResult.groupBy({
      by: ["game"],
      where: { userId: ctx.session.user.id },
      _count: { _all: true },
      _max: { score: true, streak: true, playedAt: true },
    });
    return rows.map((row) => ({
      game: row.game,
      plays: row._count._all,
      bestScore: row._max.score ?? 0,
      bestStreak: row._max.streak ?? 0,
      lastPlayedAt: row._max.playedAt?.toISOString() ?? null,
    }));
  }),
});
