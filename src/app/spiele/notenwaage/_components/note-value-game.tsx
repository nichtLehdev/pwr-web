"use client";

import { useCallback, useMemo, useState } from "react";
import { Music, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPuzzle, totalUnits, unitsLabel } from "../_lib/puzzle-generator";
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_VALUES,
  NOTE_VALUES,
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

  const addNote = useCallback(
    (id: NoteValueId) => {
      setRight((prev) => {
        if (!puzzle) return prev;
        if (prev.length >= puzzle.rightCount) return prev;
        return [...prev, id];
      });
    },
    [puzzle],
  );

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
    const requiredRests = puzzle.requiredRests;
    const selectedRests = right.filter((id) => NOTE_VALUES[id].isRest).length;
    const selectedNotes = right.length - selectedRests;
    const requiredNotes = requiredRests == null ? null : puzzle.rightCount - requiredRests;

    if (right.length === puzzle.rightCount && rightUnits === leftUnits) {
      if (requiredRests != null && selectedRests !== requiredRests) {
        setFirstTryStreak(0);
        setFeedback(
          selectedRests < requiredRests
            ? `Challenge: noch ${requiredRests - selectedRests} Pause(n) hinzufügen`
            : `Challenge: ${selectedRests - requiredRests} Pause(n) zu viel`,
        );
        return;
      }
      if (requiredNotes != null && selectedNotes !== requiredNotes) {
        setFirstTryStreak(0);
        setFeedback(
          selectedNotes < requiredNotes
            ? `Challenge: noch ${requiredNotes - selectedNotes} Note(n) hinzufügen`
            : `Challenge: ${selectedNotes - requiredNotes} Note(n) zu viel`,
        );
        return;
      }
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
    if (right.length !== puzzle.rightCount) {
      setFirstTryStreak(0);
      setFeedback(
        right.length < puzzle.rightCount
          ? `Noch ${puzzle.rightCount - right.length} Note(n) ergänzen`
          : `Zu viele Noten gewählt`,
      );
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
  }, [attempts, leftUnits, nextPuzzle, puzzle, right, rightUnits]);

  const skip = useCallback(() => {
    setFirstTryStreak(0);
    nextPuzzle();
  }, [nextPuzzle]);

  const palette = useMemo(
    () => [...DIFFICULTY_VALUES[difficulty]].sort((a, b) => NOTE_VALUES[b].units - NOTE_VALUES[a].units),
    [difficulty],
  );

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
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-2 overflow-hidden md:h-[calc(100dvh-7.5rem)] md:max-h-[900px] md:gap-3">
      <div className="flex items-center justify-between">
        <p className="text-dark dark:text-dark-text text-xs font-black md:text-sm">
          Runde {roundIdx + 1}/{ROUND_LEN} · Streak: {firstTryStreak}
        </p>
        <button
          type="button"
          onClick={() => setPhase("setup")}
          className="border-dark-border text-dark dark:text-dark-text inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[11px] font-bold md:gap-2 md:text-xs"
        >
          <Settings2 className="h-4 w-4" aria-hidden />
          Setup
        </button>
      </div>
      <p className="text-dark dark:text-dark-text-secondary text-center text-xs font-bold md:text-sm">
        Aufgabe: Rechte Seite mit genau <span className="text-primary">{puzzle.rightCount}</span> Symbolen
        ausgleichen
      </p>
      {puzzle.requiredRests != null && (
        <p className="text-primary text-center text-[11px] font-black md:text-xs">
          Challenge: genau {puzzle.rightCount - puzzle.requiredRests} Note(n) + {puzzle.requiredRests} Pause(n)
        </p>
      )}

      <div className="h-[30%] min-h-[130px] shrink-0 md:h-[40%] md:min-h-[185px]">
        <ScaleSVG diffUnits={diffUnits} balancedFlash={flashBalanced} />
      </div>

      <div className="grid min-h-[74px] shrink-0 grid-cols-2 gap-1.5 md:min-h-[110px] md:gap-2">
        <NotePan notes={puzzle.left} />
        <NotePan
          notes={right}
          editable
          onRemoveAt={removeAt}
          headerHint={`Noch ${Math.max(0, puzzle.rightCount - right.length)} Symbol(e)`}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden md:gap-2">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <NotePalette
            ids={palette}
            onAdd={addNote}
            onRemoveLastOf={removeLastOf}
            showDescriptions={difficulty === "beginner"}
          />
        </div>
        {feedback && (
          <p className="text-dark dark:text-dark-text-secondary shrink-0 rounded-sm border border-dark-border/40 bg-white/60 px-2.5 py-1.5 text-xs dark:bg-dark-background/50 md:px-3 md:py-2 md:text-sm">
            {feedback}
          </p>
        )}
        <p className="text-dark dark:text-dark-text-muted hidden text-center text-[11px] font-semibold md:block">
          Tipp: lang drücken im Palette-Feld entfernt die zuletzt hinzugefügte gleiche Note.
        </p>
      </div>

      <div className="mt-auto grid shrink-0 grid-cols-2 gap-1.5 md:gap-2">
        <button
          type="button"
          onClick={submit}
          className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark rounded-sm py-2.5 text-sm font-black text-white md:py-3 md:text-base"
        >
          Fertig
        </button>
        <button
          type="button"
          onClick={skip}
          className="border-dark-border text-dark dark:text-dark-text rounded-sm border py-2.5 text-sm font-bold md:py-3 md:text-base"
        >
          Überspringen
        </button>
      </div>
    </div>
  );
}
