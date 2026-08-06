"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dices,
  Music,
  Rocket,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/_components/ui/button";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
import type { Difficulty } from "../_lib/types";
import {
  countInBeatsForRhythm,
  generateRhythm,
  totalRhythmDurationMs,
} from "../_lib/rhythm-generator";
import {
  pulseInfoForTimeSignature,
  pulseMsForTimeSignature,
} from "../_lib/rhythm-arithmetic";
import { describeRhythmGerman } from "../_lib/rhythm-describe";
import type { GeneratedRhythm } from "../_lib/types";
import {
  hapticsCountdownBeat,
  hapticsMetronomeBeat,
  hapticsPlayingStart,
} from "../_lib/haptics";
import {
  scoreTaps,
  type OnsetVerdict,
  type ScoreResult,
} from "../_lib/scoring";
import {
  GameDock,
  useGameShell,
} from "../../../_components/game-shell-context";
import { GameStepIndicator } from "../../../_components/game-step-indicator";
import { useGameStats } from "../../../_lib/stats/use-game-stats";
import { useMetronomeEngine } from "./use-metronome-engine";
import { RhythmDisplayLoader } from "./rhythm-display-loader";
import { TapButton } from "./tap-button";
import { ResultView } from "./result-view";
import { BeatPulse, type BeatPulseTiming } from "./beat-pulse";

type GamePhase = "idle" | "preview" | "countdown" | "playing" | "result";

function randomBpm(): number {
  return 60 + Math.floor(Math.random() * 73);
}

function gameStepIndex(phase: GamePhase): number {
  switch (phase) {
    case "idle":
      return 0;
    case "preview":
      return 1;
    case "countdown":
    case "playing":
      return 2;
    case "result":
      return 3;
  }
}

const DIFFICULTY_CARDS: {
  id: Difficulty;
  title: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    id: "beginner",
    title: "Leicht",
    hint: "Viertel, Halbe & Ganze im 4/4 — super zum Reinkommen",
    icon: Sparkles,
  },
  {
    id: "intermediate",
    title: "Mittel",
    hint: "Achtel & mehrere Taktarten",
    icon: Target,
  },
  {
    id: "advanced",
    title: "Schwer",
    hint: "Sechzehntel, Synkopen, Triolen …",
    icon: Rocket,
  },
];

export function RhythmGame() {
  const engine = useMetronomeEngine();
  const { setScrollLocked } = useGameShell();
  const { aggregates, recordResult } = useGameStats("rhythmus");
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [bpm, setBpm] = useState(96);
  const [rhythm, setRhythm] = useState<GeneratedRhythm | null>(null);
  /** −1 = noch keine Ziffer; „1“ erscheint erst synchron zum ersten Klick. */
  const [countLabel, setCountLabel] = useState(-1);
  /** Länge des Einzählers (1…N) für Anzeige & Overlay. */
  const [countInBeats, setCountInBeats] = useState(4);
  /** Nach Einplanen des Einzählers: Tippfläche aktiv; Rhythmus-Nullpunkt wird zur ersten Audio-Sync-Runde verfeinert. */
  const [tapAllowed, setTapAllowed] = useState(false);
  const [score, setScore] = useState<ScoreResult | null>(null);
  /** Schon einmal angehört? Steuert „Anhören“ vs. „Nochmal anhören“. */
  const [previewHeard, setPreviewHeard] = useState(false);
  /** Kurzer Hinweis nach Unterbrechung (Tab in den Hintergrund o. Ä.). */
  const [interruptNotice, setInterruptNotice] = useState<string | null>(null);

  const tapsRef = useRef<number[]>([]);
  /** Timing für die Puls-Anzeige — per Ref, damit das Spielen re-renderfrei bleibt. */
  const beatTimingRef = useRef<BeatPulseTiming | null>(null);
  const timersRef = useRef<number[]>([]);
  const difficultyRef = useRef(difficulty);
  /** Einmaliges Setzen von playingStartMs beim Öffnen der Tippphase. */
  const tapGateOpenedRef = useRef(false);
  /** Countdown-Ziffern: nach phase playing nicht mehr setzen. */
  const countInLabelsActiveRef = useRef(true);
  /** RAF: Warten bis Audio „Takt nach Einzählen“ erreicht. */
  const losWaitRafRef = useRef<number | null>(null);
  const playingStartMsRef = useRef(0);
  const rhythmRef = useRef<GeneratedRhythm | null>(null);
  const phaseRef = useRef<GamePhase>(phase);
  const bpmRef = useRef(bpm);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useEffect(() => {
    rhythmRef.current = rhythm;
  }, [rhythm]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    if (losWaitRafRef.current !== null) {
      cancelAnimationFrame(losWaitRafRef.current);
      losWaitRafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  /** Während Einzählen/Tippen: kein Scrollen des Spielinhalts; andere Phasen dürfen scrollen. */
  useEffect(() => {
    setScrollLocked(phase === "countdown" || phase === "playing");
    return () => setScrollLocked(false);
  }, [phase, setScrollLocked]);

  /** Ergebnis einmal pro Runde in die lokale Statistik übernehmen. */
  const resultRecordedRef = useRef(false);
  useEffect(() => {
    if (phase !== "result") {
      resultRecordedRef.current = false;
      return;
    }
    if (!score || resultRecordedRef.current) return;
    resultRecordedRef.current = true;
    recordResult({
      score: Math.round(score.percent),
      maxScore: 100,
      meta: { difficulty, bpm },
    });
  }, [phase, score, recordResult, difficulty, bpm]);

  const startNewRhythm = useCallback(() => {
    const r = generateRhythm(difficulty, bpmRef.current);
    setRhythm(r);
    setPhase("preview");
    setScore(null);
    setTapAllowed(false);
    setPreviewHeard(false);
    setInterruptNotice(null);
    beatTimingRef.current = null;
    tapsRef.current = [];
  }, [difficulty]);

  const handleIdleStart = useCallback(() => {
    startNewRhythm();
  }, [startNewRhythm]);

  const playPreview = useCallback(async () => {
    const r = rhythmRef.current;
    if (!r) return;
    setPreviewHeard(true);
    setInterruptNotice(null);
    const ctx = await engine.ensureAudio();
    engine.cancelScheduled();
    const start = ctx.currentTime + 0.12;

    // Leiser Metronom-Klick unter der Vorschau: so hört man die Dauern gegen den Puls.
    const totalMs = totalRhythmDurationMs(r.events);
    const pulseMs = pulseMsForTimeSignature(r.timeSignature, bpmRef.current);
    const { beatsPerBar } = pulseInfoForTimeSignature(r.timeSignature);
    let k = 0;
    while (k * pulseMs < totalMs) {
      engine.scheduleClick(
        start + (k * pulseMs) / 1000,
        false,
        k % beatsPerBar === 0 ? 0.2 : 0.13,
      );
      k++;
    }

    engine.schedulePreview(r.events, start, 0);
  }, [engine]);

  const beginCountdown = useCallback(async () => {
    const r = rhythmRef.current;
    if (!r) return;

    clearTimers();

    const countIn = countInBeatsForRhythm(
      r.timeSignature,
      difficultyRef.current,
    );
    setCountInBeats(countIn);
    setTapAllowed(false);
    setInterruptNotice(null);
    tapGateOpenedRef.current = false;
    countInLabelsActiveRef.current = true;
    setPhase("countdown");
    setCountLabel(-1);
    /** Auch ein Retry desselben Rhythmus startet mit leerer Tipp-Liste. */
    tapsRef.current = [];

    const ctx = await engine.ensureAudio();
    engine.cancelScheduled();

    /** Puls statt stur Viertel: bei x/8 ist der Schlag die punktierte Viertel. */
    const beatMs = pulseMsForTimeSignature(r.timeSignature, bpmRef.current);
    const beatSec = beatMs / 1000;
    const { beatsPerBar } = pulseInfoForTimeSignature(r.timeSignature);

    // Ein Anker: ctx-Zeit und performance.now() in einem Rutsch — sonst liegen
    // setTimeout (ab Registrierung) und scheduleClick (Audio) auseinander.
    const ctxAtAnchor = ctx.currentTime;
    const wallAnchor = performance.now();
    const firstClickCtx = ctxAtAnchor + 0.12;
    /** Erster Rhythmus-Schlag (t=0): ein Puls-Schlag nach dem letzten Einzählschlag. */
    const rhythmStartCtx = firstClickCtx + countIn * beatSec;
    /** Tippfläche ab erstem Einzählschlag (nicht erst bei t=0 der Figur). */
    const tapEnabledCtx = firstClickCtx;
    /** Letzter Einzählschlag: Metronom + phase „playing“. */
    const lastCountInClickCtx = firstClickCtx + (countIn - 1) * beatSec;

    /** Sofort (ohne RAF): Tippfläche + grober Rhythmus-Nullpunkt; erste Audio-Runde verfeinert die Ankerzeit. */
    playingStartMsRef.current =
      wallAnchor + (rhythmStartCtx - ctxAtAnchor) * 1000;
    setTapAllowed(true);

    for (let i = 0; i < countIn; i++) {
      engine.scheduleClick(firstClickCtx + i * beatSec, i === 0);
    }

    const msToFirstClick = (firstClickCtx - ctxAtAnchor) * 1000;
    const heardLatencyMs =
      typeof ctx.outputLatency === "number" ? ctx.outputLatency * 1000 : 0;
    const registerCountInUi = () => {
      const now = performance.now();
      for (let i = 0; i < countIn; i++) {
        const fireAt =
          wallAnchor + msToFirstClick + i * beatMs + heardLatencyMs;
        const delay = Math.max(0, fireAt - now);
        const tid = window.setTimeout(() => {
          if (!countInLabelsActiveRef.current) return;
          setCountLabel(i);
          hapticsCountdownBeat(i === 0);
        }, delay);
        timersRef.current.push(tid);
      }
    };
    registerCountInUi();

    const delayToFirst = msToFirstClick;

    const totalMs = totalRhythmDurationMs(r.events);

    /** Puls-Anzeige: läuft ab erstem Einzählschlag bis zum Figurende. */
    const pulseStartMs = wallAnchor + msToFirstClick + heardLatencyMs;
    beatTimingRef.current = {
      startMs: pulseStartMs,
      beatMs,
      beatsPerBar,
      endMs: pulseStartMs + countIn * beatMs + totalMs,
    };

    const scheduleMetronomeHaptics = (
      playingStartWallMs: number,
      metronomeLeadMs: number,
    ) => {
      const t0 = performance.now();
      let k = 0;
      while (k * beatMs < totalMs + beatMs) {
        const wallAt = playingStartWallMs + metronomeLeadMs + k * beatMs;
        const d = Math.max(0, wallAt - t0);
        const id = window.setTimeout(() => {
          hapticsMetronomeBeat();
        }, d);
        timersRef.current.push(id);
        k++;
      }
    };

    let playStarted = false;
    const startPlayingSyncedToAudio = () => {
      if (playStarted) return;
      const ctx2 = engine.getContext();
      if (!ctx2) {
        losWaitRafRef.current = null;
        const tapDelayMs = delayToFirst;
        const playDelayMs = delayToFirst + (countIn - 1) * beatMs;

        const tapTid = window.setTimeout(() => {
          playingStartMsRef.current = performance.now() + countIn * beatMs;
        }, tapDelayMs);
        timersRef.current.push(tapTid);

        const delayTid = window.setTimeout(() => {
          playStarted = true;
          countInLabelsActiveRef.current = false;
          hapticsPlayingStart();
          setPhase("playing");
          scheduleMetronomeHaptics(playingStartMsRef.current, 0);
          const endTid = window.setTimeout(() => {
            const currentRhythm = rhythmRef.current;
            if (!currentRhythm) return;
            const res = scoreTaps(
              currentRhythm.events,
              tapsRef.current,
              playingStartMsRef.current,
              bpmRef.current,
            );
            setScore(res);
            setPhase("result");
          }, totalMs + 100);
          timersRef.current.push(endTid);
        }, playDelayMs);
        timersRef.current.push(delayTid);
        return;
      }

      if (ctx2.currentTime < tapEnabledCtx - 0.0005) {
        losWaitRafRef.current = requestAnimationFrame(
          startPlayingSyncedToAudio,
        );
        return;
      }

      if (!tapGateOpenedRef.current) {
        tapGateOpenedRef.current = true;
        const nowGate = performance.now();
        const ctxGate = ctx2.currentTime;
        playingStartMsRef.current = nowGate - (ctxGate - rhythmStartCtx) * 1000;
      }

      if (ctx2.currentTime < lastCountInClickCtx - 0.0005) {
        losWaitRafRef.current = requestAnimationFrame(
          startPlayingSyncedToAudio,
        );
        return;
      }

      playStarted = true;
      losWaitRafRef.current = null;

      countInLabelsActiveRef.current = false;
      hapticsPlayingStart();
      setPhase("playing");

      /** Klicks exakt auf dem Scoring-Raster (t=0 + k·Puls) — kein +20-ms-Versatz. */
      scheduleMetronomeHaptics(playingStartMsRef.current, 0);

      let k = 0;
      // Nur Schläge innerhalb der Rhythmusdauer — kein Extra-Klick nach Takt-/Figurenende.
      while (k * beatMs < totalMs) {
        // Taktanfänge (Schlag 1) akzentuieren — Orientierung wie beim Einzählen.
        engine.scheduleClick(
          rhythmStartCtx + k * beatSec,
          k % beatsPerBar === 0,
        );
        k++;
      }

      const rhythmEndWallMs = playingStartMsRef.current + totalMs;
      const endDelayMs = Math.max(0, rhythmEndWallMs - performance.now() + 100);

      const endTid = window.setTimeout(() => {
        const currentRhythm = rhythmRef.current;
        if (!currentRhythm) return;
        const res = scoreTaps(
          currentRhythm.events,
          tapsRef.current,
          playingStartMsRef.current,
          bpmRef.current,
        );
        setScore(res);
        setPhase("result");
      }, endDelayMs);
      timersRef.current.push(endTid);
    };

    losWaitRafRef.current = requestAnimationFrame(startPlayingSyncedToAudio);
  }, [clearTimers, engine]);

  const handleRetry = useCallback(() => {
    clearTimers();
    beatTimingRef.current = null;
    setScore(null);
    setTapAllowed(false);
    setPhase("idle");
    setRhythm(null);
  }, [clearTimers]);

  /** Gleicher Rhythmus nochmal: zurück zur Vorschau, Tipp-Liste wird im Countdown geleert. */
  const handleRepeat = useCallback(() => {
    clearTimers();
    engine.cancelScheduled();
    beatTimingRef.current = null;
    setScore(null);
    setTapAllowed(false);
    setPhase("preview");
  }, [clearTimers, engine]);

  const handleNext = useCallback(() => {
    clearTimers();
    setTapAllowed(false);
    startNewRhythm();
  }, [clearTimers, startNewRhythm]);

  /** Tab/App in den Hintergrund während Einzählen/Spielen: sauber abbrechen. */
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      const p = phaseRef.current;
      if (p !== "countdown" && p !== "playing") return;
      clearTimers();
      engine.cancelScheduled();
      countInLabelsActiveRef.current = false;
      tapsRef.current = [];
      beatTimingRef.current = null;
      setTapAllowed(false);
      setScore(null);
      setInterruptNotice("Unterbrochen — starte den Versuch neu.");
      setPhase("preview");
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [clearTimers, engine]);

  /** Screenreader-Text zur Figur (das Notenbild selbst ist aria-hidden). */
  const rhythmDescription = useMemo(
    () => (rhythm ? describeRhythmGerman(rhythm) : null),
    [rhythm],
  );

  /** Urteil je Event-Index (Pausen: undefined) für farbige Notenköpfe im Ergebnis. */
  const eventVerdicts = useMemo(() => {
    if (!rhythm || !score) return undefined;
    const verdicts: (OnsetVerdict | undefined)[] = [];
    let onsetIdx = 0;
    for (const e of rhythm.events) {
      if (e.isRest) {
        verdicts.push(undefined);
      } else {
        verdicts.push(score.onsetVerdicts[onsetIdx]);
        onsetIdx++;
      }
    }
    return verdicts;
  }, [rhythm, score]);

  const step = gameStepIndex(phase);
  const stepLabels = ["Setup", "Anhören", "Mitspielen", "Ergebnis"];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 md:gap-6">
      <GameStepIndicator steps={stepLabels} current={step} />

      {phase === "idle" && (
        <div className="space-y-5 md:space-y-6">
          <div className="text-center">
            <Music
              className="text-primary mx-auto h-11 w-11 stroke-[1.45] md:h-16 md:w-16 md:stroke-[1.35]"
              aria-hidden
            />
            <h2 className="text-dark dark:text-dark-text mt-2 text-xl font-bold tracking-tight md:mt-3 md:text-3xl">
              Rhythmus mitspielen
            </h2>
            <p className="text-dark dark:text-dark-text-secondary mx-auto mt-2 max-w-md text-sm md:text-base">
              Höre den Rhythmus, tippe mit dem Metronom mit — am Ende siehst du,
              wie gut du im Takt warst.
            </p>
          </div>

          <div>
            <p className="text-dark dark:text-dark-text mb-2 text-center text-sm font-bold">
              Wie schwer darf es sein?
            </p>
            <div className="grid gap-2 sm:grid-cols-3 md:gap-3">
              {DIFFICULTY_CARDS.map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setDifficulty(c.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors active:scale-[0.99] md:gap-1.5 md:p-4",
                      GAME_FOCUS_RING,
                      difficulty === c.id
                        ? "border-primary bg-amber-50/90 dark:bg-amber-950/30"
                        : "border-dark-border/50 hover:border-primary/40 dark:border-dark-border dark:hover:border-primary/35 bg-transparent",
                    )}
                  >
                    <Icon
                      className="text-primary h-8 w-8 shrink-0 stroke-[1.6] md:h-10 md:w-10 md:stroke-[1.5]"
                      aria-hidden
                    />
                    <span className="text-dark dark:text-dark-text font-bold">
                      {c.title}
                    </span>
                    <span className="text-dark dark:text-dark-text-muted text-xs leading-snug">
                      {c.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-dark dark:text-dark-text mb-2 text-center text-sm font-bold">
              Wie schnell? (Tempo)
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                className={cn(
                  "border-dark-border text-dark hover:bg-background-secondary dark:border-dark-border dark:hover:bg-dark-background h-12 min-w-[3rem] rounded-lg border text-xl font-bold transition active:scale-[0.98]",
                  GAME_FOCUS_RING,
                )}
                onClick={() => setBpm((b) => Math.max(40, b - 4))}
                aria-label="Tempo verlangsamen"
              >
                −
              </button>
              <div className="bg-primary/10 dark:bg-primary/15 flex min-w-[5.5rem] flex-col items-center rounded-lg px-4 py-2">
                <span className="text-dark dark:text-dark-text text-3xl font-bold tabular-nums">
                  {bpm}
                </span>
                <span className="text-dark dark:text-dark-text-muted text-xs font-semibold uppercase">
                  BPM
                </span>
              </div>
              <button
                type="button"
                className={cn(
                  "border-dark-border text-dark hover:bg-background-secondary dark:border-dark-border dark:hover:bg-dark-background h-12 min-w-[3rem] rounded-lg border text-xl font-bold transition active:scale-[0.98]",
                  GAME_FOCUS_RING,
                )}
                onClick={() => setBpm((b) => Math.min(200, b + 4))}
                aria-label="Tempo erhöhen"
              >
                +
              </button>
              <button
                type="button"
                className={cn(
                  "border-dark-border text-dark hover:bg-background-secondary dark:border-dark-border dark:hover:bg-dark-background inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition active:scale-[0.98]",
                  GAME_FOCUS_RING,
                )}
                onClick={() => setBpm(randomBpm())}
              >
                <Dices
                  className="text-primary h-4 w-4 shrink-0 stroke-[1.75]"
                  aria-hidden
                />
                Überraschung
              </button>
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={handleIdleStart}
          >
            Los geht&apos;s!
          </Button>
        </div>
      )}

      {(phase === "preview" || phase === "countdown" || phase === "playing") &&
        rhythm && (
          <div className="relative flex flex-col gap-4 md:gap-5">
            <div className="text-center">
              {phase === "preview" && (
                <>
                  <p className="text-dark dark:text-dark-text font-bold md:text-lg">
                    Zuerst anhören — oder gleich mitspielen
                  </p>
                  {interruptNotice && (
                    <p
                      className="mt-1 text-sm font-semibold text-amber-700 dark:text-amber-300"
                      role="status"
                    >
                      {interruptNotice}
                    </p>
                  )}
                </>
              )}
              {phase === "countdown" && (
                <p className="text-dark dark:text-dark-text font-bold md:text-lg">
                  Einzählen … dann mitklatschen!
                </p>
              )}
              {phase === "playing" && (
                <p className="text-dark dark:text-dark-text font-bold md:text-lg">
                  Jetzt im Takt bleiben!
                </p>
              )}
              {(phase === "countdown" || phase === "playing") && (
                <BeatPulse timingRef={beatTimingRef} />
              )}
            </div>

            <div className="relative shrink-0">
              <RhythmDisplayLoader
                events={rhythm.events}
                timeSignature={rhythm.timeSignature}
                bars={rhythm.bars}
                barStartEventIndices={rhythm.barStartEventIndices}
              />
              {rhythmDescription && (
                <p className="sr-only">{rhythmDescription}</p>
              )}
              {phase === "countdown" && (
                <div
                  className={cn(
                    /* Leichtes Overlay ohne Blur: Noten bleiben zum Vorauslesen sichtbar. */
                    "pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center rounded-lg",
                    countInBeats > 1 && countLabel < countInBeats - 1
                      ? "bg-background/40 dark:bg-dark-background/40"
                      : "bg-transparent",
                  )}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {countLabel >= 0 ? (
                    <p
                      key={countLabel}
                      className="rhythm-count-pop text-primary text-6xl font-bold tabular-nums md:text-8xl"
                    >
                      {countLabel + 1}
                    </p>
                  ) : (
                    /* Platzhalter, bis die „1“ synchron zum ersten Klick erscheint. */
                    <p
                      className="text-primary text-6xl font-bold tabular-nums opacity-0 md:text-8xl"
                      aria-hidden="true"
                    >
                      1
                    </p>
                  )}
                  <span className="text-dark dark:text-dark-text mt-2 text-sm font-bold opacity-90">
                    mitzählen
                  </span>
                </div>
              )}
            </div>

            {phase === "preview" && (
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-stretch">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => void playPreview()}
                >
                  {previewHeard ? "Nochmal anhören" : "Anhören"}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="flex-1"
                  onClick={() => void beginCountdown()}
                >
                  Jetzt mitspielen!
                </Button>
              </div>
            )}

            <GameDock>
              <TapButton
                disabled={
                  phase === "preview" || (phase === "countdown" && !tapAllowed)
                }
                label={
                  phase === "playing" || (phase === "countdown" && tapAllowed)
                    ? "Tipp-tipp!"
                    : phase === "countdown"
                      ? /* Nur kurz sichtbar, bis das Audio steht und die Tippfläche öffnet. */
                        "Gleich …"
                      : /* In der Vorschau ist die Fläche gesperrt — nicht „tappbar“ aussehen lassen. */
                        "Erst anhören"
                }
                onTap={(t) => {
                  const wall = engine.adjustTapTimeForOutputLatency(t);
                  tapsRef.current.push(wall);
                  const r = rhythmRef.current;
                  if (r) {
                    engine.playTapPitchForOffset(
                      r.events,
                      wall - playingStartMsRef.current,
                    );
                  }
                }}
              />
            </GameDock>
          </div>
        )}

      {phase === "result" && score && rhythm && (
        <div className="flex flex-col gap-4 md:gap-6">
          <RhythmDisplayLoader
            events={rhythm.events}
            timeSignature={rhythm.timeSignature}
            bars={rhythm.bars}
            barStartEventIndices={rhythm.barStartEventIndices}
            eventVerdicts={eventVerdicts}
          />
          {rhythmDescription && <p className="sr-only">{rhythmDescription}</p>}
          <ResultView
            result={score}
            onRetry={handleRetry}
            onRepeat={handleRepeat}
            onNext={handleNext}
          />
          {aggregates && aggregates.plays > 0 && (
            <p className="text-dark dark:text-dark-text-muted text-center text-sm">
              Persönlicher Rekord:{" "}
              <span className="text-dark dark:text-dark-text font-bold">
                {aggregates.bestScore}%
              </span>{" "}
              · {aggregates.plays} {aggregates.plays === 1 ? "Runde" : "Runden"}{" "}
              gespielt
            </p>
          )}
        </div>
      )}
    </div>
  );
}
