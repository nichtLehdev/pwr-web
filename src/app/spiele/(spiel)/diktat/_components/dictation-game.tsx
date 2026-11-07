"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/_components/ui/button";
import type { ToniMood } from "../../../_components/toni";
import { GameBarSlot, GameDock } from "../../../_components/game-shell-context";
import {
  GameHead,
  GameStatus,
  LessonFeedback,
  useLessonHearts,
} from "../../../_components/game-kit";
import { PathResult } from "../../../_components/path-result";
import { LeaveRunButton, PathScreen } from "../../../_components/path-screen";
import { usePathState } from "../../../_lib/use-path-state";
import { markDailyDone } from "../../../_lib/daily";
import { DAILY_ID, runKindOf } from "../../../_lib/learning-path";
import {
  buildDictationRun,
  createRound,
  DICTATION_PATH,
  type DictationRound,
  type DictationRun,
} from "./dictation-path";
import { RhythmFigureLoader } from "../../../_components/rhythm-figure-loader";
import {
  harmonyAt,
  JINGLE_NOTES,
  RhythmAudio,
} from "../../../_lib/rhythm/audio";
import { describeFigure } from "../../../_lib/rhythm/describe";
import type { Level } from "../../../_lib/rhythm/levels";
import {
  barTicks,
  figureKey,
  onsetsOf,
  pulseOf,
  secPerTick,
} from "../../../_lib/rhythm/ticks";
import type { Figure } from "../../../_lib/rhythm/types";
import { useGameStats } from "../../../_lib/stats/use-game-stats";

type Phase = "setup" | "play" | "result";

const HEARTS_EMPTY_DELAY_MS = 1200;
const POINTS_FIRST_TRY = 10;
const POINTS_SECOND_TRY = 5;

/** Einzähltakt, dann die Figur. Tempo mittig im Bereich der Stufe, gut mitzuhören. */
function playFigure(
  audio: RhythmAudio,
  figure: Figure,
  level: Level,
  withCount: boolean,
) {
  audio.cancelScheduled();
  const bpm = level.bpm.start;
  const tickSec = secPerTick(bpm);
  const ts = figure.timeSignature;
  const { pulseTicks, pulsesPerBar } = pulseOf(ts);
  const pulseSec = pulseTicks * tickSec;
  const countBars = withCount ? 1 : 0;
  const start = audio.now() + 0.1;
  const totalPulses = pulsesPerBar * (countBars + figure.bars.length);
  for (let k = 0; k < totalPulses; k++) {
    const accent = k % pulsesPerBar === 0;
    const inCount = k < pulsesPerBar * countBars;
    audio.scheduleClick(
      start + k * pulseSec,
      accent,
      inCount ? undefined : 0.22,
    );
  }
  const { melodyHz } = harmonyAt(0);
  const figureStart = start + countBars * pulsesPerBar * pulseSec;
  const ticksPerBar = barTicks(ts);
  figure.bars.forEach((events, barIndex) => {
    for (const onset of onsetsOf(events)) {
      audio.scheduleNote(
        figureStart + (barIndex * ticksPerBar + onset.tick) * tickSec,
        onset.ticks * tickSec,
        melodyHz,
      );
    }
  });
}

export function DictationGame() {
  const { recordResult } = useGameStats("diktat");
  const pathState = usePathState(DICTATION_PATH, "diktat");
  const [run, setRun] = useState<DictationRun | null>(null);
  const [outcome, setOutcome] = useState<{
    percent: number;
    passed: boolean;
  } | null>(null);
  const [audio] = useState(() => new RhythmAudio());
  const [phase, setPhase] = useState<Phase>("setup");
  const [round, setRound] = useState<DictationRound | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState(0);
  const [, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [firstTryCount, setFirstTryCount] = useState(0);
  const recent = useRef(new Set<string>());

  const finishRef = useRef<(completed: boolean) => void>(() => undefined);
  const {
    hearts,
    lose: loseHeart,
    reset: resetHearts,
  } = useLessonHearts(() =>
    window.setTimeout(() => finishRef.current(false), HEARTS_EMPTY_DELAY_MS),
  );
  const mood: ToniMood = solved
    ? "happy"
    : wrongPicks.length > 0
      ? "oops"
      : "listen";

  useEffect(
    () => () => {
      audio.close();
    },
    [audio],
  );

  const beginRound = useCallback(
    async (active: DictationRun, index: number) => {
      const next = createRound(
        active.levels[index]!,
        active.options,
        recent.current,
      );
      recent.current.add(figureKey(next.target));
      setRound(next);
      setWrongPicks([]);
      setSolved(false);
      await audio.ensure();
      playFigure(audio, next.target, next.level, true);
    },
    [audio],
  );

  const startRun = (id: string) => {
    const active = buildDictationRun(id, pathState.progress);
    setRun(active);
    setOutcome(null);
    pathState.clearCelebration();
    resetHearts.current();
    recent.current.clear();
    setRoundIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setFirstTryCount(0);
    setPhase("play");
    void beginRound(active, 0);
  };

  const pick = (index: number) => {
    if (!round) return;
    if (solved) {
      // Nach der Lösung darf man vergleichen, wie die anderen geklungen hätten.
      void audio.ensure().then(() => {
        playFigure(audio, round.options[index]!, round.level, false);
      });
      return;
    }
    if (wrongPicks.includes(index)) return;
    if (index !== round.correctIndex) {
      setWrongPicks((picks) => [...picks, index]);
      setStreak(0);
      loseHeart.current();
      return;
    }
    setSolved(true);
    audio.jingle(JINGLE_NOTES.slice(0, 3), 0.09);
    const tries = wrongPicks.length;
    if (tries === 0) {
      setScore((s) => s + POINTS_FIRST_TRY);
      setFirstTryCount((n) => n + 1);
      setStreak((value) => {
        const next = value + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
    } else if (tries === 1) {
      setScore((s) => s + POINTS_SECOND_TRY);
    }
  };

  const finish = (completed: boolean) => {
    audio.cancelScheduled();
    if (!run) return;
    const maxScore = run.levels.length * POINTS_FIRST_TRY;
    const percent = Math.round((100 * score) / maxScore);
    const { passed } = run.daily
      ? { passed: false }
      : pathState.record(run.id, { percent, completed });
    if (run.daily) markDailyDone("diktat");
    setOutcome({ percent, passed });
    recordResult({
      score,
      maxScore,
      streak: bestStreak,
      meta: { stage: run.id, kind: runKindOf(DICTATION_PATH, run.id), passed },
    });
    setPhase("result");
  };
  useEffect(() => {
    finishRef.current = finish;
  });

  const advance = () => {
    if (!run) return;
    const next = roundIndex + 1;
    if (next >= run.levels.length) {
      finish(true);
      return;
    }
    setRoundIndex(next);
    void beginRound(run, next);
  };

  const backToSetup = () => {
    audio.cancelScheduled();
    setPhase("setup");
    setRound(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-[clamp(0.5rem,1.8svh,1.25rem)]">
      {phase === "setup" && (
        <PathScreen
          path={DICTATION_PATH}
          state={pathState}
          head={
            <GameHead
              title="Rhythmus-Diktat"
              text={`Hör genau hin und finde die passenden Noten. Sofort richtig gibt ${POINTS_FIRST_TRY} Punkte, beim zweiten Versuch ${POINTS_SECOND_TRY}.`}
              weltTitle="Spitz die Ohren!"
              aside={null}
            />
          }
          onStart={() => startRun(pathState.selectedId)}
          daily={{ game: "diktat", onStart: () => startRun(DAILY_ID) }}
        />
      )}

      {phase === "play" && round && run && (
        <div className="flex flex-col gap-3 pb-2">
          <GameBarSlot>
            <LeaveRunButton onLeave={backToSetup} />
          </GameBarSlot>

          <div role="status">
            <GameStatus
              mood={mood}
              message={
                solved
                  ? wrongPicks.length === 0
                    ? "Sofort erkannt"
                    : "Jetzt stimmt es"
                  : wrongPicks.length > 0
                    ? "Daneben, hör noch einmal hin"
                    : "Welche Noten hörst du?"
              }
              question="Welche Noten hörst du?"
              hearts={hearts}
              progress={roundIndex / run.levels.length}
            />
          </div>

          <ol
            className={cn(
              "spiel-options grid grid-cols-1",
              round.options.length === 4 && "md:grid-cols-2 md:gap-x-6",
            )}
          >
            {round.options.map((figure, index) => {
              const isWrong = wrongPicks.includes(index);
              const isRight = solved && index === round.correctIndex;
              return (
                <li
                  key={`${roundIndex}-${index}`}
                  className="border-rule dark:border-night-rule border-b"
                >
                  <button
                    type="button"
                    aria-disabled={isWrong && !solved}
                    aria-label={`Antwort ${index + 1}: ${describeFigure(figure)}${
                      isRight ? " Richtig." : isWrong ? " Falsch." : ""
                    }`}
                    onClick={() => pick(index)}
                    className={cn(
                      "spiel-answer group flex h-[clamp(4.75rem,13svh,10rem)] w-full items-stretch gap-3 py-1.5 text-left focus-visible:outline-3 focus-visible:-outline-offset-3",
                      isWrong && !solved && "cursor-not-allowed",
                    )}
                  >
                    <span
                      className={cn(
                        "spiel-slot condensed flex w-12 shrink-0 items-center justify-center text-[1.75rem] font-extrabold transition-colors",
                        isRight
                          ? "on-orange bg-primary text-ink spiel-stamp"
                          : isWrong
                            ? "text-paper spiel-shake bg-red-700"
                            : "border-ink text-ink group-hover:bg-primary group-hover:text-ink dark:border-night-text dark:text-night-text border-2",
                      )}
                    >
                      {isRight ? (
                        <Check className="h-7 w-7 stroke-3" aria-hidden />
                      ) : isWrong ? (
                        <X className="h-7 w-7 stroke-3" aria-hidden />
                      ) : (
                        <span aria-hidden>{"ABCD"[index]}</span>
                      )}
                    </span>
                    <span
                      className={cn("min-w-0 flex-1", isWrong && "opacity-40")}
                    >
                      <RhythmFigureLoader
                        bars={figure.bars}
                        noteKey={harmonyAt(0).melodyKey}
                        timeSignature={figure.timeSignature}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <GameDock>
            <div className="flex flex-col gap-2">
              {solved ? (
                <LessonFeedback
                  tone="right"
                  title={
                    wrongPicks.length === 0
                      ? "Sofort erkannt!"
                      : "Jetzt stimmt es!"
                  }
                  text="Tippe die anderen an, dann hörst du den Unterschied."
                />
              ) : wrongPicks.length > 0 ? (
                <LessonFeedback
                  tone="wrong"
                  title="Das war es nicht"
                  text="Hör noch einmal hin."
                />
              ) : null}
              <Button
                type="button"
                size="lg"
                className="spiel-action w-full"
                onClick={
                  solved
                    ? advance
                    : () =>
                        void audio
                          .ensure()
                          .then(() =>
                            playFigure(audio, round.target, round.level, true),
                          )
                }
              >
                {solved
                  ? roundIndex + 1 >= run.levels.length
                    ? "Zum Ergebnis"
                    : "Weiter"
                  : "Nochmal hören"}
              </Button>
            </div>
          </GameDock>
        </div>
      )}

      {phase === "result" && run && outcome && (
        <PathResult
          percent={outcome.percent}
          value={String(score)}
          valueLabel={`von ${run.levels.length * POINTS_FIRST_TRY} Punkten`}
          rows={[
            [
              "Beim ersten Hören erkannt",
              `${firstTryCount} von ${run.levels.length}`,
            ],
            ["Beste Serie", String(bestStreak)],
          ]}
          challenge={
            run.challengeSection === null
              ? null
              : {
                  passed: outcome.passed,
                  nextSection: DICTATION_PATH.sections[run.challengeSection + 1]
                    ? run.challengeSection + 2
                    : null,
                }
          }
          onAgain={() => startRun(run.id)}
          onContinue={backToSetup}
        />
      )}
    </div>
  );
}
