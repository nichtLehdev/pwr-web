import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "~/generated/prisma/client";
import { profileName } from "@/app/spiele/_lib/profiles/names";
import {
  answerInTime,
  ENDLESS_AHEAD,
  ENDLESS_HEARTS,
  NOTE_TIME_MS,
  plausiblePace,
  type EndlessAnswer,
} from "@/app/spiele/_lib/endless-rules";
import { buildNotenRun } from "@/app/spiele/(spiel)/noten-lesen/_lib/path-stages";
import { labelsMatchAnswer } from "@/app/spiele/(spiel)/noten-lesen/_lib/pitch";
import type {
  InstrumentId,
  WrittenPitch,
} from "@/app/spiele/(spiel)/noten-lesen/_lib/types";
import { INSTRUMENTS } from "@/app/spiele/(spiel)/noten-lesen/_lib/types";

type Db = Pick<
  PrismaClient,
  "gameEndlessRun" | "gameEndlessBest" | "$transaction"
>;

/** Länger offen bleibt kein echter Lauf; danach räumt der nächste Start auf. */
const STALE_MS = 30 * 60 * 1000;
const BOARD_SIZE = 20;

export const ENDLESS_GAMES = ["noten-lesen"] as const;
export type EndlessGame = (typeof ENDLESS_GAMES)[number];

type RunState = {
  issued: WrittenPitch[];
  answers: EndlessAnswer[];
};

/** Bestenliste über alle Töne mit Hilfslinien, ohne Vorzeichen: fair für alle Lernstände. */
function poolFor(variant: string): WrittenPitch[] {
  if (!INSTRUMENTS.some((i) => i.id === variant)) {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }
  return buildNotenRun("alle-naturtoene", variant as InstrumentId).pitches;
}

function issue(
  pool: WrittenPitch[],
  previous: WrittenPitch | undefined,
  count: number,
) {
  const out: WrittenPitch[] = [];
  let last = previous;
  for (let i = 0; i < count; i++) {
    const options = pool.filter((p) => p !== last);
    const next = options[Math.floor(Math.random() * options.length)]!;
    out.push(next);
    last = next;
  }
  return out;
}

export async function startEndlessRun(
  db: Db,
  profileId: string,
  game: EndlessGame,
  variant: string,
) {
  await db.gameEndlessRun.deleteMany({
    where: {
      OR: [
        { profileId },
        { lastReportAt: { lt: new Date(Date.now() - STALE_MS) } },
      ],
    },
  });
  const pool = poolFor(variant);
  const issued = issue(pool, undefined, ENDLESS_AHEAD);
  const run = await db.gameEndlessRun.create({
    data: {
      profileId,
      game,
      variant,
      hearts: ENDLESS_HEARTS,
      state: {
        issued,
        answers: [],
      } satisfies RunState as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  return { runId: run.id, pitches: issued, noteTimeMs: NOTE_TIME_MS };
}

export type ReportResult =
  | {
      status: "running";
      score: number;
      hearts: number;
      pitches: WrittenPitch[];
    }
  | { status: "finished"; score: number; best: number; isBest: boolean }
  | { status: "invalid"; reason: string };

/**
 * Antworten prüfen, Herzen abziehen, nachlegen. Die Reihenfolge der Antworten muss
 * genau an die bisherigen anschließen, sonst wäre ein Lauf beliebig neu zu würfeln.
 */
export async function reportEndless(
  db: Db,
  profileId: string,
  runId: string,
  fromIndex: number,
  answers: EndlessAnswer[],
): Promise<ReportResult> {
  const run = await db.gameEndlessRun.findFirst({
    where: { id: runId, profileId },
  });
  if (!run) return { status: "invalid", reason: "Dieser Lauf ist abgelaufen." };
  const state = run.state as unknown as RunState;
  if (fromIndex !== state.answers.length) {
    return { status: "invalid", reason: "Antworten in falscher Reihenfolge." };
  }
  if (fromIndex + answers.length > state.issued.length) {
    return { status: "invalid", reason: "Mehr Antworten als Aufgaben." };
  }

  let { score, hearts } = run;
  const accepted: EndlessAnswer[] = [];
  for (const [offset, answer] of answers.entries()) {
    if (hearts <= 0) break;
    const pitch = state.issued[fromIndex + offset]!;
    const right =
      answerInTime(answer) && labelsMatchAnswer(answer.label!, pitch);
    if (right) score++;
    else hearts--;
    accepted.push(answer);
  }
  const allAnswers = [...state.answers, ...accepted];
  const elapsed = Date.now() - run.startedAt.getTime();
  if (!plausiblePace(allAnswers.length, elapsed)) {
    await db.gameEndlessRun.delete({ where: { id: run.id } });
    return {
      status: "invalid",
      reason:
        "Das Tempo passt nicht zu einem echten Lauf. Dieser Lauf zählt nicht.",
    };
  }

  if (hearts <= 0) {
    const previous = await db.gameEndlessBest.findUnique({
      where: {
        profileId_game_variant: {
          profileId,
          game: run.game,
          variant: run.variant,
        },
      },
      select: { score: true },
    });
    const isBest = !previous || score > previous.score;
    const replay = {
      issued: state.issued.slice(0, allAnswers.length),
      answers: allAnswers,
    } as Prisma.InputJsonValue;
    await db.$transaction([
      ...(isBest
        ? [
            db.gameEndlessBest.upsert({
              where: {
                profileId_game_variant: {
                  profileId,
                  game: run.game,
                  variant: run.variant,
                },
              },
              create: {
                profileId,
                game: run.game,
                variant: run.variant,
                score,
                replay,
              },
              update: { score, replay, achievedAt: new Date(), hidden: false },
            }),
          ]
        : []),
      db.gameEndlessRun.delete({ where: { id: run.id } }),
    ]);
    return {
      status: "finished",
      score,
      best: Math.max(score, previous?.score ?? 0),
      isBest,
    };
  }

  const ahead = state.issued.length - allAnswers.length;
  const more =
    ahead < ENDLESS_AHEAD
      ? issue(poolFor(run.variant), state.issued.at(-1), ENDLESS_AHEAD - ahead)
      : [];
  await db.gameEndlessRun.update({
    where: { id: run.id },
    data: {
      score,
      hearts,
      lastReportAt: new Date(),
      state: {
        issued: [...state.issued, ...more],
        answers: allAnswers,
      } satisfies RunState as Prisma.InputJsonValue,
    },
  });
  return { status: "running", score, hearts, pitches: more };
}

export async function endlessBoard(
  db: Pick<PrismaClient, "gameEndlessBest">,
  profileId: string | null,
  game: EndlessGame,
  variant: string,
) {
  const top = await db.gameEndlessBest.findMany({
    where: { game, variant, hidden: false },
    orderBy: [{ score: "desc" }, { achievedAt: "asc" }],
    take: BOARD_SIZE,
    select: {
      id: true,
      profileId: true,
      score: true,
      profile: { select: { nameAdjective: true, nameNoun: true, color: true } },
    },
  });
  const mine = profileId
    ? await db.gameEndlessBest.findUnique({
        where: { profileId_game_variant: { profileId, game, variant } },
        select: { score: true, achievedAt: true, hidden: true },
      })
    : null;
  const myRank =
    mine && !mine.hidden
      ? (await db.gameEndlessBest.count({
          where: {
            game,
            variant,
            hidden: false,
            OR: [
              { score: { gt: mine.score } },
              { score: mine.score, achievedAt: { lt: mine.achievedAt } },
            ],
          },
        })) + 1
      : null;
  return {
    entries: top.map((entry) => ({
      key: entry.id,
      name: profileName(entry.profile.nameAdjective, entry.profile.nameNoun),
      color: entry.profile.color,
      score: entry.score,
      isMe: entry.profileId === profileId,
    })),
    myBest: mine?.score ?? null,
    myRank,
  };
}
