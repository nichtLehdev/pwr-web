"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { TapButton } from "./tap-button";
import { ResultView } from "./result-view";

type GamePhase = "idle" | "preview" | "countdown" | "playing" | "result";

function randomBpm(): number {
  return 60 + Math.floor(Math.random() * 73);
}

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

  useEffect(() => {
    if (phase === "playing" || tapAllowed) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => document.body.classList.remove("modal-open");
  }, [phase, tapAllowed]);

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

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-3 md:gap-8">
      {phase === "idle" && (
        <div className="dark:border-dark-border dark:bg-dark-surface dark:shadow-dark-border space-y-4 rounded-xl border border-gray-200 border-t-4 border-t-district-6 bg-white p-3 shadow-md md:space-y-6 md:p-6">
          <h2 className="text-dark dark:text-dark-text text-lg font-semibold md:text-xl">
            Einstellungen
          </h2>
          <div className="space-y-2">
            <label
              className="text-dark dark:text-dark-text-secondary text-sm font-medium"
              htmlFor="difficulty"
            >
              Schwierigkeit
            </label>
            <select
              id="difficulty"
              className="border-dark-border text-dark focus:ring-primary w-full rounded-lg border bg-white px-3 py-2 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as Difficulty)
              }
            >
              <option value="beginner">Einsteiger (4/4)</option>
              <option value="intermediate">
                Mittel (Achtel, punktiert — 4/4 und 3/4)
              </option>
              <option value="advanced">
                Fortgeschritten (16tel, Synkopen, Triolen — 4/4, 3/4, 6/8)
              </option>
            </select>
          </div>
          <div className="space-y-2">
            <label
              className="text-dark dark:text-dark-text-secondary text-sm font-medium"
              htmlFor="bpm"
            >
              Tempo (BPM)
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id="bpm"
                type="number"
                min={40}
                max={200}
                className="border-dark-border text-dark focus:ring-primary min-w-[120px] flex-1 rounded-lg border px-3 py-2 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
              />
              <button
                type="button"
                className="border-dark-border text-dark hover:bg-background-secondary dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-background rounded-lg border px-4 py-2 text-sm"
                onClick={() => setBpm(randomBpm())}
              >
                Zufall
              </button>
            </div>
          </div>
          <button
            type="button"
            className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark w-full rounded-lg px-4 py-3 font-medium text-white"
            onClick={handleIdleStart}
          >
            Start
          </button>
        </div>
      )}

      {(phase === "preview" ||
        phase === "countdown" ||
        phase === "playing") &&
        rhythm && (
          <div className="relative flex min-h-0 flex-1 flex-col gap-3 md:gap-4">
            <div className="relative shrink-0">
              <RhythmDisplayLoader
                events={rhythm.events}
                timeSignature={rhythm.timeSignature}
                bars={rhythm.bars}
              />
              {phase === "countdown" && (
                <div
                  className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl ${
                    countInBeats > 1 && countLabel < countInBeats - 1
                      ? "bg-black/35 backdrop-blur-[1px] dark:bg-black/45"
                      : "bg-black/0"
                  }`}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <p className="text-primary text-5xl font-bold tabular-nums drop-shadow-lg md:text-6xl">
                    {countLabel + 1}
                  </p>
                </div>
              )}
            </div>

            {phase === "preview" && (
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="border-dark-border text-dark hover:bg-background-secondary dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:hover:bg-dark-background flex-1 rounded-lg border px-4 py-3 transition-colors"
                  onClick={() => void playPreview()}
                >
                  Vorschau abspielen
                </button>
                <button
                  type="button"
                  className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark flex-1 rounded-lg px-4 py-3 font-medium text-white transition-colors"
                  onClick={() => void beginCountdown()}
                >
                  Weiter
                </button>
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col">
              <TapButton
              disabled={
                phase === "preview" ||
                (phase === "countdown" && !tapAllowed)
              }
              label={
                phase === "playing" || (phase === "countdown" && tapAllowed)
                  ? "Tippen"
                  : phase === "countdown"
                    ? "Gleich los"
                    : "Tippfläche"
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
            </div>
          </div>
        )}

      {phase === "result" && score && rhythm && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto md:gap-6">
          <RhythmDisplayLoader
            events={rhythm.events}
            timeSignature={rhythm.timeSignature}
            bars={rhythm.bars}
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
