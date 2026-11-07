import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { GAMES, type GameId } from "@/app/spiele/_lib/games";
import type { Prisma, PrismaClient } from "~/generated/prisma/client";
import { berlinParts } from "@/lib/berlin-time";
import { starsFor } from "@/app/spiele/_lib/rewards";
import {
  capToDay,
  isResultKind,
  roundXp,
  type ResultKind,
} from "@/app/spiele/_lib/stats/xp-rules";

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
  profileId: z.string().uuid().optional(),
});

type ResultInput = z.infer<typeof resultSchema>;

function percentOf(r: { score: number; maxScore?: number | null }) {
  return r.maxScore ? (100 * r.score) / r.maxScore : 0;
}

function berlinDay(date: Date): string {
  const { year, month, day } = berlinParts(date);
  return `${year}-${month}-${day}`;
}

/** Ältere App-Stände schicken keine Art mit; dann entscheidet die Stufe. */
function kindOf(r: ResultInput): ResultKind {
  const kind = r.meta?.kind;
  if (isResultKind(kind)) return kind;
  const stage = r.meta?.stage ?? r.meta?.level;
  if (typeof stage !== "string") return "free";
  return stage.startsWith("challenge-") ? "challenge" : "lesson";
}

/**
 * XP einer Runde aus der Geschichte des Profils: Wiederholungen bringen weniger,
 * und jeder Tag hat eine Obergrenze. Gezählt wird nach Eingang, nicht nach der
 * Zeit, die der Browser meldet.
 */
async function xpForResult(
  db: PrismaClient,
  userId: string,
  profileId: string | null,
  r: ResultInput,
): Promise<number> {
  const kind = kindOf(r);
  const percent = percentOf(r);
  const owner = { userId, profileId, game: r.gameId };
  const stage = r.meta?.stage ?? r.meta?.level;
  let replay = false;
  let firstPass = false;
  if (
    (kind === "lesson" || kind === "challenge") &&
    typeof stage === "string"
  ) {
    const earlier = await db.gameResult.findMany({
      where: {
        ...owner,
        OR: [
          { meta: { path: ["stage"], equals: stage } },
          { meta: { path: ["level"], equals: stage } },
        ],
      },
      select: { score: true, maxScore: true, meta: true },
    });
    const bestStars = Math.max(
      0,
      ...earlier.map((e) => starsFor(percentOf(e))),
    );
    replay = earlier.length > 0 && bestStars >= starsFor(percent);
    firstPass =
      kind === "challenge" &&
      r.meta?.passed === true &&
      !earlier.some(
        (e) => (e.meta as { passed?: unknown } | null)?.passed === true,
      );
  }

  const since = new Date(Date.now() - 36 * 60 * 60 * 1000);
  const recent = await db.gameResult.findMany({
    where: { userId, profileId, createdAt: { gte: since } },
    select: { xp: true, createdAt: true, game: true, meta: true },
  });
  const today = berlinDay(new Date());
  const ofToday = recent.filter((e) => berlinDay(e.createdAt) === today);
  const earnedToday = ofToday.reduce((sum, e) => sum + e.xp, 0);
  const firstDailyToday =
    kind === "daily" &&
    !ofToday.some(
      (e) =>
        e.game === r.gameId &&
        (e.meta as { kind?: unknown } | null)?.kind === "daily",
    );
  const reached = typeof r.meta?.reached === "number" ? r.meta.reached : 0;

  return capToDay(
    roundXp({ kind, percent, replay, firstPass, firstDailyToday, reached }),
    earnedToday,
  );
}

export const gamesRouter = createTRPCRouter({
  /**
   * Offline-Outbox-Upload: idempotent über das Unique-Paar (userId, clientId) —
   * `skipDuplicates` macht wiederholte Sends desselben Batches harmlos.
   */
  submitResults: protectedProcedure
    .input(z.object({ results: z.array(resultSchema).min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      // Fremde oder gelöschte Profile zählen nicht; das Ergebnis bleibt dem Konto.
      const owned = new Set(
        (
          await ctx.db.gameProfile.findMany({
            where: { userId },
            select: { id: true },
          })
        ).map((p) => p.id),
      );
      const known = new Set(
        (
          await ctx.db.gameResult.findMany({
            where: {
              userId,
              clientId: { in: input.results.map((r) => r.clientId) },
            },
            select: { clientId: true },
          })
        ).map((r) => r.clientId),
      );
      const fresh = input.results
        .filter((r) => !known.has(r.clientId))
        .sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());

      let total = 0;
      let accepted = 0;
      for (const r of fresh) {
        const profileId =
          r.profileId && owned.has(r.profileId) ? r.profileId : null;
        const xp = await xpForResult(ctx.db, userId, profileId, r);
        const created = await ctx.db.gameResult.createMany({
          data: [
            {
              userId,
              game: r.gameId,
              score: r.score,
              maxScore: r.maxScore,
              streak: r.streak,
              durationMs: r.durationMs,
              meta: r.meta as Prisma.InputJsonValue | undefined,
              playedAt: r.playedAt,
              clientId: r.clientId,
              profileId,
              xp,
            },
          ],
          skipDuplicates: true,
        });
        accepted += created.count;
        if (created.count) total += xp;
      }
      return { accepted, xp: total };
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
