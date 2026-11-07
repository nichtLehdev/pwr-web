"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Rocket,
  Sparkles,
  Target,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/_components/ui/button";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
import { GameBarSlot, GameDock } from "../../../_components/game-shell-context";
import { ArcadeButton } from "../../../_components/arcade-button";
import { Confetti } from "../../../_components/confetti";
import { Toni, type ToniMood } from "../../../_components/toni";
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
import { useGameStats } from "../../../_lib/stats/use-game-stats";

type Stage = "beginner" | "intermediate" | "advanced";
type Phase = "setup" | "play" | "result";

const ROUNDS = 10;
const POINTS_FIRST_TRY = 10;
const POINTS_SECOND_TRY = 5;

const STAGES: {
  id: Stage;
  title: string;
  hint: string;
  icon: LucideIcon;
  levels: string[];
  options: number;
}[] = [
  {
    id: "beginner",
    title: "Leicht",
    hint: "Viertel, Halbe, Pausen und Achtel, drei Antworten",
    icon: Sparkles,
    levels: ["viertel-halbe", "ganze-pausen", "dreier", "achtel"],
    options: 3,
  },
  {
    id: "intermediate",
    title: "Mittel",
    hint: "Achtelpausen, Punktierungen und Synkopen, vier Antworten",
    icon: Target,
    levels: ["achtelpausen", "punktiert", "synkopen", "sechzehntel"],
    options: 4,
  },
  {
    id: "advanced",
    title: "Schwer",
    hint: "Sechzehntel-Figuren, Triolen und 6/8, vier Antworten",
    icon: Rocket,
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

  const advance = () => {
    const next = roundIndex + 1;
    if (next >= ROUNDS) {
      audio.cancelScheduled();
      recordResult({
        score,
        maxScore: ROUNDS * POINTS_FIRST_TRY,
        streak: bestStreak,
        meta: { difficulty: stageId },
      });
      setPhase("result");
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
        <div className="flex flex-col gap-[clamp(0.75rem,2.6svh,2rem)]">
          <div className="spiel-buehne flex items-center gap-3 rounded-3xl p-3">
            <Toni
              mood="listen"
              className="spiel-float h-20 w-20 sm:h-24 sm:w-24"
            />
            <div className="min-w-0">
              <h2 className="condensed text-ink dark:text-night-text text-[clamp(1.5rem,4svh,2.5rem)] leading-none font-extrabold">
                Spitz die Ohren!
              </h2>
              <p className="text-ink dark:text-night-text mt-1 leading-snug">
                Ich spiele dir etwas vor, du findest die passenden Noten. Sofort
                richtig gibt {POINTS_FIRST_TRY} Punkte, beim zweiten Versuch{" "}
                {POINTS_SECOND_TRY}.
              </p>
            </div>
          </div>

          <section aria-labelledby="diktat-schwierigkeit">
            <h3
              id="diktat-schwierigkeit"
              className="semi-condensed text-dark dark:text-night-muted text-xs font-bold tracking-[0.06em] uppercase"
            >
              Schwierigkeit
            </h3>
            <div className="mt-2 flex flex-col gap-2">
              {STAGES.map((s) => {
                const Icon = s.icon;
                const active = s.id === stageId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStageId(s.id)}
                    className={cn(
                      "flex min-h-[clamp(3rem,9svh,5.5rem)] w-full items-center gap-3 rounded-2xl border-[3px] px-3 text-left transition-colors md:gap-5 md:px-5",
                      GAME_FOCUS_RING,
                      active
                        ? "on-orange bg-primary border-ink text-ink"
                        : "border-rule hover:border-ink dark:border-night-rule dark:hover:border-night-text",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-6 w-6 shrink-0 stroke-[1.5]",
                        active ? "text-ink" : "text-dark dark:text-night-muted",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "condensed block text-xl leading-tight font-bold",
                          !active && "text-ink dark:text-night-text",
                        )}
                      >
                        {s.title}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block text-sm leading-snug",
                          active
                            ? "text-ink"
                            : "text-dark dark:text-night-muted",
                        )}
                      >
                        {s.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <GameDock>
            <ArcadeButton onClick={startGame}>Los geht&apos;s!</ArcadeButton>
          </GameDock>
        </div>
      )}

      {phase === "play" && round && (
        <div className="flex flex-col gap-3 pb-2">
          <GameBarSlot>
            <span className="semi-condensed text-dark dark:text-night-muted text-xs font-bold tracking-[0.06em] uppercase tabular-nums">
              {roundIndex + 1} / {ROUNDS} · {score} Punkte
            </span>
          </GameBarSlot>

          {solved && wrongPicks.length === 0 && (
            <Confetti key={roundIndex} pieces={28} />
          )}
          <div className="spiel-buehne flex items-center gap-3 rounded-3xl p-3">
            <Toni
              key={`${mood}-${wrongPicks.length}`}
              mood={mood}
              className={cn(
                "h-[clamp(3.75rem,11svh,5.5rem)] w-[clamp(3.75rem,11svh,5.5rem)]",
                mood === "oops" && "spiel-shake",
                mood === "happy" && "spiel-pop",
              )}
            />
            <div className="min-w-0 flex-1">
              <p
                className="condensed text-ink dark:text-night-text text-[clamp(1.375rem,3.4svh,2.25rem)] leading-none font-extrabold"
                role="status"
              >
                {solved
                  ? wrongPicks.length === 0
                    ? "Richtig, sofort erkannt!"
                    : "Jetzt stimmt's!"
                  : wrongPicks.length > 0
                    ? "Fast! Hör noch einmal hin."
                    : "Welche Noten hörst du?"}
              </p>
              {solved && (
                <p className="text-dark dark:text-night-muted mt-1 text-sm">
                  Tippe die anderen an, dann hörst du den Unterschied.
                </p>
              )}
              <div
                className="bg-ink/10 dark:bg-night-rule mt-2 h-2 overflow-hidden rounded-full"
                aria-hidden
              >
                <div
                  className="bg-primary h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${(roundIndex / ROUNDS) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div
            className={cn(
              "grid grid-cols-1 gap-2",
              round.options.length === 4 && "md:grid-cols-2",
            )}
          >
            {round.options.map((figure, index) => {
              const isWrong = wrongPicks.includes(index);
              const isRight = solved && index === round.correctIndex;
              return (
                <button
                  key={`${roundIndex}-${index}`}
                  type="button"
                  aria-disabled={isWrong && !solved}
                  aria-label={`Antwort ${index + 1}: ${describeFigure(figure)}${
                    isRight ? " Richtig." : isWrong ? " Falsch." : ""
                  }`}
                  onClick={() => pick(index)}
                  className={cn(
                    "bg-paper dark:bg-night relative h-[clamp(4.75rem,13svh,10rem)] rounded-2xl border-[3px] px-2 transition-colors",
                    GAME_FOCUS_RING,
                    isRight
                      ? "border-primary-ink dark:border-primary"
                      : isWrong
                        ? "spiel-shake border-red-700 opacity-60 dark:border-red-400"
                        : "border-rule hover:border-ink dark:border-night-rule dark:hover:border-night-text",
                  )}
                >
                  <RhythmFigureLoader
                    bars={figure.bars}
                    timeSignature={figure.timeSignature}
                  />
                  {isRight && (
                    <Check
                      className="spiel-pop text-primary-ink dark:text-primary absolute top-1.5 right-1.5 h-7 w-7 stroke-[3]"
                      aria-hidden
                    />
                  )}
                  {isWrong && (
                    <X
                      className="absolute top-1.5 right-1.5 h-6 w-6 text-red-700 dark:text-red-400"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>

          <GameDock>
            <div className="flex flex-col gap-2">
              {solved ? (
                <ArcadeButton onClick={advance}>
                  {roundIndex + 1 >= ROUNDS ? "Zum Ergebnis" : "Weiter"}
                </ArcadeButton>
              ) : (
                <ArcadeButton
                  onClick={() =>
                    void audio
                      .ensure()
                      .then(() =>
                        playFigure(audio, round.target, round.level, true),
                      )
                  }
                >
                  Nochmal hören
                </ArcadeButton>
              )}
              <Button type="button" variant="outline" onClick={backToSetup}>
                Abbrechen
              </Button>
            </div>
          </GameDock>
        </div>
      )}

      {phase === "result" && (
        <div className="spiel-buehne flex flex-col items-center gap-4 rounded-3xl p-4 text-center">
          {score >= ROUNDS * POINTS_FIRST_TRY * 0.6 && <Confetti />}
          <Toni
            mood={score >= ROUNDS * POINTS_FIRST_TRY * 0.4 ? "happy" : "idle"}
            className="spiel-float h-[clamp(5rem,16svh,8rem)] w-[clamp(5rem,16svh,8rem)]"
          />
          <p className="on-orange bg-primary text-ink spiel-pop flex min-w-[8rem] flex-col items-center rounded-2xl px-5 py-2.5">
            <span className="condensed text-[clamp(2.25rem,6.5svh,4rem)] leading-none font-extrabold tabular-nums">
              {score}
            </span>
            <span className="semi-condensed mt-1.5 text-xs font-bold tracking-[0.06em] uppercase">
              von {ROUNDS * POINTS_FIRST_TRY} Punkten
            </span>
          </p>
          <p className="text-ink dark:text-night-text">
            {firstTryCount} von {ROUNDS} Figuren beim ersten Hören erkannt
            {bestStreak >= 2 && `, ${bestStreak} davon in Folge`}.
          </p>
          {aggregates && aggregates.plays > 0 && (
            <p className="text-dark dark:text-night-muted text-sm">
              Persönlicher Rekord: {aggregates.bestScore} Punkte ·{" "}
              {aggregates.plays} {aggregates.plays === 1 ? "Runde" : "Runden"}
            </p>
          )}
          <GameDock>
            <div className="flex flex-col gap-2">
              <ArcadeButton onClick={startGame}>Nochmal spielen</ArcadeButton>
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
