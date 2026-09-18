"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Music, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/_components/ui/button";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
import {
  createPuzzle,
  puzzleSignature,
  totalUnits,
} from "../_lib/puzzle-generator";
import { unitsToBeatLabel } from "../_lib/beat-label";
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_VALUES,
  NOTE_VALUES,
  STORAGE_DIFFICULTY_KEY,
  type DifficultyId,
  type NoteValueId,
  type Puzzle,
} from "../_lib/types";
import { GameBarSlot, GameDock } from "../../../_components/game-shell-context";
import { GameStepIndicator } from "../../../_components/game-step-indicator";
import { useGameStats } from "../../../_lib/stats/use-game-stats";
import { ScaleSVG } from "./scale-svg";
import { NotePan, type PanEntry } from "./note-pan";
import { NotePalette } from "./note-palette";
import { NoteGlyph } from "./note-glyph-loader";
import { NoteWaageResultView } from "./result-view";

type Phase = "setup" | "play" | "result";
const ROUND_LEN = 10;
const SUCCESS_ADVANCE_MS = 1600;

/*
 * `calc(… dvh - …px)` = „Fensterhöhe minus feste Zeilen“; eine reine dvh-Quote passt nicht,
 * weil die festen Zeilen bei flachen Fenstern fast alles, bei hohen nur ein Viertel füllen.
 */
const WAAGE_HOEHE =
  "h-[max(130px,min(calc(40dvh_-_108px),260px))] md:h-[max(110px,min(calc(65.7dvh_-_317px),440px))]";
/* Setup-Waage: fällt bei flachen Fenstern über `max(0px, …)` auf 0, dort braucht die Auswahl den Platz. */
const SETUP_WAAGE =
  "h-[max(0px,min(calc(50dvh_-_440px),200px))] md:h-[max(0px,min(calc(70dvh_-_460px),320px))]";
const STUFEN_KARTE =
  "min-h-11 md:min-h-[max(76px,min(calc(14dvh_-_38px),150px))]";
const VORSCHAU_FELD =
  "min-h-[max(76px,min(calc(14dvh_-_20px),130px))] md:min-h-[max(88px,min(calc(20dvh_-_60px),180px))]";
const VORSCHAU_GLYPH =
  "h-[max(26px,min(calc(5dvh_-_14px),44px))] w-[max(26px,min(calc(5dvh_-_14px),44px))] md:h-[max(32px,min(calc(8dvh_-_26px),72px))] md:w-[max(32px,min(calc(8dvh_-_26px),72px))]";
// Genau die halbe Glyphengröße: Das VexFlow-SVG ragt anteilig unter sein
// Kästchen, der Abstand zur Beschriftung muss also mitwachsen.
const VORSCHAU_ABSTAND =
  "mt-[max(13px,min(calc(2.5dvh_-_7px),22px))] md:mt-[max(16px,min(calc(4dvh_-_13px),36px))]";
const TITEL_ZEICHEN = "h-[clamp(40px,7dvh,72px)] w-[clamp(40px,7dvh,72px)]";

// Stabile Schlüssel für Einträge in der rechten Schale: beim Entfernen einer
// Note bleiben alle anderen NoteGlyphs gemountet (kein VexFlow-Re-Render).
let nextEntryUid = 1;

function readStoredDifficulty(): DifficultyId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_DIFFICULTY_KEY);
    return raw === "beginner" || raw === "intermediate" || raw === "advanced"
      ? raw
      : null;
  } catch {
    return null;
  }
}

export function NoteValueGame() {
  const { aggregates, recordResult } = useGameStats("notenwaage");
  const [difficulty, setDifficulty] = useState<DifficultyId>("beginner");
  const [phase, setPhase] = useState<Phase>("setup");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [right, setRight] = useState<PanEntry[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [flashBalanced, setFlashBalanced] = useState(false);
  const [pendingAdvance, setPendingAdvance] = useState(false);

  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [firstTryStreak, setFirstTryStreak] = useState(0);
  const [bestFirstTry, setBestFirstTry] = useState(0);

  const advanceTimer = useRef<number | null>(null);
  const lastSignature = useRef<string | null>(null);
  const hintBaseId = useId();

  // Gespeicherte Schwierigkeit erst nach dem Mount lesen (SSR-sicher).
  useEffect(() => {
    const stored = readStoredDifficulty();
    if (stored) setDifficulty(stored);
  }, []);

  const clearAdvance = useCallback(() => {
    if (advanceTimer.current != null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    setPendingAdvance(false);
  }, []);

  // Laufender Auto-Advance-Timer darf den Unmount nicht überleben.
  useEffect(
    () => () => {
      if (advanceTimer.current != null)
        window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  const selectDifficulty = useCallback((id: DifficultyId) => {
    setDifficulty(id);
    try {
      localStorage.setItem(STORAGE_DIFFICULTY_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const leftUnits = useMemo(
    () => (puzzle ? totalUnits(puzzle.left) : 0),
    [puzzle],
  );
  const rightUnits = useMemo(() => totalUnits(right.map((e) => e.id)), [right]);
  const diffUnits = rightUnits - leftUnits;

  const leftEntries = useMemo<PanEntry[]>(
    () => (puzzle ? puzzle.left.map((id, i) => ({ uid: `L${i}`, id })) : []),
    [puzzle],
  );

  // Direkt aufeinanderfolgende identische Aufgaben (begrenzt) neu würfeln.
  const rollPuzzle = useCallback(() => {
    let p = createPuzzle(difficulty);
    for (let i = 0; i < 8; i++) {
      if (puzzleSignature(p) !== lastSignature.current) break;
      p = createPuzzle(difficulty);
    }
    lastSignature.current = puzzleSignature(p);
    return p;
  }, [difficulty]);

  const startGame = useCallback(() => {
    clearAdvance();
    setRoundIdx(0);
    setScore(0);
    setSolved(0);
    setFirstTryStreak(0);
    setBestFirstTry(0);
    setPhase("play");
    setPuzzle(rollPuzzle());
    setRight([]);
    setAttempts(0);
    setFeedback(null);
    setFlashBalanced(false);
  }, [clearAdvance, rollPuzzle]);

  const nextPuzzle = useCallback(() => {
    clearAdvance();
    const next = roundIdx + 1;
    if (next >= ROUND_LEN) {
      setPhase("result");
      return;
    }
    setRoundIdx(next);
    setPuzzle(rollPuzzle());
    setRight([]);
    setAttempts(0);
    setFeedback(null);
    setFlashBalanced(false);
  }, [clearAdvance, roundIdx, rollPuzzle]);

  const addNote = useCallback(
    (id: NoteValueId) => {
      if (!puzzle || pendingAdvance) return;
      if (right.length >= puzzle.rightCount) {
        setFeedback("Deine Seite ist voll — entferne zuerst ein Symbol.");
        return;
      }
      setRight((prev) =>
        prev.length >= puzzle.rightCount
          ? prev
          : [...prev, { uid: nextEntryUid++, id }],
      );
    },
    [pendingAdvance, puzzle, right.length],
  );

  const removeLastOf = useCallback(
    (id: NoteValueId) => {
      if (pendingAdvance) return;
      setRight((prev) => {
        const idx = [...prev].reverse().findIndex((e) => e.id === id);
        if (idx < 0) return prev;
        const real = prev.length - 1 - idx;
        return prev.filter((_, i) => i !== real);
      });
    },
    [pendingAdvance],
  );

  const removeAt = useCallback(
    (idx: number) => {
      if (pendingAdvance) return;
      setRight((prev) => prev.filter((_, i) => i !== idx));
    },
    [pendingAdvance],
  );

  const submit = useCallback(() => {
    if (!puzzle || pendingAdvance) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    const requiredRests = puzzle.requiredRests;
    const rightIds = right.map((e) => e.id);
    const selectedRests = rightIds.filter(
      (id) => NOTE_VALUES[id].isRest,
    ).length;
    const selectedNotes = rightIds.length - selectedRests;
    const requiredNotes =
      requiredRests == null ? null : puzzle.rightCount - requiredRests;

    if (rightIds.length === puzzle.rightCount && rightUnits === leftUnits) {
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
      setPendingAdvance(true);
      advanceTimer.current = window.setTimeout(() => {
        advanceTimer.current = null;
        nextPuzzle();
      }, SUCCESS_ADVANCE_MS);
      return;
    }
    if (rightIds.length !== puzzle.rightCount) {
      setFirstTryStreak(0);
      setFeedback(
        rightIds.length < puzzle.rightCount
          ? `Noch ${puzzle.rightCount - rightIds.length} Note(n) ergänzen`
          : `Zu viele Noten gewählt`,
      );
      return;
    }
    const diff = rightUnits - leftUnits;
    const abs = Math.abs(diff);
    setFirstTryStreak(0);
    setFeedback(
      diff > 0
        ? `${unitsToBeatLabel(abs)} zu viel`
        : `${unitsToBeatLabel(abs)} zu wenig`,
    );
  }, [
    attempts,
    leftUnits,
    nextPuzzle,
    pendingAdvance,
    puzzle,
    right,
    rightUnits,
  ]);

  const skip = useCallback(() => {
    if (pendingAdvance) return;
    setFirstTryStreak(0);
    nextPuzzle();
  }, [nextPuzzle, pendingAdvance]);

  const goToSetup = useCallback(() => {
    clearAdvance();
    setPhase("setup");
  }, [clearAdvance]);

  const palette = useMemo(
    () =>
      [...DIFFICULTY_VALUES[difficulty]].sort(
        (a, b) => NOTE_VALUES[b].units - NOTE_VALUES[a].units,
      ),
    [difficulty],
  );

  /** Ergebnis einmal pro Runde festhalten — erst nach dem Commit von `score`. */
  const resultRecordedRef = useRef(false);
  useEffect(() => {
    if (phase !== "result") {
      resultRecordedRef.current = false;
      return;
    }
    if (resultRecordedRef.current) return;
    resultRecordedRef.current = true;
    recordResult({
      score,
      maxScore: ROUND_LEN * 100,
      streak: bestFirstTry,
      meta: { difficulty, solved, total: ROUND_LEN },
    });
  }, [phase, score, bestFirstTry, difficulty, solved, recordResult]);

  if (phase === "result") {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <GameStepIndicator
          steps={["Setup", "Spielen", "Auswertung"]}
          current={2}
        />
        <NoteWaageResultView
          score={score}
          solved={solved}
          total={ROUND_LEN}
          bestStreak={bestFirstTry}
          onRetry={startGame}
          onSetup={goToSetup}
        />
        {aggregates && aggregates.plays > 0 && (
          <p className="text-dark dark:text-night-muted text-center text-sm">
            Persönlicher Rekord:{" "}
            <span className="text-ink dark:text-night-text font-bold">
              {aggregates.bestScore} Punkte
            </span>{" "}
            · {aggregates.plays} {aggregates.plays === 1 ? "Runde" : "Runden"}{" "}
            gespielt
          </p>
        )}
      </div>
    );
  }

  if (phase === "setup") {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 md:gap-5">
        <GameStepIndicator
          steps={["Setup", "Spielen", "Auswertung"]}
          current={0}
        />
        <div className="text-center">
          <Music
            className={cn(
              "text-primary-ink dark:text-primary mx-auto",
              TITEL_ZEICHEN,
            )}
            aria-hidden
          />
          <h2 className="text-ink dark:text-night-text mt-2 text-xl font-bold md:text-3xl">
            Notenwaage
          </h2>
          <p className="text-dark dark:text-night-muted mx-auto mt-2 max-w-xl text-sm md:text-base">
            Fülle die rechte Waagschale mit Notenwerten, bis beide Seiten gleich
            schwer sind.
          </p>
        </div>
        {/* Rein schmückend, daher für Vorleseprogramme unsichtbar. */}
        <div className={cn("shrink-0 overflow-hidden", SETUP_WAAGE)}>
          <ScaleSVG diffUnits={0} decorative />
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-3">
          {(["beginner", "intermediate", "advanced"] as DifficultyId[]).map(
            (id) => {
              const selected = difficulty === id;
              const hintId = `${hintBaseId}-${id}`;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectDifficulty(id)}
                  // Eigener Name, sonst liest ein Vorleseprogramm Titel und Hinweis als ein Wort.
                  aria-label={DIFFICULTY_LABELS[id].title}
                  aria-describedby={hintId}
                  aria-pressed={selected}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 border p-3 text-center transition-colors motion-safe:active:scale-[0.99]",
                    STUFEN_KARTE,
                    GAME_FOCUS_RING,
                    selected
                      ? // Druckfeld: Orange ist die Fläche, alles darauf Tinte.
                        "on-orange border-primary bg-primary"
                      : "border-rule dark:border-night-rule",
                  )}
                >
                  <span
                    className={cn(
                      "font-bold",
                      selected ? "text-ink" : "text-ink dark:text-night-text",
                    )}
                  >
                    {DIFFICULTY_LABELS[id].title}
                  </span>
                  <span
                    id={hintId}
                    className={cn(
                      "text-xs",
                      selected ? "text-ink" : "text-dark dark:text-night-muted",
                    )}
                  >
                    {DIFFICULTY_LABELS[id].hint}
                  </span>
                </button>
              );
            },
          )}
        </div>

        <section className="flex flex-col gap-2 md:gap-3">
          <h3 className="border-rule dark:border-night-rule text-dark dark:text-night-muted border-b pb-1 text-center text-[11px] font-bold tracking-wide uppercase md:text-xs">
            Diese Werte liegen bereit
          </h3>
          <ul
            className={cn(
              "grid gap-1.5 md:gap-2",
              palette.length <= 6
                ? "grid-cols-3"
                : "grid-cols-4 md:grid-cols-7",
            )}
          >
            {palette.map((id) => (
              <li
                key={id}
                className={cn(
                  "border-rule dark:border-night-rule flex flex-col items-center justify-center border p-1.5 text-center md:p-2",
                  VORSCHAU_FELD,
                )}
              >
                <NoteGlyph id={id} className={VORSCHAU_GLYPH} />
                <span
                  className={cn(
                    "text-ink dark:text-night-text text-[9px] leading-tight font-bold md:text-[11px]",
                    VORSCHAU_ABSTAND,
                  )}
                >
                  {NOTE_VALUES[id].label}
                </span>
                <span className="text-dark dark:text-night-muted text-[9px] font-semibold md:text-[10px]">
                  {unitsToBeatLabel(NOTE_VALUES[id].units)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <Button type="button" size="lg" className="w-full" onClick={startGame}>
          Los geht&apos;s!
        </Button>
      </div>
    );
  }

  if (!puzzle) return null;

  const openSlots = Math.max(0, puzzle.rightCount - right.length);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 md:gap-3">
      <GameStepIndicator
        steps={["Setup", "Spielen", "Auswertung"]}
        current={1}
      />

      {/* Spielstand im Status-Platz der Hülle, damit keine eigene Zeile Höhe kostet. */}
      <GameBarSlot>
        <p className="text-ink dark:text-night-text text-xs font-bold tabular-nums md:text-sm">
          <span className="sr-only sm:not-sr-only">Runde </span>
          {roundIdx + 1}/{ROUND_LEN}
          <span className="text-dark dark:text-night-muted hidden sm:inline">
            {" "}
            · Streak: {firstTryStreak}
          </span>
        </p>
      </GameBarSlot>

      <div className="flex items-center justify-between gap-2">
        <p className="text-ink dark:text-night-text min-w-0 flex-1 text-xs font-bold md:text-sm">
          Aufgabe: Rechte Seite mit genau{" "}
          <span className="text-primary-ink dark:text-primary">
            {puzzle.rightCount}
          </span>{" "}
          Symbolen ausgleichen
        </p>
        <button
          type="button"
          onClick={goToSetup}
          aria-label="Zurück zum Setup"
          className={cn(
            "border-rule text-ink dark:border-night-rule dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-rule inline-flex min-h-11 shrink-0 items-center gap-1.5 border px-3 text-xs font-bold transition-colors motion-safe:active:scale-[0.98] md:gap-2",
            GAME_FOCUS_RING,
          )}
        >
          <Settings2 className="h-4 w-4" aria-hidden />
          Setup
        </button>
      </div>
      {puzzle.requiredRests != null && (
        <p className="text-primary-ink dark:text-primary text-[11px] font-bold md:text-xs">
          Challenge: genau {puzzle.rightCount - puzzle.requiredRests} Note(n) +{" "}
          {puzzle.requiredRests} Pause(n)
        </p>
      )}

      <div className={cn("shrink-0", WAAGE_HOEHE)}>
        <ScaleSVG
          diffUnits={diffUnits}
          balancedFlash={flashBalanced}
          openSlots={openSlots}
        />
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-1.5 md:gap-2">
        <NotePan title="Vorgegeben" notes={leftEntries} />
        <NotePan
          title="Deine Seite"
          notes={right}
          editable={!pendingAdvance}
          onRemoveAt={removeAt}
          slotCount={puzzle.rightCount}
          headerHint={`Noch ${openSlots} Symbol(e)`}
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 md:gap-2">
        <NotePalette
          ids={palette}
          onAdd={addNote}
          onRemoveLastOf={removeLastOf}
          disabled={pendingAdvance}
        />
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "shrink-0 text-xs md:text-sm",
            feedback
              ? "border-rule bg-rule/25 dark:border-night-rule dark:bg-night-raised border px-2.5 py-1.5 md:px-3 md:py-2"
              : "sr-only",
          )}
        >
          {feedback && (
            <p className="text-ink dark:text-night-text">{feedback}</p>
          )}
          {pendingAdvance && (
            <p className="text-primary-ink dark:text-primary mt-0.5 font-bold">
              Beide Seiten wiegen {unitsToBeatLabel(leftUnits)}
            </p>
          )}
        </div>
        <p className="text-dark dark:text-night-muted shrink-0 text-center text-[11px] font-semibold">
          Tipp: Tippe ein Symbol in deiner Schale an, um es zu entfernen —
          langes Drücken auf ein Palette-Feld entfernt die zuletzt gelegte
          gleiche Note.
        </p>
      </div>

      <GameDock>
        <div className="grid grid-cols-2 gap-1.5 md:gap-2">
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={pendingAdvance}
            onClick={submit}
          >
            Fertig
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            disabled={pendingAdvance}
            onClick={skip}
          >
            Überspringen
          </Button>
        </div>
      </GameDock>
    </div>
  );
}
