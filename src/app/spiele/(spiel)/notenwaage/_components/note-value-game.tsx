"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/app/_components/ui/button";
import {
  GameHead,
  GameStatus,
  LessonFeedback,
  useGameSounds,
  useLessonHearts,
} from "../../../_components/game-kit";
import { GameBarSlot, GameDock } from "../../../_components/game-shell-context";
import { PathResult } from "../../../_components/path-result";
import {
  LeaveRunButton,
  PathScreen,
  ModeButtons,
  useDailyDone,
} from "../../../_components/path-screen";
import { Toni } from "../../../_components/toni";
import { praiseFor } from "../../../_lib/rewards";
import { useGameStats } from "../../../_lib/stats/use-game-stats";
import { usePathState } from "../../../_lib/use-path-state";
import { CalendarDays } from "lucide-react";
import {
  DAILY_AFTER_SECTION,
  sectionFinished,
} from "../../../_lib/learning-path";
import { markDailyDone } from "../../../_lib/daily";
import { DAILY_ID, runKindOf } from "../../../_lib/learning-path";
import {
  createPuzzle,
  puzzleSignature,
  totalUnits,
} from "../_lib/puzzle-generator";
import { buildRun, WAAGE_PATH, type WaageRun } from "../_lib/stages";
import { NOTE_VALUES, type NoteValueId, type Puzzle } from "../_lib/types";
import { BalanceScale, NoteWeight, type PanEntry } from "./balance-scale";
import { NotePalette } from "./note-palette";

type Phase = "path" | "lesson" | "play" | "result";

const SUCCESS_ADVANCE_MS = 1600;
const HEARTS_EMPTY_DELAY_MS = 1400;
const POINTS_BY_ATTEMPT = [100, 70, 40] as const;

// Stabile Schlüssel: beim Entfernen bleibt jedes andere Gewicht liegen.
let nextEntryUid = 1;

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function restRule(puzzle: Puzzle): string | null {
  if (puzzle.requiredRests == null) return null;
  const notes = puzzle.rightCount - puzzle.requiredRests;
  return `Genau ${plural(notes, "Note", "Noten")} und ${plural(puzzle.requiredRests, "Pause", "Pausen")}`;
}

type RoundResult = {
  solved: number;
  total: number;
  percent: number;
  score: number;
  bestStreak: number;
  completed: boolean;
  passed: boolean;
};

export function NoteValueGame() {
  const { recordResult } = useGameStats("notenwaage");
  const { correct: soundCorrect, wrong: soundWrong } = useGameSounds();
  const pathState = usePathState(WAAGE_PATH, "notenwaage");

  const [phase, setPhase] = useState<Phase>("path");
  const dailyDone = useDailyDone("notenwaage", phase);
  const [run, setRun] = useState<WaageRun | null>(null);
  const [roundIdx, setRoundIdx] = useState(0);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [right, setRight] = useState<PanEntry[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [solvedNow, setSolvedNow] = useState(false);
  /** Ergebnis des letzten Wiegens; jede Änderung auf der Waage verwirft es. */
  const [weighed, setWeighed] = useState<-1 | 0 | 1 | null>(null);
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<RoundResult | null>(null);

  const totals = useRef({ score: 0, solved: 0, bestStreak: 0 });
  const advanceTimer = useRef<number | null>(null);
  const lastSignature = useRef<string | null>(null);
  const runRef = useRef<WaageRun | null>(null);

  useEffect(() => {
    // Lädt Bravura für die Gewichte, auch bevor die erste Note gezeichnet ist.
    void import("../../../_lib/vexflow-compact").then((m) =>
      m.ensureVexFlowFonts(),
    );
  }, []);

  const clearAdvance = useCallback(() => {
    if (advanceTimer.current != null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, []);
  useEffect(() => clearAdvance, [clearAdvance]);

  const finish = useCallback(
    (completed: boolean) => {
      clearAdvance();
      const active = runRef.current;
      if (!active) return;
      const total = active.steps.length;
      const { score, solved, bestStreak } = totals.current;
      const percent = Math.round((score / (total * 100)) * 100);
      const recorded = active.daily
        ? { passed: false }
        : pathState.record(active.id, { percent, completed });
      if (active.daily) markDailyDone("notenwaage");
      recordResult({
        score,
        maxScore: total * 100,
        streak: bestStreak,
        meta: {
          stage: active.id,
          kind: runKindOf(WAAGE_PATH, active.id),
          passed: recorded.passed,
          solved,
          total,
        },
      });
      setResult({
        solved,
        total,
        percent,
        score,
        bestStreak,
        completed,
        passed: recorded.passed,
      });
      setPhase("result");
    },
    [clearAdvance, pathState, recordResult],
  );

  const {
    hearts,
    lose: loseHeart,
    reset: resetHearts,
  } = useLessonHearts(() => {
    advanceTimer.current = window.setTimeout(
      () => finish(false),
      HEARTS_EMPTY_DELAY_MS,
    );
  });

  const rollPuzzle = useCallback((active: WaageRun, index: number) => {
    const config = active.steps[index]!;
    let next = createPuzzle(config);
    for (let i = 0; i < 8; i++) {
      if (puzzleSignature(next) !== lastSignature.current) break;
      next = createPuzzle(config);
    }
    lastSignature.current = puzzleSignature(next);
    return next;
  }, []);

  const showRound = useCallback(
    (active: WaageRun, index: number) => {
      setRoundIdx(index);
      setPuzzle(rollPuzzle(active, index));
      setRight([]);
      setAttempts(0);
      setFeedback(null);
      setWeighed(null);
      setSolvedNow(false);
    },
    [rollPuzzle],
  );

  const beginPlay = useCallback(
    (active: WaageRun) => {
      totals.current = { score: 0, solved: 0, bestStreak: 0 };
      setStreak(0);
      resetHearts.current();
      showRound(active, 0);
      setPhase("play");
    },
    [resetHearts, showRound],
  );

  const start = useCallback(
    (id: string) => {
      clearAdvance();
      pathState.clearCelebration();
      const active = buildRun(id, pathState.progress);
      runRef.current = active;
      setRun(active);
      setResult(null);
      // Die Merkhilfe nur, bis die Stufe einmal Sterne gebracht hat.
      if (active.lesson && !pathState.progress[id]?.stars) {
        setPhase("lesson");
        return;
      }
      beginPlay(active);
    },
    [beginPlay, clearAdvance, pathState],
  );

  const palette = useMemo(
    () =>
      [...(run?.palette ?? [])].sort(
        (a, b) => NOTE_VALUES[b].units - NOTE_VALUES[a].units,
      ),
    [run],
  );
  const leftEntries = useMemo<PanEntry[]>(
    () => puzzle?.left.map((id, i) => ({ uid: `L${i}`, id })) ?? [],
    [puzzle],
  );

  const changeRight = useCallback(
    (change: (prev: PanEntry[]) => PanEntry[]) => {
      setRight(change);
      setWeighed(null);
      setFeedback(null);
    },
    [],
  );

  const locked = solvedNow || hearts === 0;

  const addNote = useCallback(
    (id: NoteValueId) => {
      if (!puzzle || locked || right.length >= puzzle.rightCount) return;
      changeRight((prev) => [...prev, { uid: nextEntryUid++, id }]);
    },
    [changeRight, locked, puzzle, right.length],
  );
  const removeLastOf = useCallback(
    (id: NoteValueId) => {
      if (locked) return;
      changeRight((prev) => {
        const index = prev.map((entry) => entry.id).lastIndexOf(id);
        return index < 0 ? prev : prev.filter((_, i) => i !== index);
      });
    },
    [changeRight, locked],
  );
  const removeAt = useCallback(
    (index: number) => {
      if (locked) return;
      changeRight((prev) => prev.filter((_, i) => i !== index));
    },
    [changeRight, locked],
  );

  const weigh = useCallback(() => {
    if (!puzzle || !run || locked || right.length !== puzzle.rightCount) return;
    const ids = right.map((entry) => entry.id);
    const difference = totalUnits(ids) - totalUnits(puzzle.left);
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setWeighed(difference === 0 ? 0 : difference > 0 ? 1 : -1);

    const rests = ids.filter((id) => NOTE_VALUES[id].isRest).length;
    const rule = restRule(puzzle);
    const rulesMet =
      puzzle.requiredRests == null || rests === puzzle.requiredRests;

    if (difference === 0 && rulesMet) {
      const gained = POINTS_BY_ATTEMPT[nextAttempts - 1] ?? 40;
      totals.current.score += gained;
      totals.current.solved += 1;
      const nextStreak = nextAttempts === 1 ? streak + 1 : 0;
      setStreak(nextStreak);
      totals.current.bestStreak = Math.max(
        totals.current.bestStreak,
        nextStreak,
      );
      setSolvedNow(true);
      setFeedback("Beide Seiten wiegen gleich.");
      soundCorrect(nextStreak);
      advanceTimer.current = window.setTimeout(() => {
        advanceTimer.current = null;
        const active = runRef.current!;
        if (roundIdx + 1 >= active.steps.length) finish(true);
        else showRound(active, roundIdx + 1);
      }, SUCCESS_ADVANCE_MS);
      return;
    }

    setStreak(0);
    soundWrong();
    setFeedback(
      difference === 0
        ? `Gleich schwer, aber: ${rule ?? ""}.`
        : `${difference > 0 ? "Deine Seite ist zu schwer" : "Deine Seite ist zu leicht"}.${
            run.lesson ? ` ${run.lesson.text}` : ""
          }`,
    );
    loseHeart.current();
  }, [
    attempts,
    finish,
    locked,
    loseHeart,
    puzzle,
    right,
    roundIdx,
    run,
    showRound,
    soundCorrect,
    soundWrong,
    streak,
  ]);

  const toPath = useCallback(() => {
    clearAdvance();
    setPhase("path");
  }, [clearAdvance]);

  if (phase === "path") {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <PathScreen
          tutorials={(stage) =>
            stage.liveScale
              ? ["notenwaage-start"]
              : ["notenwaage-start", "notenwaage-wiegen"]
          }
          challengeTutorials={["notenwaage-wiegen"]}
          path={WAAGE_PATH}
          state={pathState}
          head={
            <GameHead
              title="Notenwaage"
              text="Leg Noten auf die Waage, bis beide Seiten gleich schwer sind."
            />
          }
          challengeText="Alle Noten bis hierher, drei Mal Puste. Schaffe 70 %."
          modes={
            <ModeButtons
              buttons={[
                {
                  key: "daily",
                  label: "Tagestraining",
                  icon: CalendarDays,
                  status: dailyDone ? "Heute geschafft" : "Doppelte XP",
                  highlight: !dailyDone,
                  locked: sectionFinished(
                    WAAGE_PATH,
                    DAILY_AFTER_SECTION,
                    pathState.progress,
                  )
                    ? null
                    : "Schaff erst Abschnitt 2",
                  onClick: () => start(DAILY_ID),
                },
              ]}
            />
          }
          onStart={() => start(pathState.selectedId)}
        />
      </div>
    );
  }

  if (phase === "result" && result && run) {
    const section = run.challengeSection;
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <PathResult
          percent={result.percent}
          value={`${result.solved}/${result.total}`}
          valueLabel="gelöst"
          rows={[
            ["Punkte", String(result.score)],
            ["Beste Serie", String(result.bestStreak)],
          ]}
          challenge={
            section === null
              ? null
              : {
                  passed: result.passed,
                  nextSection: WAAGE_PATH.sections[section + 1]
                    ? section + 2
                    : null,
                }
          }
          onAgain={() => start(run.id)}
          onContinue={toPath}
        />
      </div>
    );
  }

  if (phase === "lesson" && run?.lesson) {
    const { heavy, light, text } = run.lesson;
    const width = (heavy.length + light.length + 1) * 84;
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 pt-4 text-center">
        <Toni mood="happy" className="h-24 w-24" />
        <p className="text-primary-ink dark:text-primary text-sm font-extrabold">
          Neu in dieser Stufe
        </p>
        <svg
          viewBox={`0 -44 ${width} 92`}
          className="text-ink dark:text-night-text w-full max-w-md overflow-visible"
          role="img"
          aria-label={text}
        >
          {heavy.map((id, i) => (
            <NoteWeight key={i} id={id} x={42 + i * 84} y={0} />
          ))}
          <text
            x={42 + heavy.length * 84}
            y="14"
            textAnchor="middle"
            fontSize="44"
            fontWeight="800"
            fill="currentColor"
          >
            =
          </text>
          {light.map((id, i) => (
            <NoteWeight
              key={i}
              id={id}
              x={42 + (heavy.length + 1 + i) * 84}
              y={0}
            />
          ))}
        </svg>
        <p className="text-ink dark:text-night-text text-2xl leading-snug font-extrabold">
          {text}
        </p>
        <GameDock>
          <Button
            type="button"
            size="lg"
            className="spiel-action w-full"
            onClick={() => beginPlay(run)}
          >
            Los geht&apos;s
          </Button>
        </GameDock>
      </div>
    );
  }

  if (!puzzle || !run) return null;

  const openSlots = Math.max(0, puzzle.rightCount - right.length);
  const liveDifference =
    totalUnits(right.map((e) => e.id)) - totalUnits(puzzle.left);
  const tilt: -1 | 0 | 1 = run.liveScale
    ? ((Math.sign(liveDifference) as -1 | 0 | 1) ?? 0)
    : (weighed ?? 0);
  const rule = restRule(puzzle);
  const wrong = feedback !== null && !solvedNow;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 md:gap-3">
      <GameBarSlot>
        <LeaveRunButton onLeave={toPath} />
      </GameBarSlot>
      <GameStatus
        mood={solvedNow ? "happy" : wrong ? "oops" : "listen"}
        message={
          solvedNow
            ? praiseFor(streak || 1)
            : wrong
              ? "Noch nicht"
              : "Mach sie gleich schwer"
        }
        question="Mach sie gleich schwer"
        note={rule ?? `Mit genau ${plural(puzzle.rightCount, "Note", "Noten")}`}
        hearts={hearts}
        streak={streak}
        progress={roundIdx / run.steps.length}
      />

      <BalanceScale
        left={leftEntries}
        right={right}
        slotCount={puzzle.rightCount}
        tilt={tilt}
        celebrate={solvedNow}
        status={
          tilt === 0
            ? solvedNow
              ? "Die Waage ist im Gleichgewicht"
              : `Noch ${plural(openSlots, "Feld", "Felder")} frei`
            : tilt > 0
              ? "Rechts ist schwerer"
              : "Links ist schwerer"
        }
        onRemoveAt={locked ? undefined : removeAt}
      />

      <NotePalette
        ids={palette}
        onAdd={addNote}
        onRemoveLastOf={removeLastOf}
        disabled={locked}
      />
      <p className="text-dark dark:text-night-muted text-center text-xs font-semibold">
        Tippe ein Gewicht in deiner Schale an, um es wieder wegzunehmen.
      </p>

      <GameDock>
        {feedback && (
          <div className="mb-2">
            <LessonFeedback
              tone={solvedNow ? "right" : "wrong"}
              title={solvedNow ? "Richtig!" : "Noch nicht"}
              text={feedback}
            />
          </div>
        )}
        <Button
          type="button"
          size="lg"
          className="spiel-action w-full"
          disabled={locked || openSlots > 0}
          onClick={weigh}
        >
          {openSlots > 0
            ? `Noch ${plural(openSlots, "Feld", "Felder")} frei`
            : "Wiegen"}
        </Button>
      </GameDock>
    </div>
  );
}
