"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Music, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  StaffDisplay,
  type StaffFlash,
} from "../../noten-lesen/_components/staff-display";
import { ScoreBar } from "../../noten-lesen/_components/score-bar";
import type { GameModeId } from "../../noten-lesen/_lib/types";
import {
  answerLabelForPitch,
  writtenPitchToMidi,
} from "../../noten-lesen/_lib/pitch";
import { pitchKey } from "../../noten-lesen/_lib/ranges";
import type { WrittenPitch } from "../../noten-lesen/_lib/types";
import {
  randomAdvancedKeySpec,
  STAFF_LAYOUT_EXPLICIT,
  type StaffAccidentalLayout,
} from "../../noten-lesen/_lib/staff-accidental-layout";
import { griffeClef } from "../_lib/clef";
import {
  formatValveLabel,
  formatVariantDisplay,
  getRawFingeringEntry,
  isAnswerCorrect,
  isAnswerCorrectAdvancedAll,
  merkhilfeFor,
} from "../_lib/fingering-lookup";
import { pickRandomGriffePitch } from "../_lib/pick-pitch";
import {
  GRIFFE_DIFFICULTY_LABELS,
  GRIFFE_INSTRUMENTS,
  STORAGE_GRIFFE_INSTRUMENT_KEY,
  type GriffeDifficultyId,
  type GriffeInstrumentId,
} from "../_lib/types";
import { FingeringText } from "./fingering-text";
import { GriffeInstrumentSelector } from "./griffe-instrument-selector";
import { GriffeResultView, type GriffeRoundResult } from "./griffe-result-view";
import { SlideDiagram } from "./slide-diagram";
import { buildTromboneToken } from "./slide-diagram";
import { ValveDiagram } from "./valve-diagram";

const NEXT_MS = 800;
const WRONG_MS = 1500;
const QUIZ_NOTE_SECONDS = 6;
const QUIZ_ROUND_LEN = 15;

type Phase = "setup" | "play" | "result";

function readStoredInstrument(): GriffeInstrumentId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_GRIFFE_INSTRUMENT_KEY);
    if (!raw) return null;
    const ok = GRIFFE_INSTRUMENTS.some((i) => i.id === raw);
    return ok ? (raw as GriffeInstrumentId) : null;
  } catch {
    return null;
  }
}

function sortValveStrings(v: string[]): string[] {
  return [...v].sort((a, b) => Number(a) - Number(b));
}

function standardVariant(
  inst: GriffeInstrumentId,
  pitch: WrittenPitch,
): string[] | null {
  const raw = getRawFingeringEntry(inst, pitch);
  return raw?.variants[0] ?? null;
}

function allValidFingeringsLine(
  inst: GriffeInstrumentId,
  pitch: WrittenPitch,
): string {
  const raw = getRawFingeringEntry(inst, pitch);
  if (!raw) return "";
  return raw.variants.map((v) => formatVariantDisplay(inst, v)).join(", ");
}

export function FingeringGame() {
  const [instrument, setInstrument] = useState<GriffeInstrumentId>("trumpet_c");
  const [mode, setMode] = useState<GameModeId>("learn");
  const [difficulty, setDifficulty] = useState<GriffeDifficultyId>("beginner");
  const [phase, setPhase] = useState<Phase>("setup");
  const [hydrated, setHydrated] = useState(false);

  const [pitch, setPitch] = useState<WrittenPitch | null>(null);
  const lastMidiRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<StaffFlash>("none");
  const [diagramFlash, setDiagramFlash] = useState<StaffFlash>("none");
  const [learnLine, setLearnLine] = useState<string | null>(null);
  const [answerLocked, setAnswerLocked] = useState(false);

  const [valvePressed, setValvePressed] = useState<string[]>([]);
  const [slidePosition, setSlidePosition] = useState<number | null>(1);
  const [slideRegister, setSlideRegister] = useState<
    "high" | "neutral" | "low"
  >("neutral");
  const [slideQuart, setSlideQuart] = useState(false);
  const [forcedValves, setForcedValves] = useState<string[] | null>(null);
  const [forcedSlide, setForcedSlide] = useState<string | null>(null);

  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizSecondsLeft, setQuizSecondsLeft] = useState<number | null>(null);

  const quizCorrectRef = useRef(0);
  const quizIndexRef = useRef(0);
  const bestStreakRoundRef = useRef(0);
  const streakRef = useRef(0);
  const pitchRef = useRef<WrittenPitch | null>(null);
  const missedMapRef = useRef<Map<string, { label: string; count: number }>>(
    new Map(),
  );

  const [roundResult, setRoundResult] = useState<GriffeRoundResult | null>(
    null,
  );
  const [setupOpen, setSetupOpen] = useState(false);
  const [staffAccidentalLayout, setStaffAccidentalLayout] =
    useState<StaffAccidentalLayout>(STAFF_LAYOUT_EXPLICIT);

  const timersRef = useRef<number[]>([]);
  const tickRafRef = useRef<number | null>(null);
  const quizDeadlineRef = useRef<number | null>(null);
  const confirmValvesRef = useRef<() => void>(() => {});
  const confirmSlideRef = useRef<() => void>(() => {});

  const clef = useMemo(() => griffeClef(instrument), [instrument]);
  const inputKind = useMemo(
    () => GRIFFE_INSTRUMENTS.find((i) => i.id === instrument)?.inputKind,
    [instrument],
  );

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    if (tickRafRef.current != null) {
      cancelAnimationFrame(tickRafRef.current);
      tickRafRef.current = null;
    }
    quizDeadlineRef.current = null;
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    streakRef.current = streak;
  }, [streak]);

  useEffect(() => {
    pitchRef.current = pitch;
  }, [pitch]);

  useEffect(() => {
    if (!pitch) return;
    if (process.env.NODE_ENV === "production") return;
    // Debug: aktuell angezeigte Note als MIDI verfolgen.
    console.debug(
      "[Griffe] displayed note midi:",
      writtenPitchToMidi(pitch),
      pitch,
    );
  }, [pitch]);

  useEffect(() => {
    const stored = readStoredInstrument();
    queueMicrotask(() => {
      if (stored) setInstrument(stored);
      setHydrated(true);
    });
  }, []);

  const persistInstrument = useCallback((id: GriffeInstrumentId) => {
    setInstrument(id);
    try {
      localStorage.setItem(STORAGE_GRIFFE_INSTRUMENT_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const recordMiss = useCallback((p: WrittenPitch) => {
    const k = pitchKey(p);
    const m = missedMapRef.current;
    const cur = m.get(k) ?? { label: answerLabelForPitch(p), count: 0 };
    cur.count += 1;
    m.set(k, cur);
  }, []);

  const spawnNote = useCallback(() => {
    const p = pickRandomGriffePitch(
      instrument,
      difficulty,
      lastMidiRef.current,
    );
    lastMidiRef.current = writtenPitchToMidi(p);
    pitchRef.current = p;
    setPitch(p);
    if (difficulty === "advanced") {
      setStaffAccidentalLayout(
        Math.random() < 0.5
          ? { kind: "keySignature", keySpec: randomAdvancedKeySpec() }
          : STAFF_LAYOUT_EXPLICIT,
      );
    } else {
      setStaffAccidentalLayout(STAFF_LAYOUT_EXPLICIT);
    }
    setFlash("none");
    setDiagramFlash("none");
    setLearnLine(null);
    setAnswerLocked(false);
    setValvePressed([]);
    setSlidePosition(1);
    setSlideRegister("neutral");
    setSlideQuart(false);
    setForcedValves(null);
    setForcedSlide(null);
    if (mode === "quiz") {
      quizDeadlineRef.current = performance.now() + QUIZ_NOTE_SECONDS * 1000;
      setQuizSecondsLeft(QUIZ_NOTE_SECONDS);
    } else {
      quizDeadlineRef.current = null;
      setQuizSecondsLeft(null);
    }
  }, [instrument, difficulty, mode]);

  const goToQuizResult = useCallback(() => {
    clearTimers();
    const missedRows = [...missedMapRef.current.values()].filter(
      (r) => r.count > 0,
    );
    setRoundResult({
      correct: quizCorrectRef.current,
      total: QUIZ_ROUND_LEN,
      bestStreakRound: bestStreakRoundRef.current,
      missed: missedRows,
    });
    setPhase("result");
  }, [clearTimers]);

  const scheduleAfter = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  const advanceAfterAnswer = useCallback(
    (wasCorrect: boolean) => {
      const delay = wasCorrect ? NEXT_MS : WRONG_MS;
      if (mode === "quiz") {
        scheduleAfter(delay, () => {
          const nextIdx = quizIndexRef.current + 1;
          if (nextIdx >= QUIZ_ROUND_LEN) {
            goToQuizResult();
            return;
          }
          quizIndexRef.current = nextIdx;
          setQuizIndex(nextIdx);
          spawnNote();
        });
        return;
      }
      scheduleAfter(delay, () => {
        spawnNote();
      });
    },
    [mode, scheduleAfter, spawnNote, goToQuizResult],
  );

  const applyWrongReveal = useCallback(
    (p: WrittenPitch) => {
      const std = standardVariant(instrument, p);
      if (inputKind === "slide") {
        setForcedSlide(std?.[0] ?? null);
      } else {
        setForcedValves(std ? sortValveStrings(std) : null);
      }
    },
    [instrument, inputKind],
  );

  const clearWrongReveal = useCallback(() => {
    setForcedValves(null);
    setForcedSlide(null);
  }, []);

  const resolveAnswer = useCallback(
    (submitted: string[][], opts: { timeout?: boolean } = {}) => {
      const p = pitchRef.current;
      if (!p || answerLocked) return;
      const wasTimeout = Boolean(opts.timeout);
      setAnswerLocked(true);
      quizDeadlineRef.current = null;

      const okAdvanced =
        !wasTimeout &&
        difficulty === "advanced" &&
        isAnswerCorrectAdvancedAll(instrument, p, submitted);
      const okStd =
        !wasTimeout &&
        difficulty !== "advanced" &&
        isAnswerCorrect(instrument, p, difficulty, submitted);

      const ok = okAdvanced || okStd;

      if (ok) {
        setFlash("correct");
        setDiagramFlash("correct");
        clearWrongReveal();
        const nextStreak = streakRef.current + 1;
        streakRef.current = nextStreak;
        setStreak(nextStreak);
        setBestStreak((b) => Math.max(b, nextStreak));
        bestStreakRoundRef.current = Math.max(
          bestStreakRoundRef.current,
          nextStreak,
        );
        if (mode === "quiz") {
          quizCorrectRef.current += 1;
          setQuizCorrect(quizCorrectRef.current);
        }
        const sub = submitted[0] ?? [];
        const playerLabel = formatVariantDisplay(instrument, sub);
        if (mode === "learn") {
          const allV = allValidFingeringsLine(instrument, p);
          setLearnLine(
            difficulty === "advanced"
              ? `Richtig! — ${playerLabel}. Gültige Griffe: ${allV}`
              : allV
                ? `Richtig! — ${playerLabel}. Standard: ${allV}`
                : `Richtig! — ${playerLabel}.`,
          );
        } else if (difficulty === "advanced") {
          setLearnLine(`Richtig! — ${playerLabel}`);
        } else {
          setLearnLine(null);
        }
        advanceAfterAnswer(true);
        return;
      }

      setFlash("wrong");
      setDiagramFlash("wrong");
      streakRef.current = 0;
      setStreak(0);
      recordMiss(p);
      applyWrongReveal(p);

      const stdDisp = (() => {
        const std = standardVariant(instrument, p);
        return std ? formatVariantDisplay(instrument, std) : "?";
      })();
      const tip = merkhilfeFor(instrument, p);
      if (mode === "learn") {
        const allV = allValidFingeringsLine(instrument, p);
        setLearnLine(
          `Richtig wäre: ${stdDisp}${allV && difficulty === "advanced" ? ` (alle: ${allV})` : ""}. ${tip}${
            wasTimeout ? " Zeit abgelaufen." : ""
          }`,
        );
      } else {
        const allV = allValidFingeringsLine(instrument, p);
        setLearnLine(
          difficulty === "advanced" && allV
            ? `Richtig wäre: ${stdDisp} (alle: ${allV}). Merkhilfe: ${tip}`
            : `Richtig wäre: ${stdDisp}. Merkhilfe: ${tip}`,
        );
      }
      advanceAfterAnswer(false);
    },
    [
      answerLocked,
      advanceAfterAnswer,
      applyWrongReveal,
      clearWrongReveal,
      difficulty,
      instrument,
      mode,
      recordMiss,
    ],
  );

  const handleTimeout = useCallback(() => {
    if (answerLocked) return;
    resolveAnswer([[]], { timeout: true });
  }, [answerLocked, resolveAnswer]);

  useEffect(() => {
    if (
      phase !== "play" ||
      mode !== "quiz" ||
      !quizDeadlineRef.current ||
      answerLocked
    ) {
      if (tickRafRef.current != null) {
        cancelAnimationFrame(tickRafRef.current);
        tickRafRef.current = null;
      }
      return;
    }

    const tick = () => {
      const d = quizDeadlineRef.current;
      if (!d) {
        tickRafRef.current = null;
        return;
      }
      const left = Math.max(0, (d - performance.now()) / 1000);
      setQuizSecondsLeft(left);
      if (left <= 0) {
        quizDeadlineRef.current = null;
        if (tickRafRef.current != null) {
          cancelAnimationFrame(tickRafRef.current);
          tickRafRef.current = null;
        }
        handleTimeout();
        return;
      }
      tickRafRef.current = requestAnimationFrame(tick);
    };
    tickRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (tickRafRef.current != null) {
        cancelAnimationFrame(tickRafRef.current);
        tickRafRef.current = null;
      }
    };
  }, [phase, mode, pitch, answerLocked, handleTimeout]);

  const handleConfirmValves = useCallback(() => {
    if (answerLocked || inputKind === "slide") return;
    const sorted = sortValveStrings(valvePressed);
    resolveAnswer([sorted], {});
  }, [answerLocked, inputKind, resolveAnswer, valvePressed]);

  const handleSlideChange = useCallback(
    (next: {
      position: number;
      register: "high" | "neutral" | "low";
      quart: boolean;
    }) => {
      if (answerLocked || inputKind !== "slide") return;
      setSlidePosition(next.position);
      setSlideRegister(next.register);
      setSlideQuart(next.quart);
    },
    [answerLocked, inputKind],
  );

  const handleConfirmSlide = useCallback(() => {
    if (answerLocked || inputKind !== "slide") return;
    if (slidePosition == null) return;
    const token = buildTromboneToken({
      position: slidePosition,
      register: slideRegister,
      quart: slideQuart,
    });
    resolveAnswer([[token]], {});
  }, [
    answerLocked,
    inputKind,
    resolveAnswer,
    slidePosition,
    slideQuart,
    slideRegister,
  ]);

  useEffect(() => {
    confirmValvesRef.current = handleConfirmValves;
  }, [handleConfirmValves]);

  useEffect(() => {
    confirmSlideRef.current = handleConfirmSlide;
  }, [handleConfirmSlide]);

  const toggleValve = useCallback((n: number) => {
    const key = String(n);
    setValvePressed((prev) => {
      const set = new Set(prev);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return sortValveStrings([...set]);
    });
  }, []);

  useEffect(() => {
    if (phase !== "play" || answerLocked) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        t?.isContentEditable
      ) {
        return;
      }
      if (e.repeat) return;
      if (e.key === "Enter") {
        e.preventDefault();
        if (inputKind === "slide") {
          confirmSlideRef.current();
        } else {
          confirmValvesRef.current();
        }
        return;
      }
      if (inputKind === "slide") return;
      if (e.key === "1" || e.key === "2" || e.key === "3") {
        e.preventDefault();
        toggleValve(Number(e.key));
        return;
      }
      if (inputKind === "valves4" && e.key === "4") {
        e.preventDefault();
        toggleValve(4);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [phase, inputKind, answerLocked, toggleValve]);

  const startGame = useCallback(() => {
    clearTimers();
    missedMapRef.current = new Map();
    setPhase("play");
    setStreak(0);
    streakRef.current = 0;
    setQuizIndex(0);
    quizIndexRef.current = 0;
    setQuizCorrect(0);
    quizCorrectRef.current = 0;
    bestStreakRoundRef.current = 0;
    lastMidiRef.current = null;
    spawnNote();
  }, [clearTimers, spawnNote]);

  const openSetup = useCallback(() => {
    clearTimers();
    setPhase("setup");
    setPitch(null);
    pitchRef.current = null;
  }, [clearTimers]);

  const valveCount = inputKind === "valves4" ? 4 : 3;
  const liveValveLabel =
    valvePressed.length === 0 ? "offen" : formatValveLabel(valvePressed);
  const liveSlideLabel = (() => {
    if (slidePosition == null) return "—";
    const token = buildTromboneToken({
      position: slidePosition,
      register: slideRegister,
      quart: slideQuart,
    });
    return formatVariantDisplay(instrument, [token]);
  })();

  const insShort = GRIFFE_INSTRUMENTS.find(
    (i) => i.id === instrument,
  )?.shortLabel;

  if (!hydrated) {
    return (
      <div className="text-dark dark:text-dark-text-muted py-16 text-center text-sm">
        Lädt …
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 md:gap-6">
      <div
        className={cn(
          "border-dark-border/40 dark:border-dark-border/60 border-b pb-3 md:pb-4",
          "md:relative md:ml-[calc(50%-50vw)] md:w-screen md:max-w-[100vw]",
        )}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-center gap-1.5 md:gap-2">
          {["Setup", "Spielen", "Auswertung"].map((label, i) => {
            const step = phase === "setup" ? 0 : phase === "play" ? 1 : 2;
            return (
              <div
                key={label}
                className={cn(
                  "rounded-sm px-2.5 py-1 text-[10px] font-bold tracking-wide transition-colors md:px-3 md:text-xs",
                  i === step
                    ? "bg-primary text-white"
                    : i < step
                      ? "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
                      : "text-dark/55 dark:text-dark-text-muted bg-transparent",
                )}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>

      {phase === "setup" && (
        <div className="space-y-5 md:space-y-6">
          <div className="text-center">
            <Music
              className="text-primary mx-auto h-11 w-11 stroke-[1.45] md:h-16 md:w-16 md:stroke-[1.35]"
              aria-hidden
            />
            <h2 className="text-dark dark:text-dark-text mt-2 text-xl font-black tracking-tight md:mt-3 md:text-3xl">
              Griffe
            </h2>
            <p className="text-dark dark:text-dark-text-secondary mx-auto mt-2 max-w-lg text-sm md:text-base">
              Note lesen — Ventile oder Zug wählen. Sofortiges Feedback,
              Merkhilfen und Modi wie beim Noten-Lesen.
            </p>
          </div>

          <GriffeInstrumentSelector
            instrument={instrument}
            mode={mode}
            difficulty={difficulty}
            onInstrument={persistInstrument}
            onMode={setMode}
            onDifficulty={setDifficulty}
          />

          <button
            type="button"
            className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark w-full rounded-sm px-4 py-4 text-lg font-black text-white transition active:scale-[0.99] md:text-xl"
            onClick={startGame}
          >
            Los geht&apos;s!
          </button>
        </div>
      )}

      {phase === "play" && pitch && (
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-3 md:min-h-[min(100dvh-8rem,920px)] md:gap-4",
            "max-h-[100dvh] overflow-hidden md:max-h-none",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSetupOpen((o) => !o)}
              className="border-dark-border text-dark hover:bg-background-secondary dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-background inline-flex items-center gap-2 rounded-sm border px-3 py-2 text-sm font-bold"
            >
              <Settings2 className="h-4 w-4 shrink-0 stroke-[2]" aria-hidden />
              {insShort}
              {" · "}
              {GRIFFE_DIFFICULTY_LABELS[difficulty].title}
              {" · "}
              {mode === "learn"
                ? "Lernen"
                : mode === "quiz"
                  ? "Quiz"
                  : "Endlos"}
              <ChevronDown
                className={cn("h-4 w-4 transition", setupOpen && "rotate-180")}
                aria-hidden
              />
            </button>
            <button
              type="button"
              onClick={openSetup}
              className="text-dark dark:text-dark-text-muted text-xs font-bold underline-offset-2 hover:underline"
            >
              Zurück zum Setup
            </button>
          </div>

          {setupOpen && (
            <div className="border-dark-border/60 dark:border-dark-border dark:bg-dark-surface/40 rounded-sm border bg-white/50 p-4">
              <GriffeInstrumentSelector
                instrument={instrument}
                mode={mode}
                difficulty={difficulty}
                onInstrument={persistInstrument}
                onMode={setMode}
                onDifficulty={setDifficulty}
              />
              <button
                type="button"
                className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark mt-4 w-full rounded-sm py-3 text-sm font-black text-white"
                onClick={() => {
                  setSetupOpen(false);
                  lastMidiRef.current = null;
                  clearTimers();
                  spawnNote();
                }}
              >
                Übernehmen &amp; weiter
              </button>
            </div>
          )}

          <ScoreBar
            mode={mode}
            streak={streak}
            bestStreak={bestStreak}
            quizCorrect={mode === "quiz" ? quizCorrect : undefined}
            quizIndex={mode === "quiz" ? quizIndex : undefined}
            quizTotal={mode === "quiz" ? QUIZ_ROUND_LEN : undefined}
            secondsLeft={mode === "quiz" ? quizSecondsLeft : null}
          />

          <StaffDisplay
            clef={clef}
            pitch={pitch}
            staffAccidentalLayout={staffAccidentalLayout}
            flash={flash}
            className="shrink-0"
          />

          {learnLine && (
            <p
              className="text-dark dark:text-dark-text-secondary border-dark-border/40 dark:border-dark-border dark:bg-dark-background/50 max-h-[20vh] shrink-0 overflow-y-auto rounded-sm border bg-white/60 px-3 py-2 text-sm leading-snug"
              aria-live="polite"
            >
              {learnLine}
            </p>
          )}

          <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 pb-1">
            {inputKind === "slide" ? (
              <>
                <SlideDiagram
                  position={slidePosition}
                  register={slideRegister}
                  quart={slideQuart}
                  forcedToken={forcedSlide}
                  onChange={handleSlideChange}
                  disabled={answerLocked}
                  flash={diagramFlash}
                />
                <FingeringText label={liveSlideLabel} />
                <button
                  type="button"
                  disabled={answerLocked || slidePosition == null}
                  onClick={handleConfirmSlide}
                  className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark w-full rounded-sm py-4 text-lg font-black text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Antwort bestätigen
                </button>
              </>
            ) : (
              <>
                <ValveDiagram
                  valveCount={valveCount}
                  pressed={valvePressed}
                  forcedPressed={forcedValves}
                  onToggle={toggleValve}
                  disabled={answerLocked}
                  flash={diagramFlash}
                />
                <FingeringText label={liveValveLabel} />
                <button
                  type="button"
                  disabled={answerLocked}
                  onClick={handleConfirmValves}
                  className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark w-full rounded-sm py-4 text-lg font-black text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Antwort bestätigen
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {phase === "result" && roundResult && (
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <Music
              className="text-primary mx-auto h-10 w-10 stroke-[1.4]"
              aria-hidden
            />
            <p className="text-dark dark:text-dark-text mt-2 text-lg font-black">
              Runde zu Ende
            </p>
          </div>
          <GriffeResultView
            result={roundResult}
            onRetry={() => {
              setRoundResult(null);
              startGame();
            }}
            onChangeSetup={openSetup}
          />
        </div>
      )}
    </div>
  );
}
