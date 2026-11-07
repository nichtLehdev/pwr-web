"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
import {
  GameBarSlot,
  GameDock,
  useGameShell,
} from "../../../_components/game-shell-context";
import { useGameStats } from "../../../_lib/stats/use-game-stats";
import { RhythmAudio } from "../../../_lib/rhythm/audio";
import { pickMeter } from "../../../_lib/rhythm/generator";
import { LEVELS, levelById, type Level } from "../../../_lib/rhythm/levels";
import type { RhythmEvent, TimeSignature } from "../../../_lib/rhythm/types";
import { Conductor, type Attempt } from "../_lib/conductor";
import { summarize, type SessionSummary } from "../_lib/feedback";
import { loadLatencyMs } from "../_lib/latency";
import {
  DEFAULT_PREFS,
  loadPrefs,
  loadProgress,
  mergeProgress,
  nextLevel,
  savePrefs,
  saveProgress,
  startBpm,
  type Prefs,
  type Progress,
} from "../_lib/prefs";
import {
  AnswerPlan,
  AnswerScript,
  BandScript,
  createBandBars,
  figuresForLevel,
} from "../_lib/session-script";
import { rankFor, totalStars } from "../_lib/ranks";
import { AnswerStage } from "./answer-stage";
import { BandStage } from "./band-stage";
import { CalibrationView } from "./calibration-view";
import { PlayPad } from "./play-pad";
import { ResultView } from "./result-view";
import { SetupView } from "./setup-view";

type View = "setup" | "calibrate" | "play" | "result";

type Session = {
  conductor: Conductor;
  level: Level;
  /** Nur beim Notenband: Es zeichnet alle Takte vorab bekannt. */
  band: { bars: RhythmEvent[][]; ts: TimeSignature; bpm: number } | null;
  startedAt: number;
};

export function RhythmGame() {
  const { setScrollLocked } = useGameShell();
  const { recordResult } = useGameStats("rhythmus");
  const [view, setView] = useState<View>("setup");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [progress, setProgress] = useState<Progress>({});
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [bestStreak, setBestStreak] = useState(0);
  const [reward, setReward] = useState({
    points: 0,
    isRecord: false,
    rankUp: null as string | null,
  });
  const [isListening, setIsListening] = useState(true);

  const [audio] = useState(() => new RhythmAudio());
  const sessionRef = useRef<Session | null>(null);
  const prefsRef = useRef(prefs);
  const progressRef = useRef(progress);
  useEffect(() => {
    prefsRef.current = prefs;
    progressRef.current = progress;
  }, [prefs, progress]);

  // localStorage erst nach dem Mount lesen (SSR-sicher).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Serverbild und Speicher unterscheiden sich
    setPrefs(loadPrefs());
    setProgress(loadProgress());
    setLatencyMs(loadLatencyMs());
  }, []);

  useEffect(() => {
    setScrollLocked(view === "play");
    return () => setScrollLocked(false);
  }, [view, setScrollLocked]);

  const changePrefs = useCallback((next: Prefs) => {
    setPrefs(next);
    savePrefs(next);
  }, []);

  const finish = useCallback(
    (active: Session, attempts: Attempt[]) => {
      const result = summarize(attempts);
      const { fixedBpm, mode, input } = prefsRef.current;
      const awardsStars = fixedBpm === null;
      setSummary(result);
      setBestStreak(active.conductor.judge.bestStreak);
      recordResult({
        score: result.percent,
        maxScore: 100,
        streak: active.conductor.judge.bestStreak,
        durationMs: Math.round(performance.now() - active.startedAt),
        meta: {
          level: active.level.id,
          mode,
          input,
          bpm: result.bpm,
          fixedTempo: !awardsStars,
        },
      });
      const points = active.conductor.points;
      let isRecord = false;
      let rankUp: string | null = null;
      if (awardsStars) {
        const before = progressRef.current;
        const merged = mergeProgress(before, active.level.id, {
          stars: result.stars,
          percent: result.percent,
          points,
          bpm: result.bpm,
        });
        const previousBest = before[active.level.id]?.bestPoints ?? 0;
        isRecord = previousBest > 0 && points > previousBest;
        const newRank = rankFor(totalStars(merged)).title;
        if (newRank !== rankFor(totalStars(before)).title) rankUp = newRank;
        setProgress(merged);
        saveProgress(merged);
      }
      setReward({ points, isRecord, rankUp });
      sessionRef.current = null;
      setSession(null);
      setView("result");
    },
    [recordResult],
  );

  const start = useCallback(
    async (level: Level) => {
      await audio.ensure();
      const { mode, input, fixedBpm } = prefsRef.current;
      const ts = pickMeter(level);
      const bpm = fixedBpm ?? startBpm(level, progressRef.current);
      const latencySec = latencyMs === null ? null : latencyMs / 1000;

      let band: Session["band"] = null;
      let script;
      if (mode === "band") {
        const bars = createBandBars(level, ts);
        band = { bars, ts, bpm };
        script = new BandScript(bars, ts, bpm);
      } else {
        const total = figuresForLevel(level);
        const plan = new AnswerPlan(level, ts, total, {
          start: bpm,
          fixed: fixedBpm !== null,
        });
        script = new AnswerScript(plan, ts, total);
      }

      const conductor = new Conductor(audio, script, {
        input,
        leniency: level.leniency,
        latencySec,
      });
      const active: Session = {
        conductor,
        level,
        band,
        startedAt: performance.now(),
      };
      conductor.subscribe({
        onFinish: (attempts) => finish(active, attempts),
        onSegment: (segment) => setIsListening(segment.kind === "call"),
      });
      sessionRef.current = active;
      setSession(active);
      setNotice(null);
      setIsListening(true);
      setView("play");
      // Erst die Bühne einhängen, dann losspielen: Sonst fehlt ihr der Beginn.
      requestAnimationFrame(() => conductor.start());
    },
    [audio, finish, latencyMs],
  );

  const abort = useCallback((message: string | null) => {
    sessionRef.current?.conductor.stop();
    sessionRef.current = null;
    setSession(null);
    setNotice(message);
    setView("setup");
  }, []);

  /** Im Hintergrund läuft die Audiouhr anders weiter: Die Runde wäre nicht mehr fair. */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && sessionRef.current) {
        abort("Unterbrochen, starte die Runde neu.");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [abort]);

  useEffect(
    () => () => {
      sessionRef.current?.conductor.stop();
      audio.close();
    },
    [audio],
  );

  const currentLevel = levelById(prefs.levelId) ?? LEVELS[0]!;
  const following = nextLevel(currentLevel);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-[clamp(0.5rem,1.8svh,1.25rem)]">
      {view === "setup" && (
        <SetupView
          prefs={prefs}
          progress={progress}
          notice={notice}
          onChange={changePrefs}
          onStart={() => void start(currentLevel)}
          onCalibrate={() => setView("calibrate")}
        />
      )}

      {view === "calibrate" && (
        <CalibrationView
          audio={audio}
          latencyMs={latencyMs}
          onChange={setLatencyMs}
          onClose={() => setView("setup")}
        />
      )}

      {view === "play" && session && (
        <>
          <GameBarSlot>
            <button
              type="button"
              onClick={() => abort(null)}
              className={cn(
                "semi-condensed border-rule text-dark hover:bg-rule/25 dark:border-night-rule dark:text-night-muted dark:hover:bg-night-raised -mr-1 inline-flex min-h-11 items-center gap-1.5 border px-2.5 text-xs font-bold tracking-[0.06em] uppercase transition-colors",
                GAME_FOCUS_RING,
              )}
            >
              <X className="h-4 w-4 shrink-0" aria-hidden />
              Abbrechen
            </button>
          </GameBarSlot>
          {session.band ? (
            <BandStage
              conductor={session.conductor}
              bars={session.band.bars}
              timeSignature={session.band.ts}
              bpm={session.band.bpm}
            />
          ) : (
            <AnswerStage conductor={session.conductor} />
          )}
          <GameDock>
            <PlayPad
              label={
                isListening && !session.band
                  ? "Hör zu …"
                  : prefs.input === "hold"
                    ? "Drücken und halten"
                    : "Tippen"
              }
              emphasized={!isListening || session.band !== null}
              hint={
                prefs.input === "hold" ? "Halten mit der" : "Tippen mit der"
              }
              onPress={(t) => session.conductor.press(t)}
              onRelease={(t) => session.conductor.release(t)}
            />
          </GameDock>
        </>
      )}

      {view === "result" && summary && (
        <ResultView
          summary={summary}
          nextLevel={following}
          bestStreak={bestStreak}
          points={reward.points}
          isRecord={reward.isRecord}
          rankUp={reward.rankUp}
          awardsStars={prefs.fixedBpm === null}
          audio={audio}
          onAgain={() => void start(currentLevel)}
          onNext={() => {
            if (!following) return;
            changePrefs({ ...prefs, levelId: following.id });
            prefsRef.current = { ...prefs, levelId: following.id };
            void start(following);
          }}
          onSetup={() => {
            audio.cancelScheduled();
            setView("setup");
          }}
        />
      )}
    </div>
  );
}
