"use client";

import { useCallback, useMemo, useState } from "react";
import { Music, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPuzzle, totalUnits, unitsLabel } from "../_lib/puzzle-generator";
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_VALUES,
  type DifficultyId,
  type NoteValueId,
  type Puzzle,
} from "../_lib/types";
import { ScaleSVG } from "./scale-svg";
import { NotePan } from "./note-pan";
import { NotePalette } from "./note-palette";
import { NoteWaageResultView } from "./result-view";

type Phase = "setup" | "play" | "result";
const ROUND_LEN = 10;

export function NoteValueGame() {
  const [difficulty, setDifficulty] = useState<DifficultyId>("beginner");
  const [phase, setPhase] = useState<Phase>("setup");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [right, setRight] = useState<NoteValueId[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [flashBalanced, setFlashBalanced] = useState(false);

  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [firstTryStreak, setFirstTryStreak] = useState(0);
  const [bestFirstTry, setBestFirstTry] = useState(0);

  const leftUnits = useMemo(() => (puzzle ? totalUnits(puzzle.left) : 0), [puzzle]);
  const rightUnits = useMemo(() => totalUnits(right), [right]);
  const diffUnits = rightUnits - leftUnits;

  const startGame = useCallback(() => {
    setRoundIdx(0);
    setScore(0);
    setSolved(0);
    setFirstTryStreak(0);
    setBestFirstTry(0);
    setPhase("play");
    const p = createPuzzle(difficulty);
    setPuzzle(p);
    setRight([]);
    setAttempts(0);
    setFeedback(null);
    setFlashBalanced(false);
  }, [difficulty]);

  const nextPuzzle = useCallback(() => {
    const next = roundIdx + 1;
    if (next >= ROUND_LEN) {
      setPhase("result");
      return;
    }
    setRoundIdx(next);
    const p = createPuzzle(difficulty);
    setPuzzle(p);
    setRight([]);
    setAttempts(0);
    setFeedback(null);
    setFlashBalanced(false);
  }, [difficulty, roundIdx]);

  const addNote = useCallback((id: NoteValueId) => setRight((prev) => [...prev, id]), []);

  const removeLastOf = useCallback((id: NoteValueId) => {
    setRight((prev) => {
      const idx = [...prev].reverse().findIndex((n) => n === id);
      if (idx < 0) return prev;
      const real = prev.length - 1 - idx;
      return prev.filter((_, i) => i !== real);
    });
  }, []);

  const removeAt = useCallback((idx: number) => {
    setRight((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const submit = useCallback(() => {
    if (!puzzle) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (rightUnits === leftUnits) {
      setFlashBalanced(true);
      setTimeout(() => setFlashBalanced(false), 450);
      setSolved((s) => s + 1);
      const gained = nextAttempts === 1 ? 100 : nextAttempts === 2 ? 70 : 40;
      setScore((s) => s + gained);
      if (nextAttempts === 1) {
        setFirstTryStreak((s) => {
          const ns = s + 1;
          setBestFirstTry((b) => Math.max(b, ns));
          return ns;
        });
      } else {
        setFirstTryStreak(0);
      }
      setFeedback(`Richtig! +${gained} Punkte`);
      setTimeout(nextPuzzle, 700);
      return;
    }
    const diff = rightUnits - leftUnits;
    const abs = Math.abs(diff);
    setFirstTryStreak(0);
    setFeedback(
      diff > 0
        ? `${unitsLabel(abs)} Schläge zu viel`
        : `${unitsLabel(abs)} Schläge zu wenig`,
    );
  }, [attempts, leftUnits, nextPuzzle, puzzle, rightUnits]);

  const skip = useCallback(() => {
    setFirstTryStreak(0);
    nextPuzzle();
  }, [nextPuzzle]);

  const palette = DIFFICULTY_VALUES[difficulty];

  if (phase === "result") {
    return (
      <NoteWaageResultView
        score={score}
        solved={solved}
        total={ROUND_LEN}
        bestStreak={bestFirstTry}
        onRetry={startGame}
        onSetup={() => setPhase("setup")}
      />
    );
  }

  if (phase === "setup") {
    return (
      <div className="space-y-5 md:space-y-6">
        <div className="text-center">
          <Music className="text-primary mx-auto h-11 w-11 md:h-16 md:w-16" aria-hidden />
          <h2 className="text-dark dark:text-dark-text mt-2 text-xl font-black md:text-3xl">Notenwaage</h2>
          <p className="text-dark dark:text-dark-text-secondary mx-auto mt-2 max-w-xl text-sm md:text-base">
            Fülle die rechte Waagschale mit Notenwerten, bis beide Seiten gleich schwer sind.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {(["beginner", "intermediate", "advanced"] as DifficultyId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setDifficulty(id)}
              className={cn(
                "rounded-sm border p-3 text-center transition",
                difficulty === id
                  ? "border-primary bg-amber-50/90 dark:bg-amber-950/30"
                  : "border-dark-border/50 dark:border-dark-border",
              )}
            >
              <p className="text-dark dark:text-dark-text font-bold">{DIFFICULTY_LABELS[id].title}</p>
              <p className="text-dark dark:text-dark-text-muted mt-1 text-xs">{DIFFICULTY_LABELS[id].hint}</p>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={startGame}
          className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark w-full rounded-sm px-4 py-4 text-lg font-black text-white transition"
        >
          Los geht&apos;s!
        </button>
      </div>
    );
  }

  if (!puzzle) return null;

  return (
    <div className="mx-auto flex h-[calc(100dvh-7.5rem)] max-h-[900px] w-full max-w-5xl flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between">
        <p className="text-dark dark:text-dark-text text-sm font-black">
          Runde {roundIdx + 1}/{ROUND_LEN} · Streak: {firstTryStreak}
        </p>
        <button
          type="button"
          onClick={() => setPhase("setup")}
          className="border-dark-border text-dark dark:text-dark-text inline-flex items-center gap-2 rounded-sm border px-2 py-1 text-xs font-bold"
        >
          <Settings2 className="h-4 w-4" aria-hidden />
          Setup
        </button>
      </div>

      <div className="h-[50%] min-h-[220px]">
        <ScaleSVG diffUnits={diffUnits} balancedFlash={flashBalanced} />
      </div>

      <div className="grid h-[20%] min-h-[100px] grid-cols-2 gap-2">
        <NotePan notes={puzzle.left} targetUnits={leftUnits} currentUnits={leftUnits} />
        <NotePan
          notes={right}
          targetUnits={leftUnits}
          currentUnits={rightUnits}
          editable
          onRemoveAt={removeAt}
        />
      </div>

      <div className="h-[30%] min-h-[190px] space-y-2 overflow-hidden">
        <NotePalette ids={palette} onAdd={addNote} onRemoveLastOf={removeLastOf} />
        {feedback && (
          <p className="text-dark dark:text-dark-text-secondary rounded-sm border border-dark-border/40 bg-white/60 px-3 py-2 text-sm dark:bg-dark-background/50">
            {feedback}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={submit}
            className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark rounded-sm py-3 text-base font-black text-white"
          >
            Fertig
          </button>
          <button
            type="button"
            onClick={skip}
            className="border-dark-border text-dark dark:text-dark-text rounded-sm border py-3 text-base font-bold"
          >
            Überspringen
          </button>
        </div>
        <p className="text-dark dark:text-dark-text-muted text-center text-[11px] font-semibold">
          Tipp: lang drücken im Palette-Feld entfernt die zuletzt hinzugefügte gleiche Note.
        </p>
      </div>
    </div>
  );
}
