"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RhythmEvent } from "../_lib/types";
import {
  getNoteOnsetPitches,
  keyClosestToOffset,
  keyToFrequencyHz,
} from "../_lib/note-pitch";

function clickBuffer(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 0.05;
  const n = Math.floor(sampleRate * duration);
  const buf = ctx.createBuffer(1, n, sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 35);
    data[i] = env * (Math.random() * 2 - 1) * 0.35;
  }
  return buf;
}

/** Geplante Quelle + Gain — für hartes Stoppen bei `cancelScheduled`. */
type ScheduledNodes = { src: AudioScheduledSourceNode; gain: GainNode };

/** Short “note” tone: triangle + quick envelope (no external samples). */
function schedulePitchedTone(
  ctx: AudioContext,
  atCtxTime: number,
  frequencyHz: number,
  durationSec: number,
  peakGain: number,
  destination: AudioNode,
): ScheduledNodes {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = frequencyHz;

  const g = ctx.createGain();
  g.gain.value = 0;
  osc.connect(g);
  g.connect(destination);

  const startAt = Math.max(atCtxTime, ctx.currentTime + 0.005);
  const attack = Math.min(0.012, durationSec * 0.15);
  const release = Math.min(0.12, durationSec * 0.45);
  const sustainEnd = Math.max(
    startAt + attack,
    startAt + durationSec - release,
  );

  g.gain.setValueAtTime(0, startAt);
  g.gain.linearRampToValueAtTime(peakGain, startAt + attack);
  g.gain.setValueAtTime(peakGain, sustainEnd);
  g.gain.exponentialRampToValueAtTime(0.001, startAt + durationSec);

  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.02);

  return { src: osc, gain: g };
}

/** Tap feedback: very short attack so sound lines up with key/pointer (preview tones keep softer ramp). */
function scheduleTapFeedbackTone(
  ctx: AudioContext,
  frequencyHz: number,
  destination: AudioNode,
): void {
  const durationSec = 0.085;
  const peakGain = 0.2;
  const startAt = ctx.currentTime + 0.001;
  const attack = 0.002;
  const sustainEnd = startAt + attack + 0.012;

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = frequencyHz;

  const g = ctx.createGain();
  g.gain.value = 0;
  osc.connect(g);
  g.connect(destination);

  g.gain.setValueAtTime(0, startAt);
  g.gain.linearRampToValueAtTime(peakGain, startAt + attack);
  g.gain.setValueAtTime(peakGain, sustainEnd);
  g.gain.exponentialRampToValueAtTime(0.001, startAt + durationSec);

  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.02);
}

export interface MetronomeEngine {
  ensureAudio: () => Promise<AudioContext>;
  getContext: () => AudioContext | null;
  nowCtx: () => number;
  /** `volume` überschreibt die Standard-Lautstärke (z. B. leiser Vorschau-Klick). */
  scheduleClick: (atCtxTime: number, accent?: boolean, volume?: number) => void;
  schedulePreview: (
    events: RhythmEvent[],
    startCtxTime: number,
    rhythmStartOffsetMs: number,
  ) => void;
  /** Immediate feedback: pitch matches the note closest to this offset in the rhythm. */
  playTapPitchForOffset: (
    events: RhythmEvent[],
    offsetFromPlayingStartMs: number,
  ) => void;
  /**
   * `performance.now()` at input minus `AudioContext.outputLatency` when available,
   * so scoring matches when the click is heard (not when the buffer is scheduled).
   */
  adjustTapTimeForOutputLatency: (wallMs: number) => number;
  cancelScheduled: () => void;
}

export function useMetronomeEngine(): MetronomeEngine {
  const ctxRef = useRef<AudioContext | null>(null);
  const noiseBufRef = useRef<AudioBuffer | null>(null);
  const scheduledRef = useRef<ScheduledNodes[]>([]);

  /** Merken + nach Ende selbst austragen, damit die Liste nicht wächst. */
  const registerScheduled = useCallback((entry: ScheduledNodes) => {
    scheduledRef.current.push(entry);
    entry.src.addEventListener("ended", () => {
      scheduledRef.current = scheduledRef.current.filter((e) => e !== entry);
    });
  }, []);

  const ensureAudio = useCallback(async () => {
    const Ctx =
      window.AudioContext ??
      (
        window as unknown as {
          webkitAudioContext?: typeof window.AudioContext;
        }
      ).webkitAudioContext;
    if (!Ctx) {
      throw new Error("Web Audio API nicht verfügbar");
    }
    if (!ctxRef.current) {
      ctxRef.current = new Ctx();
      noiseBufRef.current = clickBuffer(ctxRef.current);
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return ctx;
  }, []);

  const getContext = useCallback(() => ctxRef.current, []);

  const nowCtx = useCallback(() => {
    return ctxRef.current?.currentTime ?? 0;
  }, []);

  const scheduleClick = useCallback(
    (atCtxTime: number, accent = false, volume?: number) => {
      const ctx = ctxRef.current;
      const buf = noiseBufRef.current;
      if (!ctx || !buf) return;

      const gain = ctx.createGain();
      gain.gain.value = volume ?? (accent ? 0.55 : 0.38);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(gain);
      gain.connect(ctx.destination);

      const t = Math.max(atCtxTime, ctx.currentTime + 0.02);
      src.start(t);
      registerScheduled({ src, gain });
    },
    [registerScheduled],
  );

  const schedulePreview = useCallback(
    (
      events: RhythmEvent[],
      startCtxTime: number,
      rhythmStartOffsetMs: number,
    ) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      const offsetSec = rhythmStartOffsetMs / 1000;
      const pitches = getNoteOnsetPitches(events);

      for (const { onsetMs, key, durationMs } of pitches) {
        const hz = keyToFrequencyHz(key);
        const t = startCtxTime + offsetSec + onsetMs / 1000;
        const noteSec = durationMs / 1000;
        const dur = Math.min(0.42, Math.max(0.08, noteSec * 0.55));
        const peak = Math.min(0.22, 0.12 + Math.min(noteSec * 0.08, 0.1));
        registerScheduled(
          schedulePitchedTone(ctx, t, hz, dur, peak, ctx.destination),
        );
      }
    },
    [registerScheduled],
  );

  const playTapPitchForOffset = useCallback(
    (events: RhythmEvent[], offsetFromPlayingStartMs: number) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") void ctx.resume();
      const key = keyClosestToOffset(events, offsetFromPlayingStartMs);
      const hz = keyToFrequencyHz(key);
      scheduleTapFeedbackTone(ctx, hz, ctx.destination);
    },
    [],
  );

  const adjustTapTimeForOutputLatency = useCallback((wallMs: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return wallMs;
    if (typeof ctx.outputLatency !== "number") return wallMs;
    return wallMs - ctx.outputLatency * 1000;
  }, []);

  const cancelScheduled = useCallback(() => {
    // Geplante Quellen wirklich stoppen — sonst stapeln sich Vorschauen
    // („Nochmal anhören“) und Töne bluten in den Einzähler.
    for (const { src, gain } of scheduledRef.current) {
      try {
        src.stop();
      } catch {
        /* schon gestoppt/nie gestartet */
      }
      try {
        src.disconnect();
        gain.disconnect();
      } catch {
        /* noop */
      }
    }
    scheduledRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      void ctxRef.current?.close();
      ctxRef.current = null;
      noiseBufRef.current = null;
    };
  }, []);

  return {
    ensureAudio,
    getContext,
    nowCtx,
    scheduleClick,
    schedulePreview,
    playTapPitchForOffset,
    adjustTapTimeForOutputLatency,
    cancelScheduled,
  };
}
