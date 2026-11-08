"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { Button } from "@/app/_components/ui/button";
import { NoteSetLibrary } from "../../../_components/note-set-library";
import { PathResult } from "../../../_components/path-result";
import {
  FreePractice,
  LeaveRunButton,
  PathChoice,
  PathScreen,
  ModeButtons,
  useDailyDone,
} from "../../../_components/path-screen";
import { usePathState } from "../../../_lib/use-path-state";
import { CalendarDays, Infinity as InfinityIcon, Medal } from "lucide-react";
import {
  DAILY_AFTER_SECTION,
  ENDLESS_AFTER_SECTION,
  sectionFinished,
} from "../../../_lib/learning-path";

import { gameInstruments } from "../../../_lib/profiles/options";
import { activeProfileInstruments } from "../../../_lib/profiles/scope";
import {
  buildGriffeRun,
  GRIFFE_PATH,
  type GriffeRun,
} from "../_lib/path-stages";
import {
  ENDLESS_REPORT_EVERY,
  GRIFFE_NOTE_TIME_MS,
  type EndlessAnswer,
} from "../../../_lib/endless-rules";
import { activeProfileId } from "../../../_lib/profiles/scope";
import {
  LeaderboardView,
  RankedResult,
  UNRANKED_NO_PROFILE,
  UnrankedNotice,
  unrankedReason,
  type RankedOutcome,
} from "../../../_components/ranked";
import { loadWeak, markDailyDone, saveWeak } from "../../../_lib/daily";
import { DAILY_ID, runKindOf } from "../../../_lib/learning-path";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
import { toNoteSetSummary, type NoteSetSummary } from "../../../_lib/note-sets";
import {
  StaffDisplay,
  type StaffFlash,
} from "../../noten-lesen/_components/staff-display-loader";
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
import {
  desktopAnswerShortcutsActive,
  keyboardTargetAllowsShortcuts,
} from "../../noten-lesen/_lib/answer-keyboard";
import { griffeClef } from "../_lib/clef";
import {
  formatValveLabel,
  formatVariantDisplay,
  getRawFingeringEntry,
  isAnswerCorrect,
  isAnswerCorrectAdvancedAll,
  merkhilfeFor,
} from "../_lib/fingering-lookup";
import {
  droppedNotesHint,
  griffeInstrumentLabel,
  MIN_COVERED_PITCHES,
  noteSetCoverageForInstrument,
  noteSetUsabilityForInstrument,
} from "../_lib/note-set-coverage";
import { pickFromDisplayPool, pickRandomGriffePitch } from "../_lib/pick-pitch";
import {
  GRIFFE_DIFFICULTY_LABELS,
  GRIFFE_INSTRUMENTS,
  STORAGE_GRIFFE_INSTRUMENT_KEY,
  STORAGE_GRIFFE_SETTINGS_KEY,
  type GriffeDifficultyChoice,
  type GriffeDifficultyId,
  type GriffeInstrumentId,
  type StoredCustomSetRef,
} from "../_lib/types";
import { GameBarSlot, GameDock } from "../../../_components/game-shell-context";
import {
  GameHead,
  GameStatus,
  LessonFeedback,
  useGameSounds,
  useLessonHearts,
} from "../../../_components/game-kit";
import { praiseFor } from "../../../_lib/rewards";
import { useGameStats } from "../../../_lib/stats/use-game-stats";
import { FingeringText } from "./fingering-text";
import { GriffeInstrumentSelector } from "./griffe-instrument-selector";
import { GriffeResultView, type GriffeRoundResult } from "./griffe-result-view";
import { SlideDiagram, type SlideReveal } from "./slide-diagram";
import { buildTromboneToken } from "./slide-diagram";
import { ValveDiagram, type ValveReveal } from "./valve-diagram";

const NEXT_MS = 800;
/** Quiz: kurze Fehler-Anzeige, das Tempo gehört zum Format. */
/** Die Erklärung steht im Band und muss sich in Ruhe lesen lassen. */
const WRONG_MS = 3500;
/** Endlos: Auflösung + Merkhilfe müssen lesbar bleiben. */
const ENDLESS_WRONG_MS = 2600;
/** Anfänger bekommen mehr Zeit pro Note. */
const QUIZ_SECONDS_BY_DIFFICULTY: Record<GriffeDifficultyId, number> = {
  beginner: 8,
  intermediate: 6,
  advanced: 6,
};
/** Eigene Sets mischen Lagen beliebig — großzügig wie Anfänger. */
const QUIZ_SECONDS_CUSTOM = 8;
const QUIZ_ROUND_LEN = 15;
const HEARTS_EMPTY_DELAY_MS = 900;

/** Breit und flach: nebeneinander, gestapelt rutscht das Griffbild unter die Falz. */
const WIDE_SHORT_TWO_COLUMNS =
  "[@media(min-width:56rem)_and_(max-height:52rem)]:grid-cols-2 [@media(min-width:56rem)_and_(max-height:52rem)]:items-center";

function quizSecondsFor(difficulty: GriffeDifficultyChoice): number {
  return difficulty === "custom"
    ? QUIZ_SECONDS_CUSTOM
    : QUIZ_SECONDS_BY_DIFFICULTY[difficulty];
}

type Phase = "setup" | "play" | "result" | "board";
type LessonOutcome = { percent: number; passed: boolean };

type StoredGriffeSettings = {
  instrument: GriffeInstrumentId;
  difficulty: GriffeDifficultyChoice;
  mode: GameModeId;
  /** Nur zusammen mit difficulty "custom" gültig. */
  customSet?: StoredCustomSetRef;
};

const GRIFFE_DIFFICULTY_IDS: GriffeDifficultyId[] = [
  "beginner",
  "intermediate",
  "advanced",
];
const GRIFFE_MODE_IDS: GameModeId[] = ["learn", "quiz", "endless"];

/** `customSet` aus rohem JSON — nur mit brauchbarer publicId und Name. */
function parseStoredCustomSet(raw: unknown): StoredCustomSetRef | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { publicId, name } = raw as Record<string, unknown>;
  if (typeof publicId !== "string" || publicId.trim().length < 4) return null;
  if (typeof name !== "string" || name.trim().length === 0) return null;
  return { publicId: publicId.trim(), name: name.trim() };
}

/** Ein JSON-Blob für alle Einstellungen; migriert den alten Instrument-Key. */
function readStoredSettings(): Partial<StoredGriffeSettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_GRIFFE_SETTINGS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return {};
      const rec = parsed as Record<string, unknown>;
      const out: Partial<StoredGriffeSettings> = {};
      if (GRIFFE_INSTRUMENTS.some((i) => i.id === rec.instrument)) {
        out.instrument = rec.instrument as GriffeInstrumentId;
      }
      if (rec.difficulty === "custom") {
        // „custom" nur mit gültiger Set-Referenz — sonst Stufe verwerfen.
        const customSet = parseStoredCustomSet(rec.customSet);
        if (customSet) {
          out.difficulty = "custom";
          out.customSet = customSet;
        }
      } else if (
        GRIFFE_DIFFICULTY_IDS.includes(rec.difficulty as GriffeDifficultyId)
      ) {
        out.difficulty = rec.difficulty as GriffeDifficultyId;
      }
      if (GRIFFE_MODE_IDS.includes(rec.mode as GameModeId)) {
        out.mode = rec.mode as GameModeId;
      }
      return out;
    }
    // Migration: früherer Einzel-Key mit nur dem Instrument
    const legacy = localStorage.getItem(STORAGE_GRIFFE_INSTRUMENT_KEY);
    if (legacy && GRIFFE_INSTRUMENTS.some((i) => i.id === legacy)) {
      return { instrument: legacy as GriffeInstrumentId };
    }
  } catch {
    /* ignore */
  }
  return {};
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

/** Woher die aufzulösende Set-Referenz stammt — bestimmt die Fehlertexte. */
type PendingSetResolve = { publicId: string; source: "storage" | "link" };

/** Endlos ohne Server: zufällig, nie zweimal derselbe Ton hintereinander. */
function pickLocal(
  pool: readonly WrittenPitch[],
  count: number,
): WrittenPitch[] {
  const out: WrittenPitch[] = [];
  for (let i = 0; i < count; i++) {
    const options = pool.filter((p) => p !== out.at(-1));
    out.push(options[Math.floor(Math.random() * options.length)]!);
  }
  return out;
}

export function FingeringGame() {
  const { aggregates, recordResult } = useGameStats("griffe");
  const { correct: soundCorrect, wrong: soundWrong } = useGameSounds();
  const [instrument, setInstrument] = useState<GriffeInstrumentId>("trumpet_c");
  const [freeMode, setMode] = useState<GameModeId>("learn");
  /** Eine Stufe oder Challenge des Lernpfads läuft; sonst gilt das freie Üben. */
  const [lesson, setLesson] = useState<GriffeRun | null>(null);
  const lessonRef = useRef<GriffeRun | null>(null);
  const [rankedOutcome, setRankedOutcome] = useState<RankedOutcome | null>(
    null,
  );
  /** Warum der laufende Endlos-Lauf nicht in die Liste kommt; `null`, wenn er zählt. */
  const [unranked, setUnranked] = useState<string | null>(null);
  const unrankedRef = useRef<string | null>(null);
  useEffect(() => {
    unrankedRef.current = unranked;
  }, [unranked]);
  /** Laufender Bestenlisten-Lauf: Warteschlange vom Server und noch nicht gemeldete Griffe. */
  const rankedRef = useRef<{
    runId: string;
    profileId: string;
    queue: WrittenPitch[];
    index: number;
    reported: number;
    buffer: EndlessAnswer[];
    sending: Promise<void> | null;
    invalid: string | null;
    local: boolean;
    pool: WrittenPitch[];
  } | null>(null);
  const shownAtRef = useRef(0);
  const finishRankedRef = useRef<() => Promise<void>>(async () => undefined);
  const startRankedRun = api.gameEndless.start.useMutation();
  const reportRanked = api.gameEndless.report.useMutation();
  const mode: GameModeId = lesson ? "quiz" : freeMode;
  const pathState = usePathState(GRIFFE_PATH, `griffe.${instrument}`);
  const [outcome, setOutcome] = useState<LessonOutcome | null>(null);
  const [freeOpen, setFreeOpen] = useState(false);
  const [difficulty, setDifficulty] =
    useState<GriffeDifficultyChoice>("beginner");
  const [phase, setPhase] = useState<Phase>("setup");
  const dailyDone = useDailyDone("griffe", phase);
  const endlessLocked = sectionFinished(
    GRIFFE_PATH,
    ENDLESS_AFTER_SECTION,
    pathState.progress,
  )
    ? null
    : "Schaff erst Abschnitt 3";
  const [hydrated, setHydrated] = useState(false);

  /** Aktives Notenset („Eigenes Set"), voll aufgelöst inkl. Tonliste. */
  const [customSet, setCustomSet] = useState<NoteSetSummary | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  /** Persistenter Setup-Hinweis (ausgelassene Töne, verlorenes Set, …). */
  const [setupHint, setSetupHint] = useState<string | null>(null);
  const [pendingSetResolve, setPendingSetResolve] =
    useState<PendingSetResolve | null>(null);
  /** Stufe vor „Eigenes Set" — dahin fällt „Entfernen" zurück. */
  const prevDifficultyRef = useRef<GriffeDifficultyId>("beginner");

  const [pitch, setPitch] = useState<WrittenPitch | null>(null);
  const lastMidiRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<StaffFlash>("none");
  const [diagramFlash, setDiagramFlash] = useState<StaffFlash>("none");
  const [learnLine, setLearnLine] = useState<string | null>(null);
  const [answerLocked, setAnswerLocked] = useState(false);
  /** Synchroner Lock: zwei Enter im selben Render-Fenster dürfen nicht beide zählen. */
  const answerLockedRef = useRef(false);

  const [valvePressed, setValvePressed] = useState<string[]>([]);
  const [slidePosition, setSlidePosition] = useState<number | null>(1);
  const [slideRegister, setSlideRegister] = useState<
    "high" | "neutral" | "low"
  >("neutral");
  const [slideQuart, setSlideQuart] = useState(false);
  const [revealValves, setRevealValves] = useState<ValveReveal | null>(null);
  const [revealSlide, setRevealSlide] = useState<SlideReveal | null>(null);

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
  /**
   * Session-Adaptivität: Anzeige-MIDI → wie oft der Ton noch richtig
   * beantwortet werden muss, bis der ~3×-Boost in `pick-pitch` endet.
   */
  const adaptiveRef = useRef<Map<number, number>>(new Map());

  const [roundResult, setRoundResult] = useState<GriffeRoundResult | null>(
    null,
  );
  const [setupOpen, setSetupOpen] = useState(false);
  const [staffAccidentalLayout, setStaffAccidentalLayout] =
    useState<StaffAccidentalLayout>(STAFF_LAYOUT_EXPLICIT);

  const timersRef = useRef<number[]>([]);
  const tickRafRef = useRef<number | null>(null);
  const quizDeadlineRef = useRef<number | null>(null);
  /** Letztes angezeigtes Zehntel — nur bei Änderung wird State gesetzt. */
  const lastTenthRef = useRef<number>(-1);
  const confirmValvesRef = useRef<() => void>(() => {});
  const confirmSlideRef = useRef<() => void>(() => {});

  const clef = useMemo(() => griffeClef(instrument), [instrument]);
  const inputKind = useMemo(
    () => GRIFFE_INSTRUMENTS.find((i) => i.id === instrument)?.inputKind,
    [instrument],
  );

  /** Abdeckung des aktiven Sets fürs aktuelle Instrument (Anzeige + Pool). */
  const customCoverage = useMemo(
    () =>
      customSet ? noteSetCoverageForInstrument(customSet, instrument) : null,
    [customSet, instrument],
  );
  /** Frage-Pool im Custom-Modus: nur Töne mit Griff. */
  const customPool = useMemo(
    () =>
      difficulty === "custom" && customCoverage ? customCoverage.covered : [],
    [difficulty, customCoverage],
  );

  const { mutate: recordUseMutate } = api.noteSets.recordUse.useMutation();
  const pendingSetQuery = api.noteSets.byPublicId.useQuery(
    { publicId: pendingSetResolve?.publicId ?? "" },
    {
      enabled: pendingSetResolve != null,
      // NOT_FOUND ist endgültig — nur transiente Fehler erneut versuchen.
      retry: (failureCount, error) =>
        error.data?.code !== "NOT_FOUND" && failureCount < 2,
      staleTime: Infinity,
    },
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
    console.debug(
      "[Griffe] displayed note midi:",
      writtenPitchToMidi(pitch),
      pitch,
    );
  }, [pitch]);

  useEffect(() => {
    const stored = readStoredSettings();
    // Deep-Link ?set=… hier statt über useSearchParams lesen — das hält die
    // Seite ohne Suspense-Boundary lauffähig (Hydration-Effekt reicht).
    let linkSetId: string | null = null;
    try {
      linkSetId = new URLSearchParams(window.location.search).get("set");
    } catch {
      /* ignore */
    }
    queueMicrotask(() => {
      const fromProfile = gameInstruments(activeProfileInstruments(), "griffe");
      const instrumentChoice =
        fromProfile.length > 0 &&
        !(
          stored.instrument &&
          (fromProfile as readonly string[]).includes(stored.instrument)
        )
          ? fromProfile[0]
          : stored.instrument;
      if (instrumentChoice) setInstrument(instrumentChoice);
      if (stored.mode) setMode(stored.mode);
      if (linkSetId) {
        // Link schlägt gespeichertes Set; feste Stufe bleibt als Fallback.
        if (stored.difficulty && stored.difficulty !== "custom") {
          setDifficulty(stored.difficulty);
        }
        setPendingSetResolve({ publicId: linkSetId, source: "link" });
      } else if (stored.difficulty === "custom" && stored.customSet) {
        // Erst auflösen, dann aktivieren — bis dahin Standard-Stufe.
        setPendingSetResolve({
          publicId: stored.customSet.publicId,
          source: "storage",
        });
      } else if (stored.difficulty && stored.difficulty !== "custom") {
        setDifficulty(stored.difficulty);
      }
      setHydrated(true);
    });
  }, []);

  // Nicht schreiben, solange eine Set-Referenz noch auflöst — sonst löscht der
  // Zwischenzustand (Standard-Stufe ohne Set) das gespeicherte Set.
  useEffect(() => {
    if (!hydrated || pendingSetResolve) return;
    try {
      const isCustom = difficulty === "custom" && customSet != null;
      const blob: StoredGriffeSettings = {
        instrument,
        difficulty: isCustom
          ? "custom"
          : difficulty === "custom"
            ? prevDifficultyRef.current
            : difficulty,
        mode: freeMode,
        ...(isCustom
          ? {
              customSet: {
                publicId: customSet.publicId,
                name: customSet.name,
              },
            }
          : {}),
      };
      localStorage.setItem(STORAGE_GRIFFE_SETTINGS_KEY, JSON.stringify(blob));
      localStorage.removeItem(STORAGE_GRIFFE_INSTRUMENT_KEY);
    } catch {
      /* ignore */
    }
  }, [
    hydrated,
    pendingSetResolve,
    instrument,
    difficulty,
    freeMode,
    customSet,
  ]);

  // Ein Link auf ein Notenset gehört ins freie Üben.
  useEffect(() => {
    if (pendingSetResolve?.source === "link") {
      queueMicrotask(() => setFreeOpen(true));
    }
  }, [pendingSetResolve]);

  // Notenzeile (VexFlow-Chunk) schon im Setup vorladen — nur Import.
  useEffect(() => {
    if (phase !== "setup") return;
    void import("../../noten-lesen/_components/staff-display");
  }, [phase]);

  /** ?set=… nach der Auflösung aus der URL nehmen (Reload spielt ihn nicht erneut ab). */
  const stripSetParam = useCallback(() => {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("set")) return;
      url.searchParams.delete("set");
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    } catch {
      /* ignore */
    }
  }, []);

  /** Auf spielbare Töne filtern, Stufe „custom“; false (unverändert), wenn < 2 Töne mit Griff. */
  const activateCustomSet = useCallback(
    (set: NoteSetSummary): boolean => {
      const cov = noteSetCoverageForInstrument(set, instrument);
      if (cov.covered.length < MIN_COVERED_PITCHES) return false;
      if (difficulty !== "custom") prevDifficultyRef.current = difficulty;
      setCustomSet(set);
      setDifficulty("custom");
      // Neuer Pool: Miss-Boost und Wiederholungs-Schutz neu beginnen.
      adaptiveRef.current = new Map();
      lastMidiRef.current = null;
      setSetupHint(
        cov.dropped.length > 0
          ? droppedNotesHint(cov.dropped.length, instrument)
          : null,
      );
      return true;
    },
    [difficulty, instrument],
  );

  const deactivateCustomSet = useCallback((hint: string | null) => {
    setCustomSet(null);
    setDifficulty((d) => (d === "custom" ? prevDifficultyRef.current : d));
    setSetupHint(hint);
  }, []);

  /** Feste Stufe gewählt → ein aktives Set wird abgewählt. */
  const handleDifficultyChange = useCallback((d: GriffeDifficultyId) => {
    setDifficulty(d);
    setCustomSet(null);
    setSetupHint(null);
  }, []);

  const handleInstrumentChange = useCallback(
    (id: GriffeInstrumentId) => {
      setInstrument(id);
      // Anzeige-MIDIs bedeuten je Instrument etwas anderes → Boost zurücksetzen.
      adaptiveRef.current = new Map();
      if (difficulty !== "custom" || !customSet) return;
      // Aktives Set gegen das neue Instrument (und dessen Schlüssel) prüfen.
      const cov = noteSetCoverageForInstrument(customSet, id);
      if (cov.covered.length < MIN_COVERED_PITCHES) {
        setCustomSet(null);
        setDifficulty(prevDifficultyRef.current);
        setSetupHint(
          `Das Notenset „${customSet.name}" passt nicht zu ${griffeInstrumentLabel(
            id,
          )} — Schwierigkeit zurückgesetzt.`,
        );
      } else {
        setSetupHint(
          cov.dropped.length > 0
            ? droppedNotesHint(cov.dropped.length, id)
            : null,
        );
      }
    },
    [difficulty, customSet],
  );

  // Gespeicherte oder verlinkte Set-Referenz auflösen und aktivieren.
  useEffect(() => {
    if (!pendingSetResolve) return;
    const { source } = pendingSetResolve;

    if (pendingSetQuery.data) {
      const summary = toNoteSetSummary(pendingSetQuery.data);
      if (summary && activateCustomSet(summary)) {
        if (source === "link") {
          // Fire-and-forget: Nutzung zählen, Spielstart nicht blockieren.
          recordUseMutate({ publicId: summary.publicId });
        }
      } else if (source === "link") {
        setSetupHint(
          `Dieses Set passt nicht zu ${griffeInstrumentLabel(instrument)}.`,
        );
      } else {
        // Stufe steht noch auf dem Standard — nur erklären, warum.
        setSetupHint(
          `Dein gespeichertes Notenset passt nicht mehr zu ${griffeInstrumentLabel(
            instrument,
          )} — Schwierigkeit zurückgesetzt.`,
        );
      }
      if (source === "link") stripSetParam();
      setPendingSetResolve(null);
      return;
    }

    if (pendingSetQuery.error) {
      const notFound = pendingSetQuery.error.data?.code === "NOT_FOUND";
      if (source === "link") {
        setSetupHint(
          notFound
            ? "Dieses Notenset wurde nicht gefunden."
            : "Das Notenset konnte nicht geladen werden.",
        );
        stripSetParam();
      } else {
        setSetupHint(
          notFound
            ? "Dein gespeichertes Notenset gibt es nicht mehr — Schwierigkeit zurückgesetzt."
            : "Dein gespeichertes Notenset konnte nicht geladen werden — Schwierigkeit zurückgesetzt.",
        );
      }
      setPendingSetResolve(null);
    }
  }, [
    pendingSetResolve,
    pendingSetQuery.data,
    pendingSetQuery.error,
    activateCustomSet,
    instrument,
    recordUseMutate,
    stripSetParam,
  ]);

  /** Bibliothek: Sets ohne genug Griffe fürs Instrument als unbrauchbar markieren. */
  const libraryUsability = useCallback(
    (set: NoteSetSummary) => noteSetUsabilityForInstrument(set, instrument),
    [instrument],
  );

  const handleLibraryUse = useCallback(
    (set: NoteSetSummary) => {
      if (!activateCustomSet(set)) {
        setSetupHint(
          `Dieses Set passt nicht zu ${griffeInstrumentLabel(instrument)}.`,
        );
      }
    },
    [activateCustomSet, instrument],
  );

  const loseHeartRef = useRef<() => void>(() => undefined);
  const recordMiss = useCallback((p: WrittenPitch) => {
    loseHeartRef.current();
    const k = pitchKey(p);
    const m = missedMapRef.current;
    // Label inkl. Oktave — sonst kollidieren z. B. D4 und D5 in der Auswertung.
    const cur = m.get(k) ?? {
      label: `${answerLabelForPitch(p)}${p.octave}`,
      count: 0,
    };
    cur.count += 1;
    m.set(k, cur);
  }, []);

  const spawnNote = useCallback(() => {
    const boost = new Set(adaptiveRef.current.keys());
    // Eigenes Set: fester Pool aus spielbaren Set-Tönen — gleicher Zieh-Pfad
    // (Wiederholungs-Schutz + Miss-Boost) wie bei den Standard-Stufen.
    const ranked = rankedRef.current;
    const lessonPool = lessonRef.current?.pitches;
    const p = ranked
      ? (ranked.queue[ranked.index] ?? ranked.queue.at(-1)!)
      : lessonPool
        ? pickFromDisplayPool(lessonPool, lastMidiRef.current, boost)
        : difficulty === "custom"
          ? pickFromDisplayPool(customPool, lastMidiRef.current, boost)
          : pickRandomGriffePitch(
              instrument,
              difficulty,
              lastMidiRef.current,
              boost,
            );
    lastMidiRef.current = writtenPitchToMidi(p);
    pitchRef.current = p;
    setPitch(p);
    if (difficulty === "advanced" && !lessonPool) {
      setStaffAccidentalLayout(
        Math.random() < 0.5
          ? { kind: "keySignature", keySpec: randomAdvancedKeySpec() }
          : STAFF_LAYOUT_EXPLICIT,
      );
    } else {
      // Auch Eigene Sets: immer explizite Vorzeichen, keine Zufallstonart.
      setStaffAccidentalLayout(STAFF_LAYOUT_EXPLICIT);
    }
    setFlash("none");
    setDiagramFlash("none");
    setLearnLine(null);
    answerLockedRef.current = false;
    setAnswerLocked(false);
    setValvePressed([]);
    setSlidePosition(1);
    setSlideRegister("neutral");
    setSlideQuart(false);
    setRevealValves(null);
    setRevealSlide(null);
    shownAtRef.current = performance.now();
    if (ranked) {
      quizDeadlineRef.current = performance.now() + GRIFFE_NOTE_TIME_MS;
      lastTenthRef.current = -1;
      setQuizSecondsLeft(GRIFFE_NOTE_TIME_MS / 1000);
    } else if (mode === "quiz" && !lessonPool) {
      const secs = quizSecondsFor(difficulty);
      quizDeadlineRef.current = performance.now() + secs * 1000;
      lastTenthRef.current = -1;
      setQuizSecondsLeft(secs);
    } else {
      quizDeadlineRef.current = null;
      setQuizSecondsLeft(null);
    }
  }, [instrument, difficulty, mode, customPool]);

  const goToQuizResult = useCallback(
    (completed: boolean = true) => {
      clearTimers();
      const active = lessonRef.current;
      if (active?.ranked) {
        void finishRankedRef.current();
        return;
      }
      const total = active?.total ?? QUIZ_ROUND_LEN;
      if (active) {
        const percent = Math.round((100 * quizCorrectRef.current) / total);
        const { passed } = active.daily
          ? { passed: false }
          : pathState.record(active.id, { percent, completed });
        if (active.daily) markDailyDone("griffe");
        saveWeak(
          `griffe.${instrument}`,
          new Map(
            [...adaptiveRef.current].map(([midi, left]) => [
              String(midi),
              left,
            ]),
          ),
        );
        setOutcome({ percent, passed });
      }
      const missedRows = [...missedMapRef.current.entries()]
        .filter(([, r]) => r.count > 0)
        .map(([key, r]) => ({ key, label: r.label, count: r.count }));
      setRoundResult({
        correct: quizCorrectRef.current,
        total,
        bestStreakRound: bestStreakRoundRef.current,
        missed: missedRows,
      });
      recordResult({
        score: quizCorrectRef.current,
        maxScore: total,
        streak: bestStreakRoundRef.current,
        meta: active
          ? {
              instrument,
              stage: active.id,
              kind: runKindOf(GRIFFE_PATH, active.id),
              passed:
                active.challengeSection !== null &&
                quizCorrectRef.current / total >= 0.7 &&
                completed,
            }
          : { instrument, difficulty, mode, kind: "free" },
      });
      setPhase("result");
    },
    [clearTimers, pathState, recordResult, instrument, difficulty, mode],
  );

  const scheduleAfter = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  // Letztes Herz weg: Das Urteil noch kurz zeigen, dann endet die Lektion.
  const {
    hearts,
    lose: loseHeart,
    reset: resetHearts,
  } = useLessonHearts(() =>
    scheduleAfter(HEARTS_EMPTY_DELAY_MS, () => goToQuizResult(false)),
  );
  useEffect(() => {
    // Nur im Quiz gibt es Herzen; Lernen und Endlos bleiben ohne Strafe.
    loseHeartRef.current = () => {
      if (mode === "quiz") loseHeart.current();
    };
  }, [mode, loseHeart]);

  const advanceAfterAnswer = useCallback(
    (wasCorrect: boolean) => {
      if (mode === "learn") {
        // Lernen: kein Auto-Weiter — Note, Auflösung und Erklärung bleiben
        // stehen, bis „Weiter“ (Button oder Enter) gedrückt wird.
        return;
      }
      if (mode === "quiz") {
        const delay = wasCorrect ? NEXT_MS : WRONG_MS;
        scheduleAfter(delay, () => {
          const nextIdx = quizIndexRef.current + 1;
          if (nextIdx >= (lessonRef.current?.total ?? QUIZ_ROUND_LEN)) {
            goToQuizResult();
            return;
          }
          quizIndexRef.current = nextIdx;
          setQuizIndex(nextIdx);
          spawnNote();
        });
        return;
      }
      // Endlos: Fehler-Auflösung länger stehen lassen.
      const delay = wasCorrect ? NEXT_MS : ENDLESS_WRONG_MS;
      scheduleAfter(delay, () => {
        spawnNote();
      });
    },
    [mode, scheduleAfter, spawnNote, goToQuizResult],
  );

  const advanceLearn = useCallback(() => {
    if (mode !== "learn" || !answerLockedRef.current) return;
    clearTimers();
    spawnNote();
  }, [mode, clearTimers, spawnNote]);

  const applyWrongReveal = useCallback(
    (p: WrittenPitch, submitted: string[][]) => {
      const std = standardVariant(instrument, p);
      const sub = submitted[0] ?? [];
      if (inputKind === "slide") {
        setRevealSlide({ correct: std?.[0] ?? "", player: sub[0] ?? "" });
      } else {
        setRevealValves({
          correct: std ? sortValveStrings(std) : [],
          player: sortValveStrings(sub),
        });
      }
    },
    [instrument, inputKind],
  );

  const clearWrongReveal = useCallback(() => {
    setRevealValves(null);
    setRevealSlide(null);
  }, []);

  /** Gesammelte Griffe melden; der Server legt neue Noten nach. */
  const flushRanked = useCallback(async () => {
    const ranked = rankedRef.current;
    if (!ranked || ranked.buffer.length === 0 || ranked.invalid) return;
    if (ranked.sending) await ranked.sending;
    const answers = ranked.buffer.splice(0);
    const fromIndex = ranked.reported;
    ranked.reported += answers.length;
    ranked.sending = reportRanked
      .mutateAsync({
        profileId: ranked.profileId,
        runId: ranked.runId,
        fromIndex,
        answers,
      })
      .then((result) => {
        if (result.status === "running") ranked.queue.push(...result.pitches);
        else if (result.status === "invalid") ranked.invalid = result.reason;
        else setRankedOutcome(result);
      })
      .catch(() => {
        setUnranked(
          "Die Verbindung ist weg. Dieser Lauf zählt nicht für die Bestenliste.",
        );
        ranked.invalid =
          "Die Verbindung ist abgerissen. Dieser Lauf zählt leider nicht.";
      })
      .finally(() => {
        ranked.sending = null;
      });
    await ranked.sending;
  }, [reportRanked]);

  const noteRankedAnswer = useCallback(
    (label: string | null) => {
      const ranked = rankedRef.current;
      if (!ranked) return;
      ranked.buffer.push({
        label,
        ms: Math.round(performance.now() - shownAtRef.current),
      });
      ranked.index++;
      if (ranked.local) {
        ranked.buffer.length = 0;
        if (ranked.queue.length - ranked.index < 10) {
          ranked.queue.push(...pickLocal(ranked.pool, 20));
        }
        return;
      }
      if (ranked.buffer.length >= ENDLESS_REPORT_EVERY) void flushRanked();
    },
    [flushRanked],
  );

  const resolveAnswer = useCallback(
    (submitted: string[][], opts: { timeout?: boolean } = {}) => {
      const p = pitchRef.current;
      if (!p) return;
      // Synchron prüfen UND setzen: React-State allein lässt zwei Enter
      // im selben Render-Fenster beide durch (doppelte Streak/Quiz-Index).
      if (answerLockedRef.current) return;
      answerLockedRef.current = true;
      const wasTimeout = Boolean(opts.timeout);
      noteRankedAnswer(wasTimeout ? null : JSON.stringify(submitted[0] ?? []));
      setAnswerLocked(true);
      quizDeadlineRef.current = null;

      // Eigene Sets mischen Zielgruppen → wie Fortgeschritten alle
      // gelisteten Alternativ-Griffe akzeptieren.
      const acceptsAllVariants =
        lessonRef.current !== null ||
        difficulty === "advanced" ||
        difficulty === "custom";
      const okAdvanced =
        !wasTimeout &&
        acceptsAllVariants &&
        isAnswerCorrectAdvancedAll(instrument, p, submitted);
      const okStd =
        !wasTimeout &&
        (difficulty === "beginner" || difficulty === "intermediate") &&
        isAnswerCorrect(instrument, p, difficulty, submitted);

      const ok = okAdvanced || okStd;
      const midi = writtenPitchToMidi(p);

      if (ok) {
        setFlash("correct");
        setDiagramFlash("correct");
        clearWrongReveal();
        // Adaptivität: zweimal richtig beantwortet → Boost beenden.
        const remaining = adaptiveRef.current.get(midi);
        if (remaining != null) {
          if (remaining <= 1) adaptiveRef.current.delete(midi);
          else adaptiveRef.current.set(midi, remaining - 1);
        }
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
      // Verfehlte Töne öfter wieder abfragen, bis sie zweimal richtig saßen.
      adaptiveRef.current.set(midi, 2);
      applyWrongReveal(p, submitted);

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
      // Lernmodus pausiert in advanceAfterAnswer („Weiter“-Schritt) — Auflösung
      // und Erklärung bleiben bis zur Bestätigung stehen.
      advanceAfterAnswer(false);
    },
    [
      advanceAfterAnswer,
      applyWrongReveal,
      clearWrongReveal,
      difficulty,
      instrument,
      mode,
      recordMiss,
      noteRankedAnswer,
    ],
  );

  const handleTimeout = useCallback(() => {
    if (answerLockedRef.current) return;
    resolveAnswer([[]], { timeout: true });
  }, [resolveAnswer]);

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
      // Nur bei geändertem Zehntel State setzen — sonst 60 Renders/s.
      const tenth = Math.ceil(left * 10);
      if (tenth !== lastTenthRef.current) {
        lastTenthRef.current = tenth;
        setQuizSecondsLeft(tenth / 10);
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
    if (phase !== "play") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!desktopAnswerShortcutsActive()) return;
      if (!keyboardTargetAllowsShortcuts(e.target)) return;
      if (e.repeat) return;
      if (answerLocked) {
        // Lernen: Enter = Weiter zur nächsten Note.
        if (mode === "learn" && e.key === "Enter") {
          e.preventDefault();
          advanceLearn();
        }
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (inputKind === "slide") {
          confirmSlideRef.current();
        } else {
          confirmValvesRef.current();
        }
        return;
      }
      if (inputKind === "slide") {
        // Ziffern 1–7 setzen die Zugposition direkt.
        if (/^[1-7]$/.test(e.key)) {
          e.preventDefault();
          setSlidePosition(Number(e.key));
        }
        return;
      }
      // Physische Zifferntasten (layout-unabhängig) für die Ventile 1–3.
      const valve = { Digit1: 1, Digit2: 2, Digit3: 3 }[e.code];
      if (valve !== undefined) {
        e.preventDefault();
        toggleValve(valve);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [phase, inputKind, answerLocked, mode, toggleValve, advanceLearn]);

  const startGame = useCallback(() => {
    resetHearts.current();
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
  }, [resetHearts, clearTimers, spawnNote]);

  const finishRanked = useCallback(async () => {
    const ranked = rankedRef.current;
    if (!ranked) return;
    if (ranked.local) {
      setRankedOutcome({
        status: "unranked",
        score: quizCorrectRef.current,
        reason: unrankedRef.current ?? UNRANKED_NO_PROFILE,
      });
      setPhase("result");
      return;
    }
    setRankedOutcome({ status: "checking" });
    setPhase("result");
    await flushRanked();
    if (ranked.sending) await ranked.sending;
    if (ranked.invalid)
      setRankedOutcome({ status: "invalid", reason: ranked.invalid });
    recordResult({
      score: quizCorrectRef.current,
      streak: bestStreakRoundRef.current,
      meta: { instrument, kind: "endless", reached: quizCorrectRef.current },
    });
  }, [flushRanked, recordResult, instrument]);
  useEffect(() => {
    finishRankedRef.current = finishRanked;
  });

  const beginEndless = useCallback(
    (pitches: WrittenPitch[]) => {
      const lessonRun: GriffeRun = {
        id: "ranked",
        pitches: pitches,
        total: Number.POSITIVE_INFINITY,
        challengeSection: null,
        daily: false,
        ranked: true,
      };
      lessonRef.current = lessonRun;
      setLesson(lessonRun);
      setRankedOutcome(null);
      setOutcome(null);
      setRoundResult(null);
      startGame();
    },
    [startGame],
  );

  const startRanked = useCallback(async () => {
    const profileId = activeProfileId();
    // Ohne Profil oder Netz läuft Endlos auf dem Gerät und zählt nicht für die Liste.
    const local = (reason: string) => {
      setUnranked(reason);
      const pool = buildGriffeRun("alle-zusammen", instrument).pitches;
      rankedRef.current = {
        runId: "",
        profileId: "",
        queue: pickLocal(pool, 40),
        index: 0,
        reported: 0,
        buffer: [],
        sending: null,
        invalid: null,
        local: true,
        pool,
      };
      return { pitches: rankedRef.current.queue };
    };
    try {
      if (!profileId) throw new Error("ohne Profil");
      setUnranked(null);
      const run = await startRankedRun.mutateAsync({
        profileId,
        game: "griffe",
        variant: instrument,
      });
      rankedRef.current = {
        runId: run.runId,
        profileId,
        queue: run.pitches,
        index: 0,
        reported: 0,
        buffer: [],
        sending: null,
        invalid: null,
        local: false,
        pool: [],
      };
      beginEndless(run.pitches);
    } catch {
      const run = local(unrankedReason(Boolean(profileId)));
      beginEndless(run.pitches);
    }
  }, [beginEndless, instrument, startRankedRun]);

  const startLesson = useCallback(
    (id: string) => {
      rankedRef.current = null;
      const run = buildGriffeRun(id, instrument, pathState.progress);
      // Verfehlte Griffe aus früheren Tagen kommen öfter dran.
      adaptiveRef.current = new Map(
        [...loadWeak(`griffe.${instrument}`)].map(([midi, left]) => [
          Number(midi),
          left,
        ]),
      );
      lessonRef.current = run;
      setLesson(run);
      setOutcome(null);
      setRoundResult(null);
      pathState.clearCelebration();
      startGame();
    },
    [instrument, pathState, startGame],
  );

  const startFree = useCallback(() => {
    rankedRef.current = null;
    lessonRef.current = null;
    setLesson(null);
    setOutcome(null);
    setRoundResult(null);
    startGame();
  }, [startGame]);

  const openSetup = useCallback(() => {
    clearTimers();
    rankedRef.current = null;
    lessonRef.current = null;
    setLesson(null);
    setPhase("setup");
    setPitch(null);
    pitchRef.current = null;
  }, [clearTimers]);

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

  const insConfig = GRIFFE_INSTRUMENTS.find((i) => i.id === instrument);
  const insShort = insConfig?.shortLabel;
  const difficultyLabel =
    difficulty === "custom"
      ? (customSet?.name ?? "Eigenes Set")
      : GRIFFE_DIFFICULTY_LABELS[difficulty].title;
  const modeLabel =
    mode === "learn" ? "Lernen" : mode === "quiz" ? "Quiz" : "Endlos";

  const valveCount = inputKind === "valves4" ? 4 : 3;

  const feedbackText =
    learnLine ??
    (flash === "correct" ? "Richtig!" : flash === "wrong" ? "Falsch." : "");

  // Klang aus dem Urteil abgeleitet: So bleibt die Spiellogik unberührt.
  useEffect(() => {
    if (flash === "correct") soundCorrect(streakRef.current);
    else if (flash === "wrong") soundWrong();
  }, [flash, soundCorrect, soundWrong]);

  const actionButton =
    mode === "learn" && answerLocked ? (
      <Button
        type="button"
        size="lg"
        className="spiel-action w-full"
        onClick={advanceLearn}
      >
        Weiter
      </Button>
    ) : inputKind === "slide" ? (
      <Button
        type="button"
        size="lg"
        className="spiel-action w-full"
        disabled={answerLocked || slidePosition == null}
        onClick={handleConfirmSlide}
      >
        Antwort bestätigen
      </Button>
    ) : (
      <Button
        type="button"
        size="lg"
        className="spiel-action w-full"
        disabled={answerLocked}
        onClick={handleConfirmValves}
      >
        Antwort bestätigen
      </Button>
    );

  if (!hydrated) {
    return (
      <div className="text-dark dark:text-night-muted py-16 text-center text-sm">
        Lädt …
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 md:gap-4">
      {phase === "setup" && !libraryOpen && (
        <PathScreen
          tutorials={() => ["griffe-start"]}
          path={GRIFFE_PATH}
          state={pathState}
          head={
            <>
              <GameHead
                title="Griffe"
                text="Lies die Note und wähle den richtigen Griff."
              />
              <PathChoice
                label="Instrument"
                options={GRIFFE_INSTRUMENTS.map(({ id, label }) => ({
                  id,
                  label,
                }))}
                value={instrument}
                onChange={handleInstrumentChange}
              />
            </>
          }
          onStart={() => startLesson(pathState.selectedId)}
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
                    GRIFFE_PATH,
                    DAILY_AFTER_SECTION,
                    pathState.progress,
                  )
                    ? null
                    : "Schaff erst Abschnitt 2",
                  onClick: () => startLesson(DAILY_ID),
                },
                {
                  key: "endless",
                  label: "Endlos",
                  icon: InfinityIcon,
                  status: "Drei Herzen",
                  locked: endlessLocked,
                  onClick: () => void startRanked(),
                },
                {
                  key: "board",
                  label: "Bestenliste",
                  icon: Medal,
                  status: "Ansehen",
                  onClick: () => setPhase("board"),
                },
              ]}
            />
          }
          below={
            <>
              <FreePractice
                open={freeOpen}
                onToggle={setFreeOpen}
                onStart={startFree}
              >
                {setupHint && (
                  <p
                    role="status"
                    aria-live="polite"
                    className="border-primary-ink bg-rule/25 text-ink dark:border-primary dark:bg-night-raised dark:text-night-text border-l-4 px-3 py-2 text-sm"
                  >
                    {setupHint}
                  </p>
                )}
                <GriffeInstrumentSelector
                  instrument={instrument}
                  mode={freeMode}
                  difficulty={difficulty}
                  customSetName={customSet?.name ?? null}
                  customSetSummary={
                    customSet && customCoverage
                      ? `${customCoverage.covered.length} von ${customCoverage.total} Noten spielbar`
                      : null
                  }
                  onInstrument={handleInstrumentChange}
                  onMode={setMode}
                  onDifficulty={handleDifficultyChange}
                  onOpenLibrary={() => setLibraryOpen(true)}
                  onRemoveCustomSet={() => deactivateCustomSet(null)}
                />
              </FreePractice>
            </>
          }
        />
      )}

      {phase === "board" && (
        <LeaderboardView
          game="griffe"
          variants={GRIFFE_INSTRUMENTS.map(({ id, label }) => ({ id, label }))}
          variant={instrument}
          onVariant={(id) => handleInstrumentChange(id as typeof instrument)}
          playLocked={endlessLocked}
          onPlay={() => void startRanked()}
          onBack={() => setPhase("setup")}
        />
      )}

      {phase === "play" && pitch && (
        <div className="flex flex-col gap-3 md:gap-4">
          {lesson && (
            <GameBarSlot>
              <LeaveRunButton onLeave={openSetup} />
            </GameBarSlot>
          )}
          {!lesson && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSetupOpen((o) => !o)}
                aria-expanded={setupOpen}
                aria-controls="griffe-setup-panel"
                aria-label={`Einstellungen ändern — ${insConfig?.label ?? ""}, ${difficultyLabel}, ${modeLabel}`}
                className={cn(
                  "border-rule text-ink hover:bg-rule/25 dark:border-night-rule dark:text-night-text dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 border px-3 py-2 text-sm font-bold transition-colors active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
                  GAME_FOCUS_RING,
                )}
              >
                <Settings2
                  className="h-4 w-4 shrink-0 stroke-[2]"
                  aria-hidden
                />
                <span aria-hidden>
                  {insShort}
                  {" · "}
                  {difficultyLabel}
                  {" · "}
                  {modeLabel}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none",
                    setupOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
            </div>
          )}

          {setupOpen && !lesson && (
            <div
              id="griffe-setup-panel"
              className="border-rule bg-rule/25 dark:border-night-rule dark:bg-night-raised border p-4"
            >
              {setupHint && (
                <p
                  role="status"
                  aria-live="polite"
                  className="border-primary-ink bg-paper text-ink dark:border-primary dark:bg-night dark:text-night-text mb-3 border-l-4 px-3 py-2 text-sm"
                >
                  {setupHint}
                </p>
              )}
              <GriffeInstrumentSelector
                instrument={instrument}
                mode={mode}
                difficulty={difficulty}
                customSetName={customSet?.name ?? null}
                customSetSummary={
                  customSet && customCoverage
                    ? `${customCoverage.covered.length} von ${customCoverage.total} Noten spielbar`
                    : null
                }
                onInstrument={handleInstrumentChange}
                onMode={setMode}
                onDifficulty={handleDifficultyChange}
                onOpenLibrary={() => setLibraryOpen(true)}
                onRemoveCustomSet={() => deactivateCustomSet(null)}
              />
              <Button
                type="button"
                size="md"
                className="mt-4 w-full"
                onClick={() => {
                  setSetupOpen(false);
                  if (mode === "quiz") {
                    // Mitten in der Runde gewechselt: Runde neu starten,
                    // sonst mischen sich Instrumente in der Auswertung.
                    startGame();
                  } else {
                    lastMidiRef.current = null;
                    clearTimers();
                    spawnNote();
                  }
                }}
              >
                Übernehmen &amp; weiter
              </Button>
            </div>
          )}

          {!lesson && (
            <GameBarSlot>
              <p className="condensed text-ink dark:text-night-text flex items-center gap-x-2 text-sm font-bold tabular-nums sm:gap-x-3">
                <span>Serie {streak}</span>
                <span className="text-dark dark:text-night-muted hidden font-semibold sm:inline">
                  Beste {bestStreak}
                </span>
                {mode === "quiz" && (
                  <span className="text-dark dark:text-night-muted font-semibold">
                    {quizIndex + 1}/{QUIZ_ROUND_LEN}
                  </span>
                )}
                {mode === "quiz" && (
                  <span className="text-dark dark:text-night-muted hidden font-semibold sm:inline">
                    Richtig {quizCorrect}
                  </span>
                )}
                {mode === "quiz" && quizSecondsLeft != null && (
                  <span
                    className={cn(
                      "w-[3.5rem] text-right",
                      quizSecondsLeft <= 2
                        ? "text-red-700 dark:text-red-400"
                        : "text-ink dark:text-night-text",
                    )}
                  >
                    {quizSecondsLeft.toFixed(1)} s
                  </span>
                )}
              </p>
            </GameBarSlot>
          )}

          <div
            className={cn(
              "grid grid-cols-1 gap-[clamp(0.5rem,1.8dvh,1.25rem)]",
              WIDE_SHORT_TWO_COLUMNS,
            )}
          >
            <div className="flex min-w-0 flex-col gap-[clamp(0.5rem,1.6dvh,1rem)]">
              <GameStatus
                mood={
                  flash === "correct"
                    ? "happy"
                    : flash === "wrong"
                      ? "oops"
                      : "listen"
                }
                message={
                  flash === "correct"
                    ? praiseFor(streak)
                    : flash === "wrong"
                      ? "Daneben"
                      : "Welcher Griff passt?"
                }
                question="Welcher Griff passt?"
                hearts={mode === "quiz" ? hearts : undefined}
                streak={streak}
                progress={
                  mode === "quiz" && !lesson?.ranked
                    ? quizIndex / (lesson?.total ?? QUIZ_ROUND_LEN)
                    : null
                }
              />
              {lesson?.ranked && <UnrankedNotice reason={unranked} />}
              {/* Kastenhöhe über `className`, die Notenschrift skaliert darin mit. */}
              <StaffDisplay
                clef={clef}
                pitch={pitch}
                staffAccidentalLayout={staffAccidentalLayout}
                flash={flash}
                className={cn(
                  "mx-auto w-full max-w-[46rem] shrink-0",
                  // Das Zugdiagramm braucht mehr Höhe als Ventilknöpfe, daher
                  // bei der Posaune eine niedrigere Notenzeile.
                  inputKind === "slide"
                    ? "h-[clamp(7rem,20dvh,15rem)]"
                    : "h-[clamp(8rem,24dvh,20rem)]",
                )}
              />

              {/* Dauerhaft gemountet (aria-live), nur der Inhalt wechselt. Höhe vorgehalten,
                  damit die Merkhilfe das Griffbild nicht schiebt. */}
              <div
                role="status"
                aria-live="polite"
                className="spiel-inline-feedback text-ink dark:text-night-text max-h-[22dvh] min-h-[clamp(2.75rem,7dvh,5rem)] shrink-0 overflow-y-auto px-1 py-2 text-sm leading-snug"
              >
                {feedbackText && (
                  <span className="flex items-start gap-1.5">
                    {flash === "correct" && (
                      <Check
                        className="text-ink dark:text-night-text mt-0.5 h-4 w-4 shrink-0 stroke-[3]"
                        aria-hidden
                      />
                    )}
                    {flash === "wrong" && (
                      <X
                        className="mt-0.5 h-4 w-4 shrink-0 stroke-[3] text-red-700 dark:text-red-400"
                        aria-hidden
                      />
                    )}
                    <span>{feedbackText}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-[46rem] min-w-0 flex-col justify-center gap-[clamp(0.5rem,1.6dvh,1rem)]">
              {inputKind === "slide" ? (
                <>
                  <SlideDiagram
                    position={slidePosition}
                    register={slideRegister}
                    quart={slideQuart}
                    reveal={revealSlide}
                    showQuart={difficulty === "advanced"}
                    onChange={handleSlideChange}
                    disabled={answerLocked}
                    flash={diagramFlash}
                  />
                  <FingeringText label={liveSlideLabel} />
                </>
              ) : (
                <>
                  <ValveDiagram
                    valveCount={valveCount}
                    pressed={valvePressed}
                    reveal={revealValves}
                    onToggle={toggleValve}
                    disabled={answerLocked}
                    flash={diagramFlash}
                  />
                  <FingeringText label={liveValveLabel} />
                </>
              )}
            </div>
          </div>

          <GameDock>
            <div className="flex flex-col gap-2">
              {flash !== "none" && (
                <LessonFeedback
                  tone={flash === "correct" ? "right" : "wrong"}
                  title={
                    flash === "correct"
                      ? `${praiseFor(streak)}!`
                      : "Leider falsch"
                  }
                  text={
                    flash === "correct"
                      ? null
                      : learnLine?.replace(
                          /^Falsch\s*[—–-]\s*richtig:/,
                          "Richtig ist",
                        )
                  }
                />
              )}
              {actionButton}
            </div>
          </GameDock>
        </div>
      )}

      {phase === "result" && lesson?.ranked && rankedOutcome && (
        <RankedResult
          game="griffe"
          variant={instrument}
          outcome={rankedOutcome}
          onAgain={() => void startRanked()}
          onContinue={openSetup}
        />
      )}

      {phase === "result" &&
        roundResult &&
        lesson &&
        !lesson.ranked &&
        outcome && (
          <PathResult
            percent={outcome.percent}
            value={`${roundResult.correct}/${roundResult.total}`}
            valueLabel="richtig"
            rows={[["Beste Serie", String(roundResult.bestStreakRound)]]}
            challenge={
              lesson.challengeSection === null
                ? null
                : {
                    passed: outcome.passed,
                    nextSection: GRIFFE_PATH.sections[
                      lesson.challengeSection + 1
                    ]
                      ? lesson.challengeSection + 2
                      : null,
                  }
            }
            detailsLabel="Das übst du am besten noch"
            onAgain={() => startLesson(lesson.id)}
            onContinue={openSetup}
          >
            {roundResult.missed.length > 0 ? (
              <ul className="text-ink dark:text-night-text space-y-1 text-sm">
                {roundResult.missed.map((row) => (
                  <li
                    key={row.key}
                    className="border-rule dark:border-night-rule flex justify-between gap-3 border-b pb-1 last:border-0"
                  >
                    <span className="font-semibold">{row.label}</span>
                    <span className="font-bold tabular-nums">{row.count}×</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </PathResult>
        )}

      {phase === "result" && roundResult && !lesson && (
        <GriffeResultView
          result={roundResult}
          onRetry={() => {
            setRoundResult(null);
            startFree();
          }}
          onChangeSetup={openSetup}
          bestScore={aggregates?.bestScore ?? 0}
          plays={aggregates?.plays ?? 0}
        />
      )}

      <NoteSetLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        clef={clef}
        lockClef
        onUse={handleLibraryUse}
        usability={libraryUsability}
      />
    </div>
  );
}
