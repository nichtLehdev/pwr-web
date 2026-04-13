"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Difficulty } from "../_lib/types";
import {
  countInBeatsForRhythm,
  generateRhythm,
  totalRhythmDurationMs,
} from "../_lib/rhythm-generator";
import type { GeneratedRhythm } from "../_lib/types";
import {
  hapticsCountdownBeat,
  hapticsMetronomeBeat,
  hapticsPlayingStart,
} from "../_lib/haptics";
import { scoreTaps, type ScoreResult } from "../_lib/scoring";
import { useMetronomeEngine } from "./use-metronome-engine";
import { RhythmDisplayLoader } from "./rhythm-display-loader";
import { TapDockPortal } from "./tap-dock-portal";
import { TapButton } from "./tap-button";
import { ResultView } from "./result-view";

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
  emoji: string;
}[] = [
  {
    id: "beginner",
    title: "Leicht",
    hint: "Viertel im 4/4 — super zum Reinkommen",
    emoji: "🌟",
  },
  {
    id: "intermediate",
    title: "Mittel",
    hint: "Achtel & mehrere Taktarten",
    emoji: "🎯",
  },
  {
    id: "advanced",
    title: "Schwer",
    hint: "Sechzehntel, Synkopen, Triolen …",
    emoji: "🚀",
  },
];

export function RhythmGame() {
  const engine = useMetronomeEngine();
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [bpm, setBpm] = useState(96);
  const [rhythm, setRhythm] = useState<GeneratedRhythm | null>(null);
  const [countLabel, setCountLabel] = useState(0);
  /** Länge des Einzählers (1…N) für Anzeige & Overlay. */
  const [countInBeats, setCountInBeats] = useState(4);
  /** Nach Einplanen des Einzählers: Tippfläche aktiv; Rhythmus-Nullpunkt wird zur ersten Audio-Sync-Runde verfeinert. */
  const [tapAllowed, setTapAllowed] = useState(false);
  const [score, setScore] = useState<ScoreResult | null>(null);

  const tapsRef = useRef<number[]>([]);
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
  const bpmRef = useRef(bpm);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

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

  /** Nur in „playing“: kein Seiten-Scroll (Tippen); andere Phasen dürfen scrollen. */
  useEffect(() => {
    const root = document.documentElement;
    if (phase === "playing") {
      root.classList.add("modal-open");
      document.body.classList.add("modal-open");
    } else {
      root.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
    }
    return () => {
      root.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
    };
  }, [phase]);

  const startNewRhythm = useCallback(() => {
    const r = generateRhythm(difficulty, bpmRef.current);
    setRhythm(r);
    setPhase("preview");
    setScore(null);
    setTapAllowed(false);
    tapsRef.current = [];
  }, [difficulty]);

  const handleIdleStart = useCallback(() => {
    startNewRhythm();
  }, [startNewRhythm]);

  const playPreview = useCallback(async () => {
    const r = rhythmRef.current;
    if (!r) return;
    const ctx = await engine.ensureAudio();
    engine.cancelScheduled();
    const start = ctx.currentTime + 0.12;
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
    tapGateOpenedRef.current = false;
    countInLabelsActiveRef.current = true;
    setPhase("countdown");
    setCountLabel(0);

    const ctx = await engine.ensureAudio();
    engine.cancelScheduled();

    const beatMs = 60000 / bpmRef.current;
    const beatSec = beatMs / 1000;

    // Ein Anker: ctx-Zeit und performance.now() in einem Rutsch — sonst liegen
    // setTimeout (ab Registrierung) und scheduleClick (Audio) auseinander.
    const ctxAtAnchor = ctx.currentTime;
    const wallAnchor = performance.now();
    const firstClickCtx = ctxAtAnchor + 0.12;
    /** Erster Rhythmus-Schlag (t=0): eine Viertel nach dem letzten Einzählschlag. */
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
          wallAnchor +
          msToFirstClick +
          i * beatMs +
          heardLatencyMs;
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
          playingStartMsRef.current =
            performance.now() + countIn * beatMs;
        }, tapDelayMs);
        timersRef.current.push(tapTid);

        const delayTid = window.setTimeout(() => {
          playStarted = true;
          countInLabelsActiveRef.current = false;
          hapticsPlayingStart();
          setPhase("playing");
          scheduleMetronomeHaptics(playingStartMsRef.current, 20);
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
        losWaitRafRef.current = requestAnimationFrame(startPlayingSyncedToAudio);
        return;
      }

      if (!tapGateOpenedRef.current) {
        tapGateOpenedRef.current = true;
        const nowGate = performance.now();
        const ctxGate = ctx2.currentTime;
        playingStartMsRef.current =
          nowGate - (ctxGate - rhythmStartCtx) * 1000;
      }

      if (ctx2.currentTime < lastCountInClickCtx - 0.0005) {
        losWaitRafRef.current = requestAnimationFrame(startPlayingSyncedToAudio);
        return;
      }

      playStarted = true;
      losWaitRafRef.current = null;

      countInLabelsActiveRef.current = false;
      hapticsPlayingStart();
      setPhase("playing");

      const metronomeAnchorCtx = rhythmStartCtx + 0.02;
      scheduleMetronomeHaptics(
        playingStartMsRef.current,
        (metronomeAnchorCtx - rhythmStartCtx) * 1000,
      );

      let k = 0;
      // Nur Schläge innerhalb der Rhythmusdauer — kein Extra-Klick nach Takt-/Figurenende.
      while (k * beatMs < totalMs) {
        engine.scheduleClick(metronomeAnchorCtx + k * beatSec, false);
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
    setScore(null);
    setTapAllowed(false);
    setPhase("idle");
    setRhythm(null);
  }, [clearTimers]);

  const handleNext = useCallback(() => {
    clearTimers();
    setTapAllowed(false);
    startNewRhythm();
  }, [clearTimers, startNewRhythm]);

  const step = gameStepIndex(phase);
  const stepLabels = ["Setup", "Anhören", "Mitspielen", "Ergebnis"];

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-5xl flex-col gap-4 md:gap-6",
        "rounded-3xl bg-gradient-to-b from-amber-50/90 via-white to-sky-100/80 p-3 shadow-inner dark:from-amber-950/25 dark:via-dark-background dark:to-sky-950/20 md:p-5",
      )}
    >
      <div
        className="flex flex-wrap items-center justify-center gap-2"
        role="list"
        aria-label="Spielschritte"
      >
        {stepLabels.map((label, i) => (
          <div
            key={label}
            role="listitem"
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold tracking-wide transition-colors md:px-4 md:text-sm",
              i === step
                ? "bg-primary text-white shadow-md shadow-amber-500/30"
                : i < step
                  ? "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
                  : "bg-white/60 text-dark/50 dark:bg-dark-surface/60 dark:text-dark-text-muted",
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {phase === "idle" && (
        <div className="dark:border-dark-border/80 space-y-5 rounded-3xl border-2 border-amber-200/80 bg-white/90 p-4 shadow-lg shadow-amber-200/40 backdrop-blur-sm dark:border-cyan-500/20 dark:bg-dark-surface/95 dark:shadow-cyan-950/30 md:space-y-6 md:p-8">
          <div className="text-center">
            <p className="text-4xl md:text-5xl" aria-hidden>
              🎵
            </p>
            <h2 className="text-dark dark:text-dark-text mt-2 font-black tracking-tight text-2xl md:text-3xl">
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
            <div className="grid gap-3 sm:grid-cols-3">
              {DIFFICULTY_CARDS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setDifficulty(c.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl border-2 p-4 text-center transition-all active:scale-[0.98]",
                    difficulty === c.id
                      ? "border-primary bg-gradient-to-b from-amber-50 to-orange-50 shadow-md dark:from-amber-950/40 dark:to-orange-950/30"
                      : "border-gray-200 bg-white/80 hover:border-amber-300 dark:border-dark-border dark:bg-dark-background/50 dark:hover:border-cyan-600/50",
                  )}
                >
                  <span className="text-3xl" aria-hidden>
                    {c.emoji}
                  </span>
                  <span className="text-dark dark:text-dark-text font-bold">
                    {c.title}
                  </span>
                  <span className="text-dark dark:text-dark-text-muted text-xs leading-snug">
                    {c.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-dark dark:text-dark-text mb-2 text-center text-sm font-bold">
              Wie schnell? (Tempo)
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                className="border-dark-border text-dark hover:bg-background-secondary dark:border-dark-border dark:hover:bg-dark-background h-12 min-w-[3rem] rounded-2xl border-2 text-xl font-bold"
                onClick={() => setBpm((b) => Math.max(40, b - 4))}
                aria-label="Tempo verlangsamen"
              >
                −
              </button>
              <div className="bg-primary/10 dark:bg-primary/15 flex min-w-[5.5rem] flex-col items-center rounded-2xl px-4 py-2">
                <span className="text-dark dark:text-dark-text text-3xl font-black tabular-nums">
                  {bpm}
                </span>
                <span className="text-dark dark:text-dark-text-muted text-xs font-semibold uppercase">
                  BPM
                </span>
              </div>
              <button
                type="button"
                className="border-dark-border text-dark hover:bg-background-secondary dark:border-dark-border dark:hover:bg-dark-background h-12 min-w-[3rem] rounded-2xl border-2 text-xl font-bold"
                onClick={() => setBpm((b) => Math.min(200, b + 4))}
                aria-label="Tempo erhöhen"
              >
                +
              </button>
              <button
                type="button"
                className="border-dark-border text-dark hover:bg-background-secondary dark:border-dark-border dark:hover:bg-dark-background rounded-2xl border-2 px-4 py-2 text-sm font-bold"
                onClick={() => setBpm(randomBpm())}
              >
                Überraschung 🎲
              </button>
            </div>
          </div>

          <button
            type="button"
            className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark w-full rounded-2xl px-4 py-4 text-lg font-black text-white shadow-lg shadow-amber-600/25 transition hover:shadow-xl active:scale-[0.99] md:text-xl"
            onClick={handleIdleStart}
          >
            Los geht&apos;s!
          </button>
        </div>
      )}

      {(phase === "preview" ||
        phase === "countdown" ||
        phase === "playing") &&
        rhythm && (
          <div
            className={cn(
              "relative flex flex-col gap-4 md:gap-5",
              /* Platz für fixierte Tipp-Leiste (Mobile), sonst kein sichtbarer Button im Scrollbereich */
              "max-md:pb-[calc(9.75rem+env(safe-area-inset-bottom,0px))]",
            )}
          >
            <div className="text-center">
              {phase === "preview" && (
                <p className="text-dark dark:text-dark-text font-bold md:text-lg">
                  Zuerst anhören — oder gleich mitspielen
                </p>
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
            </div>

            <div className="relative shrink-0">
              <RhythmDisplayLoader
                events={rhythm.events}
                timeSignature={rhythm.timeSignature}
                bars={rhythm.bars}
                barStartEventIndices={rhythm.barStartEventIndices}
              />
              {phase === "countdown" && (
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl",
                    countInBeats > 1 && countLabel < countInBeats - 1
                      ? "bg-gradient-to-br from-fuchsia-600/25 via-amber-400/20 to-sky-500/25 backdrop-blur-[2px] dark:from-fuchsia-900/35 dark:via-amber-900/25 dark:to-sky-900/30"
                      : "bg-transparent",
                  )}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <p
                    key={countLabel}
                    className="rhythm-count-pop text-primary drop-shadow-[0_4px_12px_rgba(250,166,25,0.5)] text-6xl font-black tabular-nums md:text-8xl"
                  >
                    {countLabel + 1}
                  </p>
                  <span className="text-dark dark:text-dark-text mt-2 text-sm font-bold opacity-90">
                    mitzählen
                  </span>
                </div>
              )}
            </div>

            {phase === "preview" && (
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-stretch">
                <button
                  type="button"
                  className="border-dark-border text-dark hover:bg-background-secondary dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:hover:bg-dark-background flex-1 rounded-2xl border-2 px-4 py-4 text-base font-bold transition-colors"
                  onClick={() => void playPreview()}
                >
                  Nochmal anhören
                </button>
                <button
                  type="button"
                  className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark flex-1 rounded-2xl px-4 py-4 text-base font-black text-white shadow-lg shadow-amber-600/30 transition hover:shadow-xl active:scale-[0.99]"
                  onClick={() => void beginCountdown()}
                >
                  Jetzt mitspielen!
                </button>
              </div>
            )}

            <TapDockPortal>
              <TapButton
                disabled={
                  phase === "preview" ||
                  (phase === "countdown" && !tapAllowed)
                }
                label={
                  phase === "playing" || (phase === "countdown" && tapAllowed)
                    ? "Tipp-tipp!"
                    : phase === "countdown"
                      ? "Gleich …"
                      : "Hier tippen"
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
            </TapDockPortal>
          </div>
        )}

      {phase === "result" && score && rhythm && (
        <div className="flex flex-col gap-4 md:gap-6">
          <RhythmDisplayLoader
            events={rhythm.events}
            timeSignature={rhythm.timeSignature}
            bars={rhythm.bars}
            barStartEventIndices={rhythm.barStartEventIndices}
          />
          <ResultView
            result={score}
            onRetry={handleRetry}
            onNext={handleNext}
          />
        </div>
      )}
    </div>
  );
}
