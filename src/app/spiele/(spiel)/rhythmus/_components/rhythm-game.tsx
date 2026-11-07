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
import type { TimeSignature } from "../../../_lib/rhythm/types";
import { Conductor, type Attempt } from "../_lib/conductor";
import { summarize, type SessionSummary } from "../_lib/feedback";
import {
  ENDLESS_ID,
  ENDLESS_METER,
  EndlessBandScript,
  EndlessPlan,
  loadEndlessRecords,
  mergeEndlessRecord,
  saveEndlessRecords,
  type EndlessRecord,
  type EndlessRecords,
} from "../_lib/endless";
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
  type BandSource,
  type SessionScript,
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
  /** `null`: Endlos. */
  level: Level | null;
  /** Nur beim Notenband: Es zeichnet die kommenden Takte vorab. */
  band: { source: BandSource; ts: TimeSignature } | null;
  /** Nur Endlos: wie weit der Lauf gekommen ist. */
  reached: (() => number) | null;
  startedAt: number;
};

export type EndlessResult = {
  reached: number;
  unit: "Figuren" | "Takte";
  best: EndlessRecord;
  isRecord: boolean;
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
  const [endlessRecords, setEndlessRecords] = useState<EndlessRecords>({});
  const [endlessResult, setEndlessResult] = useState<EndlessResult | null>(
    null,
  );

  const [audio] = useState(() => new RhythmAudio());
  const sessionRef = useRef<Session | null>(null);
  const endlessRecordsRef = useRef(endlessRecords);
  const prefsRef = useRef(prefs);
  const progressRef = useRef(progress);
  useEffect(() => {
    prefsRef.current = prefs;
    progressRef.current = progress;
    endlessRecordsRef.current = endlessRecords;
  }, [prefs, progress, endlessRecords]);

  // localStorage erst nach dem Mount lesen (SSR-sicher).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Serverbild und Speicher unterscheiden sich
    setPrefs(loadPrefs());
    setProgress(loadProgress());
    setLatencyMs(loadLatencyMs());
    setEndlessRecords(loadEndlessRecords());
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
      const isEndless = active.level === null;
      const awardsStars = fixedBpm === null && !isEndless;
      setSummary(result);
      setBestStreak(active.conductor.judge.bestStreak);
      recordResult({
        score: result.percent,
        maxScore: 100,
        streak: active.conductor.judge.bestStreak,
        durationMs: Math.round(performance.now() - active.startedAt),
        meta: {
          level: active.level?.id ?? ENDLESS_ID,
          mode,
          input,
          bpm: result.bpm,
          fixedTempo: !isEndless && !awardsStars,
          ...(active.reached && {
            points: active.conductor.points,
            reached: active.reached(),
          }),
        },
      });
      const points = active.conductor.points;
      let isRecord = false;
      let rankUp: string | null = null;
      setEndlessResult(null);
      if (active.reached) {
        const reached = active.reached();
        const merged = mergeEndlessRecord(endlessRecordsRef.current, mode, {
          points,
          reached,
        });
        setEndlessRecords(merged.records);
        saveEndlessRecords(merged.records);
        setEndlessResult({
          reached,
          unit: mode === "band" ? "Takte" : "Figuren",
          best: merged.records[mode]!,
          isRecord: merged.isRecord,
        });
        isRecord = merged.isRecord;
      } else if (awardsStars && active.level) {
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
    async (level: Level | null) => {
      await audio.ensure();
      const { mode, input, fixedBpm } = prefsRef.current;
      const latencySec = latencyMs === null ? null : latencyMs / 1000;

      let band: Session["band"] = null;
      let reached: Session["reached"] = null;
      let script: SessionScript;
      if (level === null) {
        if (mode === "band") {
          const endless = new EndlessBandScript();
          band = { source: endless, ts: ENDLESS_METER };
          reached = () => endless.reached;
          script = endless;
        } else {
          const plan = new EndlessPlan();
          reached = () => plan.reached;
          script = new AnswerScript(plan, ENDLESS_METER, null);
        }
      } else if (mode === "band") {
        const ts = pickMeter(level);
        const bpm = fixedBpm ?? startBpm(level, progressRef.current);
        const bars = createBandBars(level, ts);
        const fixed = new BandScript(bars, ts, bpm);
        band = { source: fixed, ts };
        script = fixed;
      } else {
        const ts = pickMeter(level);
        const bpm = fixedBpm ?? startBpm(level, progressRef.current);
        const total = figuresForLevel(level);
        const plan = new AnswerPlan(level, ts, total, {
          start: bpm,
          fixed: fixedBpm !== null,
        });
        script = new AnswerScript(plan, ts, total);
      }

      const conductor = new Conductor(audio, script, {
        input,
        leniency: level?.leniency ?? 1,
        latencySec,
      });
      const active: Session = {
        conductor,
        level,
        band,
        reached,
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

  const isEndless = prefs.levelId === ENDLESS_ID;
  const currentLevel = isEndless
    ? null
    : (levelById(prefs.levelId) ?? LEVELS[0]!);
  const following = currentLevel ? nextLevel(currentLevel) : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-[clamp(0.5rem,1.8svh,1.25rem)]">
      {view === "setup" && (
        <SetupView
          prefs={prefs}
          progress={progress}
          endlessRecords={endlessRecords}
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
              source={session.band.source}
              timeSignature={session.band.ts}
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
          endless={endlessResult}
          isRecord={reward.isRecord}
          rankUp={reward.rankUp}
          awardsStars={prefs.fixedBpm === null && !isEndless}
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
