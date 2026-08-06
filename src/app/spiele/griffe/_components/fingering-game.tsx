"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Music, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { NoteSetLibrary } from "../../_components/note-set-library";
import { toNoteSetSummary, type NoteSetSummary } from "../../_lib/note-sets";
import {
  StaffDisplay,
  type StaffFlash,
} from "../../noten-lesen/_components/staff-display-loader";
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
import { FingeringText } from "./fingering-text";
import { GriffeInstrumentSelector } from "./griffe-instrument-selector";
import { GriffeResultView, type GriffeRoundResult } from "./griffe-result-view";
import { SlideDiagram, type SlideReveal } from "./slide-diagram";
import { buildTromboneToken } from "./slide-diagram";
import { ValveDiagram, type ValveReveal } from "./valve-diagram";

const NEXT_MS = 800;
/** Quiz: kurze Fehler-Anzeige, das Tempo gehört zum Format. */
const WRONG_MS = 1500;
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

function quizSecondsFor(difficulty: GriffeDifficultyChoice): number {
  return difficulty === "custom"
    ? QUIZ_SECONDS_CUSTOM
    : QUIZ_SECONDS_BY_DIFFICULTY[difficulty];
}

type Phase = "setup" | "play" | "result";

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

export function FingeringGame() {
  const [instrument, setInstrument] = useState<GriffeInstrumentId>("trumpet_c");
  const [mode, setMode] = useState<GameModeId>("learn");
  const [difficulty, setDifficulty] =
    useState<GriffeDifficultyChoice>("beginner");
  const [phase, setPhase] = useState<Phase>("setup");
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
    // Debug: aktuell angezeigte Note als MIDI verfolgen.
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
      if (stored.instrument) setInstrument(stored.instrument);
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

  // Einstellungen als ein Blob persistieren; alten Einzel-Key aufräumen.
  // Solange eine Set-Referenz noch auflöst, nichts schreiben — sonst würde
  // der Zwischenzustand (Standard-Stufe ohne Set) das gespeicherte Set löschen.
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
        mode,
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
  }, [hydrated, pendingSetResolve, instrument, difficulty, mode, customSet]);

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

  /**
   * Set aktivieren: auf spielbare Töne filtern, Stufe auf „custom" stellen.
   * Liefert false, wenn das Set fürs aktuelle Instrument unbrauchbar ist
   * (< 2 Töne mit Griff) — dann bleibt alles wie es war.
   */
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

  const recordMiss = useCallback((p: WrittenPitch) => {
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
    const p =
      difficulty === "custom"
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
    if (difficulty === "advanced") {
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
    if (mode === "quiz") {
      const secs = quizSecondsFor(difficulty);
      quizDeadlineRef.current = performance.now() + secs * 1000;
      lastTenthRef.current = -1;
      setQuizSecondsLeft(secs);
    } else {
      quizDeadlineRef.current = null;
      setQuizSecondsLeft(null);
    }
  }, [instrument, difficulty, mode, customPool]);

  const goToQuizResult = useCallback(() => {
    clearTimers();
    const missedRows = [...missedMapRef.current.entries()]
      .filter(([, r]) => r.count > 0)
      .map(([key, r]) => ({ key, label: r.label, count: r.count }));
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
      if (mode === "learn") {
        // Lernen: kein Auto-Weiter — Note, Auflösung und Erklärung bleiben
        // stehen, bis „Weiter“ (Button oder Enter) gedrückt wird.
        return;
      }
      if (mode === "quiz") {
        const delay = wasCorrect ? NEXT_MS : WRONG_MS;
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

  const resolveAnswer = useCallback(
    (submitted: string[][], opts: { timeout?: boolean } = {}) => {
      const p = pitchRef.current;
      if (!p) return;
      // Synchron prüfen UND setzen: React-State allein lässt zwei Enter
      // im selben Render-Fenster beide durch (doppelte Streak/Quiz-Index).
      if (answerLockedRef.current) return;
      answerLockedRef.current = true;
      const wasTimeout = Boolean(opts.timeout);
      setAnswerLocked(true);
      quizDeadlineRef.current = null;

      // Eigene Sets mischen Zielgruppen → wie Fortgeschritten alle
      // gelisteten Alternativ-Griffe akzeptieren.
      const acceptsAllVariants =
        difficulty === "advanced" || difficulty === "custom";
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
  }, [phase, inputKind, answerLocked, mode, toggleValve, advanceLearn]);

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

  // Lernen/Endlos erreichen nie eine Auswertung — dritten Schritt ausblenden.
  const stepLabels =
    mode === "quiz" ? ["Setup", "Spielen", "Auswertung"] : ["Setup", "Spielen"];

  const feedbackText =
    learnLine ??
    (flash === "correct" ? "Richtig!" : flash === "wrong" ? "Falsch." : "");

  const primaryButtonClass =
    "bg-primary hover:bg-primary-light dark:hover:bg-primary-dark w-full rounded-sm py-4 text-lg font-black text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55";

  const actionButton =
    mode === "learn" && answerLocked ? (
      <button
        type="button"
        onClick={advanceLearn}
        className={primaryButtonClass}
      >
        Weiter
      </button>
    ) : inputKind === "slide" ? (
      <button
        type="button"
        disabled={answerLocked || slidePosition == null}
        onClick={handleConfirmSlide}
        className={primaryButtonClass}
      >
        Antwort bestätigen
      </button>
    ) : (
      <button
        type="button"
        disabled={answerLocked}
        onClick={handleConfirmValves}
        className={primaryButtonClass}
      >
        Antwort bestätigen
      </button>
    );

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
          {stepLabels.map((label, i) => {
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

          {setupHint && (
            <p
              role="status"
              aria-live="polite"
              className="rounded-sm border border-amber-300/60 bg-amber-50 px-3 py-2 text-center text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100"
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
              {difficulty === "custom"
                ? (customSet?.name ?? "Eigenes Set")
                : GRIFFE_DIFFICULTY_LABELS[difficulty].title}
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
              {setupHint && (
                <p
                  role="status"
                  aria-live="polite"
                  className="mb-3 rounded-sm border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100"
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
              <button
                type="button"
                className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark mt-4 w-full rounded-sm py-3 text-sm font-black text-white"
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

          {/* Feedback-Region bleibt dauerhaft gemountet (aria-live), nur der
              Inhalt wechselt. Symbol + Text, nicht nur Farbe. */}
          <div
            role="status"
            aria-live="polite"
            className="text-dark dark:text-dark-text-secondary border-dark-border/40 dark:border-dark-border dark:bg-dark-background/50 max-h-[20vh] min-h-[2.75rem] shrink-0 overflow-y-auto rounded-sm border bg-white/60 px-3 py-2 text-sm leading-snug"
          >
            {feedbackText && (
              <span className="flex items-start gap-1.5">
                {flash === "correct" && (
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 stroke-[3] text-emerald-600 dark:text-emerald-400"
                    aria-hidden
                  />
                )}
                {flash === "wrong" && (
                  <X
                    className="mt-0.5 h-4 w-4 shrink-0 stroke-[3] text-rose-600 dark:text-rose-400"
                    aria-hidden
                  />
                )}
                <span>{feedbackText}</span>
              </span>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 pb-1">
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
                {actionButton}
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
                {actionButton}
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
