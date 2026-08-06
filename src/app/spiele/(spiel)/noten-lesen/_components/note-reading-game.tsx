"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Music, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { Button } from "@/app/_components/ui/button";
import { NoteSetLibrary } from "../../../_components/note-set-library";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
import { toNoteSetSummary, type NoteSetSummary } from "../../../_lib/note-sets";
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_ORDER,
  fixedLearningClef,
  hidesInstrumentForDifficulty,
  INSTRUMENTS,
  isChromaticDifficulty,
  STORAGE_INSTRUMENT_KEY,
  STORAGE_SETTINGS_KEY,
  type ClefKind,
  type DifficultyId,
  type GameModeId,
  type InstrumentId,
  type WrittenPitch,
} from "../_lib/types";
import { clefForInstrument, pitchKey } from "../_lib/ranges";
import {
  answerLabelForPitch,
  labelsMatchAnswer,
  writtenPitchToMidi,
} from "../_lib/pitch";
import {
  answerLayoutForPitches,
  buildAnswerLabels,
  buildAnswerLabelsForLayout,
  pickPitchFromPool,
  pickRandomPitch,
  recordCorrect,
  recordMiss,
  type AnswerLayout,
  type MissTracker,
} from "../_lib/note-generator";
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
import { GameStepIndicator } from "../../../_components/game-step-indicator";
import { useGameStats } from "../../../_lib/stats/use-game-stats";
import { InstrumentSelector } from "./instrument-selector";
import { StaffDisplay, type StaffFlash } from "./staff-display-loader";
import { AnswerButtons } from "./answer-buttons";
import { ScoreBar } from "./score-bar";
import {
  NoteReadingResultView,
  type MissedNote,
  type NoteReadingResult,
} from "./result-view";

const NEXT_MS = 800;
/** Quiz: kurze Fehleranzeige, der Timer treibt das Tempo. */
const WRONG_MS = 1400;
/** Endlos: mehr Zeit, die Erklärung zur falschen Antwort zu lesen. */
const ENDLESS_WRONG_MS = 2600;
/** Quiz: Sekunden pro Note — mehr Zeit für die Wechsel-Schlüssel-Stufen. */
const QUIZ_NOTE_SECONDS: Record<DifficultyId, number> = {
  beginner: 6,
  intermediate: 6,
  alto_beginner: 6,
  alto_intermediate: 6,
  tenor_beginner: 6,
  tenor_intermediate: 6,
  advanced: 6,
  expert: 8,
  hardcore: 8,
};
/** Eigenes Set: fester Wert — Pools sind beliebig, 8 s tragen auch 12er-Raster. */
const CUSTOM_QUIZ_NOTE_SECONDS = 8;
const QUIZ_ROUND_LEN = 15;

type Phase = "setup" | "play" | "result";

/** Persistierter Verweis auf ein eigenes Set (Name nur für die „Lädt …“-Kachel). */
type StoredCustomSet = { publicId: string; name: string };

type StoredSettings = {
  instrument: InstrumentId;
  mode: GameModeId;
  /** Preset-Stufe; bei aktivem eigenem Set steht im Blob "custom". */
  difficulty: DifficultyId;
  customSet: StoredCustomSet;
};

/** Noch nicht aufgelöstes Set (aus Blob oder Deep-Link `?set=`). */
type PendingCustomSet = {
  publicId: string;
  name: string | null;
  fromLink: boolean;
};

function isInstrumentId(v: unknown): v is InstrumentId {
  return typeof v === "string" && INSTRUMENTS.some((i) => i.id === v);
}

function isGameModeId(v: unknown): v is GameModeId {
  return v === "learn" || v === "quiz" || v === "endless";
}

function isDifficultyId(v: unknown): v is DifficultyId {
  return typeof v === "string" && DIFFICULTY_ORDER.includes(v as DifficultyId);
}

/** Defensiv: `customSet` aus dem Blob nur mit brauchbaren Strings übernehmen. */
function parseStoredCustomSet(raw: unknown): StoredCustomSet | null {
  if (!raw || typeof raw !== "object") return null;
  const { publicId, name } = raw as Record<string, unknown>;
  if (typeof publicId !== "string" || publicId.trim() === "") return null;
  return {
    publicId: publicId.trim(),
    name: typeof name === "string" ? name : "",
  };
}

/**
 * Einstellungen als ein JSON-Blob; migriert den alten Instrument-Key
 * (inkl. dessen trumpet_bb → trumpet_c Migration). Alte Blobs ohne
 * `customSet`/"custom" bleiben gültig.
 */
function readStoredSettings(): Partial<StoredSettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};
      const o = parsed as Record<string, unknown>;
      const out: Partial<StoredSettings> = {};
      const ins = o.instrument === "trumpet_bb" ? "trumpet_c" : o.instrument;
      if (isInstrumentId(ins)) out.instrument = ins;
      if (isGameModeId(o.mode)) out.mode = o.mode;
      if (isDifficultyId(o.difficulty)) out.difficulty = o.difficulty;
      if (o.difficulty === "custom") {
        const customSet = parseStoredCustomSet(o.customSet);
        if (customSet) out.customSet = customSet;
      }
      return out;
    }
    const legacy = localStorage.getItem(STORAGE_INSTRUMENT_KEY);
    if (!legacy) return {};
    const migrated = legacy === "trumpet_bb" ? "trumpet_c" : legacy;
    return isInstrumentId(migrated) ? { instrument: migrated } : {};
  } catch {
    return {};
  }
}

export function NoteReadingGame() {
  const { aggregates, recordResult } = useGameStats("noten-lesen");
  const [instrument, setInstrument] = useState<InstrumentId>("trumpet_c");
  const [mode, setMode] = useState<GameModeId>("learn");
  /* Bleibt auch bei aktivem eigenem Set die zuletzt gewählte Preset-Stufe —
   * „Entfernen“ fällt genau dorthin zurück. */
  const [difficulty, setDifficulty] = useState<DifficultyId>("beginner");
  const [phase, setPhase] = useState<Phase>("setup");
  const [hydrated, setHydrated] = useState(false);

  /** Aktives eigenes Notenset (Custom-Schwierigkeit). */
  const [customSet, setCustomSet] = useState<NoteSetSummary | null>(null);
  /** Persistiertes/verlinktes Set, das noch per byPublicId aufgelöst wird. */
  const [pendingSet, setPendingSet] = useState<PendingCustomSet | null>(null);
  const [customNotice, setCustomNotice] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const [pitch, setPitch] = useState<WrittenPitch | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const lastMidiRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<StaffFlash>("none");
  const [learnLine, setLearnLine] = useState<string | null>(null);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [awaitingNext, setAwaitingNext] = useState(false);
  const awaitingNextRef = useRef(false);

  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizSecondsLeft, setQuizSecondsLeft] = useState<number | null>(null);

  const quizCorrectRef = useRef(0);
  const quizIndexRef = useRef(0);
  const bestStreakRoundRef = useRef(0);
  const streakRef = useRef(0);
  /** Nur neu rendern, wenn sich die angezeigte Zehntelsekunde ändert. */
  const lastShownTenthRef = useRef<number | null>(null);
  /** Session-Adaptivität: verfehlte Töne öfter ziehen (siehe MissTracker). */
  const missTrackerRef = useRef<MissTracker>(new Map());
  /** Im Quiz verpasste Noten für die Auswertung (dedupliziert). */
  const missedNotesRef = useRef<Map<string, MissedNote>>(new Map());

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
  /* Eigenes Set: dessen Schlüssel schlägt den instrumentabhängigen. */
  const clef: ClefKind = customSet
    ? customSet.clef
    : difficulty === "expert" || difficulty === "hardcore"
      ? playClef
      : (learnClef ?? instrumentClef);

  /* Eigenes Set: 12er-Raster, sobald irgendein Ton ein Vorzeichen trägt. */
  const answerLayout: AnswerLayout = customSet
    ? answerLayoutForPitches(customSet.pitches)
    : isChromaticDifficulty(difficulty)
      ? "chromatic"
      : "diatonic";

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
    const stored = readStoredSettings();

    /* Deep-Link `?set=CODE` bewusst ohne useSearchParams lesen (keine
     * Suspense-Boundary nötig); Param sofort entfernen, damit ein Reload
     * die Aktivierung nicht erneut auslöst. */
    let pending: PendingCustomSet | null = null;
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("set");
      if (code != null) {
        const trimmed = code.trim();
        if (trimmed !== "") {
          pending = { publicId: trimmed, name: null, fromLink: true };
        }
        params.delete("set");
        const qs = params.toString();
        window.history.replaceState(
          null,
          "",
          window.location.pathname +
            (qs ? `?${qs}` : "") +
            window.location.hash,
        );
      }
    } catch {
      /* ignore */
    }
    if (!pending && stored.customSet) {
      pending = {
        publicId: stored.customSet.publicId,
        name: stored.customSet.name,
        fromLink: false,
      };
    }

    queueMicrotask(() => {
      if (stored.instrument) setInstrument(stored.instrument);
      if (stored.mode) setMode(stored.mode);
      if (stored.difficulty) setDifficulty(stored.difficulty);
      if (pending) setPendingSet(pending);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    /* Solange ein Set aufgelöst wird, nichts schreiben — sonst würde der
     * gespeicherte customSet-Verweis vorzeitig überschrieben. */
    if (pendingSet) return;
    try {
      localStorage.setItem(
        STORAGE_SETTINGS_KEY,
        JSON.stringify({
          instrument,
          mode,
          difficulty: customSet ? "custom" : difficulty,
          ...(customSet
            ? {
                customSet: {
                  publicId: customSet.publicId,
                  name: customSet.name,
                },
              }
            : {}),
        }),
      );
      localStorage.removeItem(STORAGE_INSTRUMENT_KEY);
    } catch {
      /* ignore */
    }
  }, [hydrated, instrument, mode, difficulty, customSet, pendingSet]);

  /* Persistiertes oder verlinktes Set auflösen; NOT_FOUND fällt mit Hinweis
   * auf die Preset-Stufe zurück. */
  const pendingQuery = api.noteSets.byPublicId.useQuery(
    { publicId: pendingSet?.publicId ?? "" },
    {
      enabled: pendingSet != null,
      retry: (failureCount, error) => {
        const code = error.data?.code;
        if (code === "NOT_FOUND" || code === "BAD_REQUEST") return false;
        return failureCount < 2;
      },
    },
  );
  const recordUse = api.noteSets.recordUse.useMutation();
  const recordUseMutate = recordUse.mutate;

  useEffect(() => {
    if (!pendingSet) return;
    if (pendingQuery.data) {
      const summary = toNoteSetSummary(pendingQuery.data);
      if (summary && summary.pitches.length >= 2) {
        setCustomSet(summary);
        setCustomNotice(null);
        /* Nur beim Deep-Link zählen — die Bibliothek zählt selbst. */
        if (pendingSet.fromLink) {
          recordUseMutate({ publicId: summary.publicId });
        }
      } else {
        setCustomNotice(
          pendingSet.fromLink
            ? "Dieses Notenset wurde nicht gefunden."
            : "Das gespeicherte Set gibt es nicht mehr.",
        );
      }
      setPendingSet(null);
      return;
    }
    if (pendingQuery.isError) {
      const code = pendingQuery.error.data?.code;
      const gone = code === "NOT_FOUND" || code === "BAD_REQUEST";
      setCustomNotice(
        gone
          ? pendingSet.fromLink
            ? "Dieses Notenset wurde nicht gefunden."
            : "Das gespeicherte Set gibt es nicht mehr."
          : "Das Notenset konnte nicht geladen werden.",
      );
      setPendingSet(null);
    }
  }, [
    pendingSet,
    pendingQuery.data,
    pendingQuery.isError,
    pendingQuery.error,
    recordUseMutate,
  ]);

  /* VexFlow-Chunk + Notenfonts schon im Setup laden, damit die erste
   * Quiz-Frage nicht 1–3 s ihres Zeitbudgets ans Chunk-Laden verliert. */
  useEffect(() => {
    if (phase !== "setup") return;
    void import("./staff-display").then((m) => m.preloadStaffFonts());
  }, [phase]);

  const spawnNote = useCallback(() => {
    let p: WrittenPitch;
    if (customSet) {
      /* Eigenes Set: Pool und Schlüssel kommen aus dem Set; Vorzeichen
       * immer explizit an der Note (keine zufälligen Tonarten). */
      p = pickPitchFromPool(customSet.pitches, lastMidiRef.current, {
        missCounts: missTrackerRef.current,
      });
      setStaffAccidentalLayout(STAFF_LAYOUT_EXPLICIT);
      setOptions(
        buildAnswerLabelsForLayout(
          p,
          answerLayoutForPitches(customSet.pitches),
        ),
      );
    } else {
      /* Schlüssel ZUERST ziehen — der Ton kommt dann aus dem (bei
       * Experte/Hardcore geklemmten) Pool dieses Schlüssels. */
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

      p = pickRandomPitch(instrument, difficulty, lastMidiRef.current, {
        clef: clefForNote,
        missCounts: missTrackerRef.current,
      });
      if (isChromaticDifficulty(difficulty)) {
        setStaffAccidentalLayout(
          Math.random() < 0.5
            ? { kind: "keySignature", keySpec: randomAdvancedKeySpec() }
            : STAFF_LAYOUT_EXPLICIT,
        );
      } else {
        setStaffAccidentalLayout(STAFF_LAYOUT_EXPLICIT);
      }
      setOptions(buildAnswerLabels(p, difficulty));
    }
    lastMidiRef.current = writtenPitchToMidi(p);
    pitchRef.current = p;
    setPitch(p);
    setFlash("none");
    setLearnLine(null);
    setPicked(null);
    setAnswerLocked(false);
    setAwaitingNext(false);
    awaitingNextRef.current = false;
    if (mode === "quiz") {
      const secs = customSet
        ? CUSTOM_QUIZ_NOTE_SECONDS
        : QUIZ_NOTE_SECONDS[difficulty];
      quizDeadlineRef.current = performance.now() + secs * 1000;
      lastShownTenthRef.current = secs * 10;
      setQuizSecondsLeft(secs);
    } else {
      quizDeadlineRef.current = null;
      setQuizSecondsLeft(null);
    }
  }, [instrument, difficulty, mode, customSet]);

  const goToQuizResult = useCallback(() => {
    clearTimers();
    setRoundResult({
      correct: quizCorrectRef.current,
      total: QUIZ_ROUND_LEN,
      bestStreakRound: bestStreakRoundRef.current,
      missed: [...missedNotesRef.current.values()],
    });
    recordResult({
      score: quizCorrectRef.current,
      maxScore: QUIZ_ROUND_LEN,
      streak: bestStreakRoundRef.current,
      meta: { instrument, difficulty, mode },
    });
    setPhase("result");
  }, [clearTimers, recordResult, instrument, difficulty, mode]);

  const scheduleAfter = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  const advanceAfterAnswer = useCallback(
    (wasCorrect: boolean) => {
      if (mode === "learn") {
        /* Lernen: Note + Erklärung bleiben stehen, bis „Weiter“ kommt. */
        awaitingNextRef.current = true;
        setAwaitingNext(true);
        return;
      }

      if (mode === "quiz") {
        scheduleAfter(wasCorrect ? NEXT_MS : WRONG_MS, () => {
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

      scheduleAfter(wasCorrect ? NEXT_MS : ENDLESS_WRONG_MS, () => {
        spawnNote();
      });
    },
    [mode, scheduleAfter, spawnNote, goToQuizResult],
  );

  const recordQuizMiss = useCallback(
    (p: WrittenPitch, clefForNote: ClefKind) => {
      const label = answerLabelForPitch(p);
      const description = describeWrittenNote(p, clefForNote);
      missedNotesRef.current.set(`${label}|${description}`, {
        label,
        description,
      });
    },
    [],
  );

  const handleTimeout = useCallback(() => {
    const p = pitchRef.current;
    if (!p || answerLocked) return;
    setAnswerLocked(true);
    setFlash("wrong");
    setStreak(0);
    streakRef.current = 0;
    recordMiss(missTrackerRef.current, pitchKey(p));
    if (mode === "quiz") recordQuizMiss(p, clef);
    setLearnLine(
      `Zeit abgelaufen — richtig wäre: ${answerLabelForPitch(p)}. ${describeWrittenNote(p, clef)}`,
    );
    advanceAfterAnswer(false);
  }, [answerLocked, clef, mode, recordQuizMiss, advanceAfterAnswer]);

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
      /* State nur setzen, wenn sich die angezeigte Zehntelsekunde ändert —
       * sonst rendert der ganze Baum mit 60 fps. */
      const tenth = Math.ceil(left * 10);
      if (tenth !== lastShownTenthRef.current) {
        lastShownTenthRef.current = tenth;
        setQuizSecondsLeft(left);
      }
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
    missedNotesRef.current = new Map();
    spawnNote();
  }, [clearTimers, spawnNote]);

  const handleAnswer = useCallback(
    (label: string) => {
      if (phase !== "play" || !pitchRef.current || answerLocked) return;
      const p = pitchRef.current;
      const ok = labelsMatchAnswer(label, p);
      setAnswerLocked(true);
      setPicked(label);
      quizDeadlineRef.current = null;

      if (ok) {
        setFlash("correct");
        recordCorrect(missTrackerRef.current, pitchKey(p));
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
        recordMiss(missTrackerRef.current, pitchKey(p));
        if (mode === "quiz") recordQuizMiss(p, clef);
        setLearnLine(
          `Falsch — richtig: ${answerLabelForPitch(p)}. ${describeWrittenNote(p, clef)}`,
        );
        advanceAfterAnswer(false);
      }
    },
    [phase, answerLocked, clef, mode, recordQuizMiss, advanceAfterAnswer],
  );

  /** Lernen: expliziter „Weiter“-Schritt (Button, Enter oder Leertaste). */
  const handleLearnNext = useCallback(() => {
    if (!awaitingNextRef.current) return;
    awaitingNextRef.current = false;
    setAwaitingNext(false);
    spawnNote();
  }, [spawnNote]);

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

  /* Lernen: Enter/Leertaste für „Weiter“ — Antwort-Eingabe ist zu diesem
   * Zeitpunkt gesperrt, es gibt also keine Tastenkollision. */
  useEffect(() => {
    if (phase !== "play" || mode !== "learn" || !awaitingNext || setupOpen)
      return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!keyboardTargetAllowsShortcuts(e.target)) return;
      /* Fokussierte Buttons/Links behalten ihre native Enter-/Leertaste
       * (der „Weiter“-Button selbst löst über seinen Click aus). */
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "BUTTON" || tag === "A") return;
      }
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      handleLearnNext();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [phase, mode, awaitingNext, setupOpen, handleLearnNext]);

  const openSetup = useCallback(() => {
    clearTimers();
    setPhase("setup");
    setPitch(null);
    pitchRef.current = null;
  }, [clearTimers]);

  /** Preset-Kachel gewählt → eigenes Set (auch ein noch ladendes) verwerfen. */
  const handleDifficulty = useCallback((d: DifficultyId) => {
    setDifficulty(d);
    setCustomSet(null);
    setPendingSet(null);
    setCustomNotice(null);
  }, []);

  /** „Entfernen“: zurück zur zuletzt gewählten Preset-Stufe. */
  const handleRemoveCustomSet = useCallback(() => {
    setCustomSet(null);
    setPendingSet(null);
    setCustomNotice(null);
  }, []);

  const handleUseCustomSet = useCallback((set: NoteSetSummary) => {
    /* toNoteSetSummary lässt leere Sets nie durch — < 2 trotzdem abfangen. */
    if (set.pitches.length < 2) {
      setCustomNotice("Dieses Set hat zu wenige Noten (mindestens 2).");
      return;
    }
    setCustomSet(set);
    setPendingSet(null);
    setCustomNotice(null);
  }, []);

  const insLabel = INSTRUMENTS.find((i) => i.id === instrument)?.shortLabel;
  const setupBarLabel = customSet
    ? customSet.name
    : hidesInstrumentForDifficulty(difficulty)
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
      <GameStepIndicator
        steps={["Setup", "Spielen", "Auswertung"]}
        current={phase === "setup" ? 0 : phase === "play" ? 1 : 2}
      />

      {phase === "setup" && (
        <div className="space-y-5 md:space-y-6">
          <div className="text-center">
            <Music
              className="text-primary mx-auto h-11 w-11 stroke-[1.45] md:h-16 md:w-16 md:stroke-[1.35]"
              aria-hidden
            />
            <h2 className="text-dark dark:text-dark-text mt-2 text-xl font-bold tracking-tight md:mt-3 md:text-3xl">
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
            customSet={
              customSet
                ? { name: customSet.name, noteCount: customSet.pitches.length }
                : null
            }
            customPending={pendingSet ? { name: pendingSet.name } : null}
            customNotice={customNotice}
            onInstrument={setInstrument}
            onMode={setMode}
            onDifficulty={handleDifficulty}
            onOpenLibrary={() => setLibraryOpen(true)}
            onRemoveCustomSet={handleRemoveCustomSet}
          />

          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={startGame}
          >
            Los geht&apos;s!
          </Button>
        </div>
      )}

      {phase === "play" && pitch && (
        <div className="flex flex-col gap-4 md:gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSetupOpen((o) => !o)}
              className={cn(
                "border-dark-border text-dark hover:bg-background-secondary dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-background inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition active:scale-[0.98]",
                GAME_FOCUS_RING,
              )}
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
              className={cn(
                "text-dark dark:text-dark-text-muted rounded-lg text-xs font-bold underline-offset-2 hover:underline active:opacity-70",
                GAME_FOCUS_RING,
              )}
            >
              Zurück zum Setup
            </button>
          </div>

          {setupOpen && (
            <div className="border-dark-border/60 dark:border-dark-border dark:bg-dark-surface/40 rounded-lg border bg-white/50 p-4">
              <InstrumentSelector
                instrument={instrument}
                mode={mode}
                difficulty={difficulty}
                customSet={
                  customSet
                    ? {
                        name: customSet.name,
                        noteCount: customSet.pitches.length,
                      }
                    : null
                }
                customPending={pendingSet ? { name: pendingSet.name } : null}
                customNotice={customNotice}
                onInstrument={setInstrument}
                onMode={setMode}
                onDifficulty={handleDifficulty}
                onOpenLibrary={() => setLibraryOpen(true)}
                onRemoveCustomSet={handleRemoveCustomSet}
              />
              <Button
                type="button"
                size="md"
                className="mt-4 w-full"
                onClick={() => {
                  setSetupOpen(false);
                  lastMidiRef.current = null;
                  /* Geänderte Einstellungen = neue Aufgabe → Serie neu. */
                  setStreak(0);
                  streakRef.current = 0;
                  clearTimers();
                  spawnNote();
                }}
              >
                Übernehmen &amp; weiter
              </Button>
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

          <div className="relative">
            <StaffDisplay
              clef={clef}
              pitch={pitch}
              staffAccidentalLayout={staffAccidentalLayout}
              flash={flash}
              /* Positionsbeschreibung statt Tonname — das Standard-Label
               * würde die Antwort verraten. */
              ariaLabel={`Notensystem — ${describeWrittenNote(pitch, clef)}`}
            />
            {/* Nicht nur Farbe: Icon + Text zum Flash (Farbenblindheit). */}
            {flash !== "none" && (
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute top-2 right-2 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-white",
                  flash === "correct" ? "bg-emerald-600" : "bg-rose-600",
                )}
              >
                {flash === "correct" ? (
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                ) : (
                  <X className="h-3.5 w-3.5 stroke-[3]" />
                )}
                {flash === "correct" ? "Richtig!" : "Falsch"}
              </div>
            )}
          </div>

          {/* Fester Slot (auch als aria-live-Region dauerhaft gemountet),
           * damit die Antwort-Buttons beim Feedback nicht springen. */}
          <p
            aria-live="polite"
            className={cn(
              "min-h-[2.75rem] rounded-lg border px-3 py-2 text-sm leading-snug",
              learnLine
                ? "text-dark dark:text-dark-text-secondary border-dark-border/40 dark:border-dark-border dark:bg-dark-background/50 bg-white/60"
                : "border-transparent",
            )}
          >
            {learnLine}
          </p>

          {mode === "learn" && (
            <div className="min-h-[3.25rem]">
              {awaitingNext && (
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  onClick={handleLearnNext}
                >
                  Weiter
                  <span className="ml-2 hidden text-xs font-bold opacity-80 md:inline">
                    (Enter oder Leertaste)
                  </span>
                </Button>
              )}
            </div>
          )}

          <AnswerButtons
            labels={options}
            layout={answerLayout}
            disabled={answerLocked}
            onPick={handleAnswer}
            pickedLabel={answerLocked ? picked : null}
            correctLabel={answerLocked ? answerLabelForPitch(pitch) : null}
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
            <p className="text-dark dark:text-dark-text mt-2 text-lg font-bold">
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
          {aggregates && aggregates.plays > 0 && (
            <p className="text-dark dark:text-dark-text-muted text-center text-sm">
              Persönlicher Rekord:{" "}
              <span className="text-dark dark:text-dark-text font-bold">
                {aggregates.bestScore}/{QUIZ_ROUND_LEN} richtig
              </span>
              {aggregates.bestStreak > 0 && (
                <> · beste Serie: {aggregates.bestStreak}</>
              )}
            </p>
          )}
        </div>
      )}

      {/* Kein clef/lockClef: Jedes Set ist spielbar, weil sein Schlüssel das
       * Notensystem bestimmt. Die Bibliothek ruft recordUse selbst auf. */}
      <NoteSetLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onUse={handleUseCustomSet}
      />
    </div>
  );
}
