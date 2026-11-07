"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/_components/ui/button";
import type { ToniMood } from "../../../_components/toni";
import { GameBarSlot, GameDock } from "../../../_components/game-shell-context";
import {
  FactRows,
  GameHead,
  GameStatus,
  LessonFeedback,
  ResultField,
  useLessonHearts,
} from "../../../_components/game-kit";
import { RhythmFigureLoader } from "../../../_components/rhythm-figure-loader";
import {
  harmonyAt,
  JINGLE_NOTES,
  RhythmAudio,
} from "../../../_lib/rhythm/audio";
import { describeFigure } from "../../../_lib/rhythm/describe";
import {
  generateDistractors,
  generateFigure,
  pickMeter,
} from "../../../_lib/rhythm/generator";
import { levelById, type Level } from "../../../_lib/rhythm/levels";
import {
  barTicks,
  figureKey,
  onsetsOf,
  pulseOf,
  secPerTick,
} from "../../../_lib/rhythm/ticks";
import type { Figure } from "../../../_lib/rhythm/types";
import { resultHeadline, starsFor } from "../../../_lib/rewards";
import { useGameStats } from "../../../_lib/stats/use-game-stats";

type Stage = "beginner" | "intermediate" | "advanced";
type Phase = "setup" | "play" | "result";

const ROUNDS = 10;
const HEARTS_EMPTY_DELAY_MS = 1200;
const POINTS_FIRST_TRY = 10;
const POINTS_SECOND_TRY = 5;

const STAGES: {
  id: Stage;
  title: string;
  hint: string;
  levels: string[];
  options: number;
}[] = [
  {
    id: "beginner",
    title: "Leicht",
    hint: "Viertel, Halbe, Pausen und Achtel, drei Antworten",
    levels: ["viertel-halbe", "ganze-pausen", "dreier", "achtel"],
    options: 3,
  },
  {
    id: "intermediate",
    title: "Mittel",
    hint: "Achtelpausen, Punktierungen und Synkopen, vier Antworten",
    levels: ["achtelpausen", "punktiert", "synkopen", "sechzehntel"],
    options: 4,
  },
  {
    id: "advanced",
    title: "Schwer",
    hint: "Sechzehntel-Figuren, Triolen und 6/8, vier Antworten",
    levels: [
      "achtel-sechzehntel",
      "punktierte-achtel",
      "sechzehntel-synkopen",
      "triolen",
      "sechsachtel",
      "sechsachtel-sechzehntel",
    ],
    options: 4,
  },
];

type Round = {
  level: Level;
  target: Figure;
  options: Figure[];
  correctIndex: number;
};

function createRound(
  stage: (typeof STAGES)[number],
  avoid: Set<string>,
): Round {
  const id = stage.levels[Math.floor(Math.random() * stage.levels.length)]!;
  const level = levelById(id)!;
  const ts = pickMeter(level);
  const target = generateFigure(level, ts, { avoid });
  const wrong = generateDistractors(target, level, stage.options - 1);
  const correctIndex = Math.floor(Math.random() * (wrong.length + 1));
  const options = [...wrong];
  options.splice(correctIndex, 0, target);
  return { level, target, options, correctIndex };
}

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
  const { aggregates, recordResult } = useGameStats("diktat");
  const [audio] = useState(() => new RhythmAudio());
  const [phase, setPhase] = useState<Phase>("setup");
  const [stageId, setStageId] = useState<Stage>("beginner");
  const [round, setRound] = useState<Round | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState(0);
  const [, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [firstTryCount, setFirstTryCount] = useState(0);
  const recent = useRef(new Set<string>());

  const finishRef = useRef<() => void>(() => undefined);
  const {
    hearts,
    lose: loseHeart,
    reset: resetHearts,
  } = useLessonHearts(() =>
    window.setTimeout(() => finishRef.current(), HEARTS_EMPTY_DELAY_MS),
  );
  const stage = STAGES.find((s) => s.id === stageId)!;
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
    async (nextStage: (typeof STAGES)[number]) => {
      const next = createRound(nextStage, recent.current);
      recent.current.add(figureKey(next.target));
      setRound(next);
      setWrongPicks([]);
      setSolved(false);
      await audio.ensure();
      playFigure(audio, next.target, next.level, true);
    },
    [audio],
  );

  const startGame = () => {
    resetHearts.current();
    recent.current.clear();
    setRoundIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setFirstTryCount(0);
    setPhase("play");
    void beginRound(stage);
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

  const finish = () => {
    audio.cancelScheduled();
    recordResult({
      score,
      maxScore: ROUNDS * POINTS_FIRST_TRY,
      streak: bestStreak,
      meta: { difficulty: stageId },
    });
    setPhase("result");
  };
  useEffect(() => {
    finishRef.current = finish;
  });

  const advance = () => {
    const next = roundIndex + 1;
    if (next >= ROUNDS) {
      finish();
      return;
    }
    setRoundIndex(next);
    void beginRound(stage);
  };

  const backToSetup = () => {
    audio.cancelScheduled();
    setPhase("setup");
    setRound(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-[clamp(0.5rem,1.8svh,1.25rem)]">
      {phase === "setup" && (
        <div className="flex flex-col gap-5">
          <GameHead
            title="Rhythmus-Diktat"
            text={`Hör genau hin und finde die passenden Noten. Sofort richtig gibt ${POINTS_FIRST_TRY} Punkte, beim zweiten Versuch ${POINTS_SECOND_TRY}.`}
            weltTitle="Spitz die Ohren!"
            aside={null}
          />

          <section aria-labelledby="diktat-schwierigkeit">
            <h3
              id="diktat-schwierigkeit"
              className="spiel-section-label condensed text-ink dark:text-night-text border-ink dark:border-night-text border-b-2 pb-1 text-[1.75rem] leading-none font-extrabold"
            >
              Schwierigkeit
            </h3>
            <ul className="spiel-rows">
              {STAGES.map((s) => {
                const active = s.id === stageId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setStageId(s.id)}
                      className={cn(
                        "border-rule dark:border-night-rule group flex min-h-14 w-full flex-col border-b px-2 py-2 text-left transition-colors focus-visible:outline-3 focus-visible:-outline-offset-3",
                        active
                          ? "on-orange bg-primary text-ink"
                          : "hover:bg-primary hover:text-ink text-ink dark:text-night-text",
                      )}
                    >
                      <span className="text-[1.125rem] leading-tight font-bold">
                        {s.title}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 text-sm leading-snug",
                          !active &&
                            "text-dark dark:text-night-muted group-hover:text-ink",
                        )}
                      >
                        {s.hint}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <GameDock>
            <Button
              type="button"
              size="lg"
              className="spiel-action w-full"
              onClick={startGame}
            >
              Los geht&apos;s
            </Button>
          </GameDock>
        </div>
      )}

      {phase === "play" && round && (
        <div className="flex flex-col gap-3 pb-2">
          <GameBarSlot>
            <span className="semi-condensed text-dark dark:text-night-muted text-sm font-semibold tabular-nums">
              {roundIndex + 1}/{ROUNDS} · {score} Punkte
            </span>
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
              progress={roundIndex / ROUNDS}
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
                  ? roundIndex + 1 >= ROUNDS
                    ? "Zum Ergebnis"
                    : "Weiter"
                  : "Nochmal hören"}
              </Button>
            </div>
          </GameDock>
        </div>
      )}

      {phase === "result" && (
        <div className="flex flex-col gap-4">
          <ResultField
            value={String(score)}
            valueLabel={`von ${ROUNDS * POINTS_FIRST_TRY} Punkten`}
            headline={resultHeadline(
              starsFor((100 * score) / (ROUNDS * POINTS_FIRST_TRY)),
            )}
            stars={starsFor((100 * score) / (ROUNDS * POINTS_FIRST_TRY))}
            percent={(100 * score) / (ROUNDS * POINTS_FIRST_TRY)}
          />
          <FactRows
            rows={[
              ["Beim ersten Hören erkannt", `${firstTryCount} von ${ROUNDS}`],
              ["Beste Serie", String(bestStreak)],
              ...(aggregates && aggregates.plays > 0
                ? ([["Dein Rekord", `${aggregates.bestScore} Punkte`]] as [
                    string,
                    string,
                  ][])
                : []),
            ]}
          />
          <GameDock>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                size="lg"
                className="spiel-action w-full"
                onClick={startGame}
              >
                Nochmal spielen
              </Button>
              <Button type="button" variant="outline" onClick={backToSetup}>
                Schwierigkeit wählen
              </Button>
            </div>
          </GameDock>
        </div>
      )}
    </div>
  );
}
