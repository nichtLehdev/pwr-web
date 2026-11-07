import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "~/generated/prisma/client";
import { profileName } from "@/app/spiele/_lib/profiles/names";
import {
  AHEAD_SLACK_MS,
  answerInTime,
  ENDLESS_AHEAD,
  ENDLESS_HEARTS,
  GRIFFE_NOTE_TIME_MS,
  NOTE_TIME_MS,
  plausiblePace,
  type EndlessAnswer,
} from "@/app/spiele/_lib/endless-rules";
import { buildGriffeRun } from "@/app/spiele/(spiel)/griffe/_lib/path-stages";
import { isAnswerCorrectAdvancedAll } from "@/app/spiele/(spiel)/griffe/_lib/fingering-lookup";
import {
  GRIFFE_INSTRUMENTS,
  type GriffeInstrumentId,
} from "@/app/spiele/(spiel)/griffe/_lib/types";
import {
  replayRun,
  RHYTHM_VARIANTS,
  type RecordedPress,
  type RhythmVariant,
} from "@/app/spiele/(spiel)/rhythmus/_lib/replay";
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

export const ENDLESS_GAMES = ["noten-lesen", "griffe", "rhythmus"] as const;
export type EndlessGame = (typeof ENDLESS_GAMES)[number];
export type QuestionGame = Exclude<EndlessGame, "rhythmus">;

type RunState = {
  issued: WrittenPitch[];
  answers: EndlessAnswer[];
};

/**
 * Noten lesen: alle Töne mit Hilfslinien ohne Vorzeichen. Griffe: der zweite Abschnitt
 * des Pfads. Beides ist für alle Lernstände fair.
 */
function poolFor(game: QuestionGame, variant: string): WrittenPitch[] {
  if (game === "griffe") {
    if (!GRIFFE_INSTRUMENTS.some((i) => i.id === variant)) {
      throw new TRPCError({ code: "BAD_REQUEST" });
    }
    return buildGriffeRun("alle-zusammen", variant as GriffeInstrumentId)
      .pitches;
  }
  if (!INSTRUMENTS.some((i) => i.id === variant)) {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }
  return buildNotenRun("alle-naturtoene", variant as InstrumentId).pitches;
}

function noteTimeFor(game: QuestionGame): number {
  return game === "griffe" ? GRIFFE_NOTE_TIME_MS : NOTE_TIME_MS;
}

/** Griffe schicken ihre Ventile oder Zugposition als JSON-Liste. */
function isRight(
  game: QuestionGame,
  variant: string,
  pitch: WrittenPitch,
  answer: EndlessAnswer,
): boolean {
  if (!answerInTime(answer, noteTimeFor(game))) return false;
  if (game === "noten-lesen") return labelsMatchAnswer(answer.label!, pitch);
  try {
    const fingering: unknown = JSON.parse(answer.label!);
    if (
      !Array.isArray(fingering) ||
      !fingering.every((f) => typeof f === "string")
    ) {
      return false;
    }
    return isAnswerCorrectAdvancedAll(variant as GriffeInstrumentId, pitch, [
      fingering as string[],
    ]);
  } catch {
    return false;
  }
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
  game: QuestionGame,
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
  const pool = poolFor(game, variant);
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
  return { runId: run.id, pitches: issued, noteTimeMs: noteTimeFor(game) };
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

  const game = run.game as QuestionGame;
  let { score, hearts } = run;
  const accepted: EndlessAnswer[] = [];
  for (const [offset, answer] of answers.entries()) {
    if (hearts <= 0) break;
    const pitch = state.issued[fromIndex + offset]!;
    const right = isRight(game, run.variant, pitch, answer);
    if (right) score++;
    else hearts--;
    accepted.push(answer);
  }
  const allAnswers = [...state.answers, ...accepted];
  const elapsed = Date.now() - run.startedAt.getTime();
  if (!plausiblePace(allAnswers.length, elapsed, noteTimeFor(game))) {
    await db.gameEndlessRun.delete({ where: { id: run.id } });
    return {
      status: "invalid",
      reason:
        "Das Tempo passt nicht zu einem echten Lauf. Dieser Lauf zählt nicht.",
    };
  }

  if (hearts <= 0) {
    const replay = {
      issued: state.issued.slice(0, allAnswers.length),
      answers: allAnswers,
    };
    return finishRun(db, profileId, run, score, replay);
  }

  const ahead = state.issued.length - allAnswers.length;
  const more =
    ahead < ENDLESS_AHEAD
      ? issue(
          poolFor(game, run.variant),
          state.issued.at(-1),
          ENDLESS_AHEAD - ahead,
        )
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

/** Bestwert festhalten, Lauf löschen: Nur das Ergebnis bleibt. */
async function finishRun(
  db: Db,
  profileId: string,
  run: { id: string; game: string; variant: string },
  score: number,
  replayData: unknown,
): Promise<ReportResult> {
  const key = {
    profileId_game_variant: { profileId, game: run.game, variant: run.variant },
  };
  const previous = await db.gameEndlessBest.findUnique({
    where: key,
    select: { score: true },
  });
  const isBest = !previous || score > previous.score;
  const replay = replayData as Prisma.InputJsonValue;
  await db.$transaction([
    ...(isBest
      ? [
          db.gameEndlessBest.upsert({
            where: key,
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

/* Rhythmus: Der Server spielt den Lauf aus Tastendrücken nach. */

type RhythmState = {
  seed: number;
  presses: RecordedPress[];
  decisions: (number | null)[];
};

export function isRhythmVariant(value: string): value is RhythmVariant {
  return (RHYTHM_VARIANTS as readonly string[]).includes(value);
}

export async function startRhythmRun(
  db: Db,
  profileId: string,
  variant: string,
) {
  if (!isRhythmVariant(variant)) throw new TRPCError({ code: "BAD_REQUEST" });
  await db.gameEndlessRun.deleteMany({
    where: {
      OR: [
        { profileId },
        { lastReportAt: { lt: new Date(Date.now() - STALE_MS) } },
      ],
    },
  });
  const seed = Math.floor(Math.random() * 2 ** 31);
  const run = await db.gameEndlessRun.create({
    data: {
      profileId,
      game: "rhythmus",
      variant,
      hearts: ENDLESS_HEARTS,
      state: {
        seed,
        presses: [],
        decisions: [],
      } satisfies RhythmState as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  return { runId: run.id, seed };
}

/**
 * Zwischendurch: Drücke sammeln und prüfen, dass keiner in der Zukunft liegt.
 * Am Ende: nachspielen, und nur was der Server selbst zählt, kommt in die Liste.
 */
export async function reportRhythm(
  db: Db,
  profileId: string,
  input: {
    runId: string;
    fromPress: number;
    presses: RecordedPress[];
    fromDecision: number;
    decisions: (number | null)[];
    final: boolean;
  },
): Promise<ReportResult & { reached?: number }> {
  const run = await db.gameEndlessRun.findFirst({
    where: { id: input.runId, profileId, game: "rhythmus" },
  });
  if (!run) return { status: "invalid", reason: "Dieser Lauf ist abgelaufen." };
  const state = run.state as unknown as RhythmState;
  if (
    input.fromPress !== state.presses.length ||
    input.fromDecision !== state.decisions.length
  ) {
    return { status: "invalid", reason: "Meldungen in falscher Reihenfolge." };
  }
  const presses = [...state.presses, ...input.presses];
  const decisions = [...state.decisions, ...input.decisions];
  const elapsed = Date.now() - run.startedAt.getTime();
  const latest = Math.max(
    0,
    ...input.presses.map((p) => p.atMs + (p.durationMs ?? 0)),
  );
  if (latest > elapsed + AHEAD_SLACK_MS) {
    await db.gameEndlessRun.delete({ where: { id: run.id } });
    return {
      status: "invalid",
      reason:
        "Das Tempo passt nicht zu einem echten Lauf. Dieser Lauf zählt nicht.",
    };
  }
  if (!input.final) {
    await db.gameEndlessRun.update({
      where: { id: run.id },
      data: {
        lastReportAt: new Date(),
        state: {
          ...state,
          presses,
          decisions,
        } satisfies RhythmState as Prisma.InputJsonValue,
      },
    });
    return { status: "running", score: 0, hearts: run.hearts, pitches: [] };
  }

  const result = replayRun({
    variant: run.variant as RhythmVariant,
    seed: state.seed,
    decisions,
    presses,
  });
  if (!result.valid || result.songMs > elapsed + AHEAD_SLACK_MS) {
    await db.gameEndlessRun.delete({ where: { id: run.id } });
    return {
      status: "invalid",
      reason: result.valid
        ? "Das Tempo passt nicht zu einem echten Lauf. Dieser Lauf zählt nicht."
        : `${result.reason} Dieser Lauf zählt nicht.`,
    };
  }
  const finished = await finishRun(db, profileId, run, result.points, {
    seed: state.seed,
    decisions,
    presses,
  });
  return { ...finished, reached: result.reached };
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
