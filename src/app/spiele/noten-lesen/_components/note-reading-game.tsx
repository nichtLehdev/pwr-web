"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Music, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DIFFICULTY_LABELS,
  fixedLearningClef,
  hidesInstrumentForDifficulty,
  INSTRUMENTS,
  isChromaticDifficulty,
  STORAGE_INSTRUMENT_KEY,
  type ClefKind,
  type DifficultyId,
  type GameModeId,
  type InstrumentId,
  type WrittenPitch,
} from "../_lib/types";
import { clefForInstrument } from "../_lib/ranges";
import {
  answerLabelForPitch,
  labelsMatchAnswer,
  writtenPitchToMidi,
} from "../_lib/pitch";
import { buildAnswerLabels, pickRandomPitch } from "../_lib/note-generator";
import { describeWrittenNote } from "../_lib/staff-description";
import {
  desktopAnswerShortcutsActive,
  keyboardEventToOptionIndex,
  keyboardTargetAllowsShortcuts,
} from "../_lib/answer-keyboard";
import {
  randomAdvancedKeySpec,
  STAFF_LAYOUT_EXPLICIT,
  type StaffAccidentalLayout,
} from "../_lib/staff-accidental-layout";
import { InstrumentSelector } from "./instrument-selector";
import { StaffDisplay, type StaffFlash } from "./staff-display-loader";
import { AnswerButtons } from "./answer-buttons";
import { ScoreBar } from "./score-bar";
import { NoteReadingResultView, type NoteReadingResult } from "./result-view";

const NEXT_MS = 800;
const WRONG_MS = 1400;
const QUIZ_NOTE_SECONDS = 6;
const QUIZ_ROUND_LEN = 15;

type Phase = "setup" | "play" | "result";

function readStoredInstrument(): InstrumentId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_INSTRUMENT_KEY);
    if (!raw) return null;
    if (raw === "trumpet_bb") {
      try {
        localStorage.setItem(STORAGE_INSTRUMENT_KEY, "trumpet_c");
      } catch {
        /* ignore */
      }
      return "trumpet_c";
    }
    const ok = INSTRUMENTS.some((i) => i.id === raw);
    return ok ? (raw as InstrumentId) : null;
  } catch {
    return null;
  }
}

export function NoteReadingGame() {
  const [instrument, setInstrument] = useState<InstrumentId>("trumpet_c");
  const [mode, setMode] = useState<GameModeId>("learn");
  const [difficulty, setDifficulty] = useState<DifficultyId>("beginner");
  const [phase, setPhase] = useState<Phase>("setup");
  const [hydrated, setHydrated] = useState(false);

  const [pitch, setPitch] = useState<WrittenPitch | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const lastMidiRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<StaffFlash>("none");
  const [learnLine, setLearnLine] = useState<string | null>(null);
  const [answerLocked, setAnswerLocked] = useState(false);

  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizSecondsLeft, setQuizSecondsLeft] = useState<number | null>(null);

  const quizCorrectRef = useRef(0);
  const quizIndexRef = useRef(0);
  const bestStreakRoundRef = useRef(0);
  const streakRef = useRef(0);

  const [roundResult, setRoundResult] = useState<NoteReadingResult | null>(
    null,
  );
  const [setupOpen, setSetupOpen] = useState(false);
  const [staffAccidentalLayout, setStaffAccidentalLayout] =
    useState<StaffAccidentalLayout>(STAFF_LAYOUT_EXPLICIT);

  const timersRef = useRef<number[]>([]);
  const tickRafRef = useRef<number | null>(null);
  const quizDeadlineRef = useRef<number | null>(null);
  const pitchRef = useRef<WrittenPitch | null>(null);

  const instrumentClef = useMemo(
    () => clefForInstrument(instrument),
    [instrument],
  );
  const [playClef, setPlayClef] = useState<ClefKind>("treble");
  const learnClef = fixedLearningClef(difficulty);
  const clef =
    difficulty === "expert" || difficulty === "hardcore"
      ? playClef
      : (learnClef ?? instrumentClef);

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
    const stored = readStoredInstrument();
    queueMicrotask(() => {
      if (stored) setInstrument(stored);
      setHydrated(true);
    });
  }, []);

  const persistInstrument = useCallback((id: InstrumentId) => {
    setInstrument(id);
    try {
      localStorage.setItem(STORAGE_INSTRUMENT_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const spawnNote = useCallback(() => {
    let clefForNote: ClefKind = clefForInstrument(instrument);
    const learn = fixedLearningClef(difficulty);
    if (learn != null) {
      clefForNote = learn;
    } else if (difficulty === "expert") {
      clefForNote = Math.random() < 0.5 ? "treble" : "bass";
    } else if (difficulty === "hardcore") {
      const hardcoreClefs: ClefKind[] = ["treble", "alto", "tenor", "bass"];
      clefForNote =
        hardcoreClefs[Math.floor(Math.random() * hardcoreClefs.length)]!;
    }
    if (difficulty === "expert" || difficulty === "hardcore") {
      setPlayClef(clefForNote);
    }

    const p = pickRandomPitch(instrument, difficulty, lastMidiRef.current);
    lastMidiRef.current = writtenPitchToMidi(p);
    pitchRef.current = p;
    setPitch(p);
    if (isChromaticDifficulty(difficulty)) {
      setStaffAccidentalLayout(
        Math.random() < 0.5
          ? { kind: "keySignature", keySpec: randomAdvancedKeySpec() }
          : STAFF_LAYOUT_EXPLICIT,
      );
    } else {
      setStaffAccidentalLayout(STAFF_LAYOUT_EXPLICIT);
    }
    const n = isChromaticDifficulty(difficulty) ? 12 : 7;
    setOptions(buildAnswerLabels(p, instrument, difficulty, clefForNote, n));
    setFlash("none");
    setLearnLine(null);
    setAnswerLocked(false);
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
    setRoundResult({
      correct: quizCorrectRef.current,
      total: QUIZ_ROUND_LEN,
      bestStreakRound: bestStreakRoundRef.current,
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

  const handleTimeout = useCallback(() => {
    const p = pitchRef.current;
    if (!p || answerLocked) return;
    setAnswerLocked(true);
    setFlash("wrong");
    setStreak(0);
    streakRef.current = 0;
    setLearnLine(
      `Zeit abgelaufen — richtig wäre: ${answerLabelForPitch(p)}. ${describeWrittenNote(p, clef)}`,
    );
    advanceAfterAnswer(false);
  }, [answerLocked, clef, advanceAfterAnswer]);

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

  const startGame = useCallback(() => {
    clearTimers();
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

  const handleAnswer = useCallback(
    (label: string) => {
      if (phase !== "play" || !pitchRef.current || answerLocked) return;
      const p = pitchRef.current;
      const ok = labelsMatchAnswer(label, p);
      setAnswerLocked(true);
      quizDeadlineRef.current = null;

      if (ok) {
        setFlash("correct");
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
        if (mode === "learn") {
          setLearnLine(
            `Richtig: ${answerLabelForPitch(p)} — ${describeWrittenNote(p, clef)}`,
          );
        } else {
          setLearnLine(null);
        }
        advanceAfterAnswer(true);
      } else {
        setFlash("wrong");
        streakRef.current = 0;
        setStreak(0);
        setLearnLine(
          `Falsch — richtig: ${answerLabelForPitch(p)}. ${describeWrittenNote(p, clef)}`,
        );
        advanceAfterAnswer(false);
      }
    },
    [phase, answerLocked, clef, mode, advanceAfterAnswer],
  );

  useEffect(() => {
    if (phase !== "play" || setupOpen || answerLocked) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!desktopAnswerShortcutsActive()) return;
      if (!keyboardTargetAllowsShortcuts(e.target)) return;

      const idx = keyboardEventToOptionIndex(e, options.length);
      if (idx === null) return;

      const label = options[idx];
      if (label === undefined) return;

      e.preventDefault();
      handleAnswer(label);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [phase, setupOpen, answerLocked, options, handleAnswer]);

  const openSetup = useCallback(() => {
    clearTimers();
    setPhase("setup");
    setPitch(null);
    pitchRef.current = null;
  }, [clearTimers]);

  const insLabel = INSTRUMENTS.find((i) => i.id === instrument)?.shortLabel;
  const setupBarLabel = hidesInstrumentForDifficulty(difficulty)
    ? DIFFICULTY_LABELS[difficulty].title
    : insLabel;

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
              Noten lesen
            </h2>
            <p className="text-dark dark:text-dark-text-secondary mx-auto mt-2 max-w-lg text-sm md:text-base">
              Eine Note im richtigen Schlüssel — schnell den Tonnamen wählen.
              Geschriebene Tonhöhe (wie in der Stimme), ohne Audio.
            </p>
          </div>

          <InstrumentSelector
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
        <div className="flex flex-col gap-4 md:gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSetupOpen((o) => !o)}
              className="border-dark-border text-dark hover:bg-background-secondary dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-background inline-flex items-center gap-2 rounded-sm border px-3 py-2 text-sm font-bold"
            >
              <Settings2 className="h-4 w-4 shrink-0 stroke-[2]" aria-hidden />
              {setupBarLabel}
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
              <InstrumentSelector
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
          />

          {learnLine && (
            <p
              className="text-dark dark:text-dark-text-secondary border-dark-border/40 dark:border-dark-border dark:bg-dark-background/50 min-h-[2.75rem] rounded-sm border bg-white/60 px-3 py-2 text-sm leading-snug"
              aria-live="polite"
            >
              {learnLine}
            </p>
          )}

          <AnswerButtons
            labels={options}
            difficulty={difficulty}
            disabled={answerLocked}
            onPick={handleAnswer}
          />
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
          <NoteReadingResultView
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
