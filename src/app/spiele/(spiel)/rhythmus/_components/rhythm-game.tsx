"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, X } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Toni } from "../../../_components/toni";
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
import {
  hasAnswerGap,
  hasSteadyPitch,
  hasSteadyTempo,
  LEVELS,
  type Level,
} from "../../../_lib/rhythm/levels";
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
  savePrefs,
  saveProgress,
  startBpm,
  type Prefs,
  type PlayMode,
  type Progress,
} from "../_lib/prefs";
import {
  AnswerPlan,
  AnswerScript,
  BandScript,
  BAND_LENIENCY_BONUS,
  bandBpmFor,
  createBandBars,
  figuresForLevel,
  type BandSource,
  type SessionScript,
} from "../_lib/session-script";
import {
  CHALLENGE_LENIENCY,
  challengeCelebration,
  challengeId,
  challengePassed,
  buildDailySteps,
  ChallengePlan,
  clampSelection,
  RHYTHM_PATH,
  stageCelebration,
  type RhythmStage,
  parseChallengeId,
  SECTIONS,
  type Celebration,
} from "../_lib/path";
import { rankFor, totalStars } from "../_lib/ranks";
import {
  endlessScript,
  RecordingScript,
  RHYTHM_VARIANTS,
  relativePresses,
  type RhythmVariant,
} from "../_lib/replay";
import { activeProfileId } from "../../../_lib/profiles/scope";
import {
  LeaderboardView,
  RankedResult,
  UNRANKED_PAUSED,
  UnrankedNotice,
  unrankedReason,
  type RankedOutcome,
} from "../../../_components/ranked";
import {
  ENDLESS_AFTER_SECTION,
  sectionFinished,
} from "../../../_lib/learning-path";
import { api } from "@/trpc/react";

/** So oft meldet ein Bestenlisten-Lauf seine Drücke. */
const RANKED_REPORT_MS = 8000;
import { markDailyDone } from "../../../_lib/daily";
import { DAILY_ID } from "../../../_lib/learning-path";
import { AnswerStage } from "./answer-stage";
import { BandStage } from "./band-stage";
import { CalibrationView } from "./calibration-view";
import { PlayPad } from "./play-pad";
import { ResultView } from "./result-view";
import { SetupView } from "./setup-view";

type View = "setup" | "calibrate" | "play" | "result" | "board";

type Session = {
  conductor: Conductor;
  /** `null`: Endlos. */
  level: Level | null;
  /** Nur beim Notenband: Es zeichnet die kommenden Takte vorab. */
  band: { source: BandSource; ts: TimeSignature } | null;
  /** Nur Endlos: wie weit der Lauf gekommen ist. */
  reached: (() => number) | null;
  /** Nur Challenges. */
  /** Bestenliste: Der Server spielt den Lauf aus diesen Drücken nach. */
  ranked: {
    runId: string;
    profileId: string;
    variant: RhythmVariant;
    recording: RecordingScript;
    sentPresses: number;
    sentDecisions: number;
    timer: number | null;
    invalid: string | null;
  } | null;
  /** `section: null` ist das Tagestraining. */
  challenge: { section: number | null; plan: ChallengePlan } | null;
  /** Die gespielte Stufe des Pfads; ihre Kennung trägt Stern und Tempo. */
  stage: RhythmStage | null;
  mode: PlayMode;
  startedAt: number;
};

export type EndlessResult = {
  reached: number;
  unit: "Figuren" | "Takte";
  best: EndlessRecord;
  isRecord: boolean;
};

export type ChallengeResult = {
  section: number;
  passed: boolean;
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

  const [challengeResult, setChallengeResult] =
    useState<ChallengeResult | null>(null);

  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [rankedOutcome, setRankedOutcome] = useState<RankedOutcome | null>(
    null,
  );
  const [rankedVariant, setRankedVariant] = useState<RhythmVariant | null>(
    null,
  );
  /** Warum ein Endlos-Lauf nicht in die Liste kommt; `null`, wenn er zählt. */
  const [unranked, setUnranked] = useState<string | null>(null);
  const startRhythmRun = api.gameEndless.startRhythm.useMutation();
  const reportRhythm = api.gameEndless.reportRhythm.useMutation();
  const reportRef = useRef(reportRhythm.mutateAsync);
  useEffect(() => {
    reportRef.current = reportRhythm.mutateAsync;
  });

  /** Fertige Drücke und Entscheidungen melden; am Ende auch die noch offenen. */
  const sendRanked = useCallback(async (active: Session, final: boolean) => {
    const ranked = active.ranked;
    if (!ranked || ranked.invalid) return null;
    const { conductor } = active;
    const all = relativePresses(conductor.pressLog(), conductor.startSec);
    const open = all.findIndex((p) => p.durationMs === null);
    const upTo = final || open === -1 ? all.length : open;
    const presses = all.slice(ranked.sentPresses, upTo);
    const decisions = ranked.recording.decisions.slice(ranked.sentDecisions);
    try {
      const result = await reportRef.current({
        profileId: ranked.profileId,
        runId: ranked.runId,
        fromPress: ranked.sentPresses,
        presses,
        fromDecision: ranked.sentDecisions,
        decisions,
        final,
      });
      ranked.sentPresses += presses.length;
      ranked.sentDecisions += decisions.length;
      if (result.status === "invalid") ranked.invalid = result.reason;
      return result;
    } catch {
      ranked.invalid =
        "Die Verbindung ist abgerissen. Dieser Lauf zählt leider nicht.";
      return null;
    }
  }, []);

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
    const storedProgress = loadProgress();
    const storedPrefs = loadPrefs();
    setPrefs({
      ...storedPrefs,
      levelId:
        storedPrefs.levelId === ENDLESS_ID
          ? LEVELS[0]!.id
          : clampSelection(storedPrefs.levelId, storedProgress),
    });
    setProgress(storedProgress);
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
      if (active.ranked) {
        const ranked = active.ranked;
        if (ranked.timer !== null) window.clearInterval(ranked.timer);
        setRankedVariant(ranked.variant);
        setRankedOutcome({ status: "checking" });
        void sendRanked(active, true).then((final) => {
          if (final && final.status === "finished") setRankedOutcome(final);
          else
            setRankedOutcome({
              status: "invalid",
              reason:
                ranked.invalid ??
                "Der Lauf konnte nicht geprüft werden. Er zählt leider nicht.",
            });
        });
      } else {
        setRankedVariant(null);
      }
      const result = summarize(attempts);
      const { fixedBpm, mode, input } = prefsRef.current;
      const isEndless = active.level === null && !active.challenge;
      const awardsStars =
        active.challenge !== null || (fixedBpm === null && !isEndless);
      setSummary(result);
      setBestStreak(active.conductor.judge.bestStreak);
      recordResult({
        score: result.percent,
        maxScore: 100,
        streak: active.conductor.judge.bestStreak,
        durationMs: Math.round(performance.now() - active.startedAt),
        meta: {
          stage: `${active.mode}/${
            active.challenge
              ? active.challenge.section === null
                ? DAILY_ID
                : challengeId(active.challenge.section)
              : (active.level?.id ?? ENDLESS_ID)
          }`,
          kind: active.challenge
            ? active.challenge.section === null
              ? "daily"
              : "challenge"
            : isEndless
              ? "endless"
              : awardsStars
                ? "lesson"
                : "free",
          passed:
            active.challenge?.section != null &&
            challengePassed(active.challenge.plan.completed, result.percent),
          level: active.challenge
            ? active.challenge.section === null
              ? DAILY_ID
              : challengeId(active.challenge.section)
            : (active.level?.id ?? ENDLESS_ID),
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
      setChallengeResult(null);
      setCelebration(null);
      const pathProgress = progressRef.current;
      const store = (merged: Progress) => {
        setProgress(merged);
        saveProgress(merged);
      };
      if (active.challenge?.section === null) {
        markDailyDone("rhythmus");
      } else if (active.challenge) {
        const { plan } = active.challenge;
        const section = active.challenge.section;
        const passed = challengePassed(plan.completed, result.percent);
        const merged = mergeProgress(pathProgress, challengeId(section), {
          stars: result.stars,
          percent: result.percent,
          points,
          bpm: result.bpm,
          passed,
        });
        store(merged);
        setChallengeResult({ section, passed });
        setCelebration(challengeCelebration(section, pathProgress, passed));
      } else if (active.reached) {
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
      } else if (awardsStars && active.stage) {
        const before = pathProgress;
        const merged = mergeProgress(before, active.stage.id, {
          stars: result.stars,
          percent: result.percent,
          points,
          bpm: result.bpm,
        });
        const previousBest = before[active.stage.id]?.bestPoints ?? 0;
        isRecord = previousBest > 0 && points > previousBest;
        const newRank = rankFor(totalStars(merged)).title;
        if (newRank !== rankFor(totalStars(before)).title) rankUp = newRank;
        store(merged);
        setCelebration(
          stageCelebration(active.stage, before, merged, result.stars),
        );
      }
      setReward({ points, isRecord, rankUp });
      sessionRef.current = null;
      setSession(null);
      setView("result");
    },
    [recordResult, sendRanked],
  );

  const start = useCallback(
    async (
      selectionId: string,
      rankedRun?: { runId: string; seed: number; profileId: string },
    ) => {
      setCelebration(null);
      await audio.ensure();
      const { mode, input, fixedBpm } = prefsRef.current;
      const latencySec = latencyMs === null ? null : latencyMs / 1000;
      const challengeSection = parseChallengeId(selectionId);
      const daily = selectionId === DAILY_ID;
      const stage =
        selectionId === ENDLESS_ID || challengeSection !== null || daily
          ? null
          : (RHYTHM_PATH.stageById(selectionId) ?? RHYTHM_PATH.stages[0]!);
      const level = stage?.level ?? null;
      // Stufen bestimmen ihre Spielart selbst, Endlos folgt der Einstellung.
      const playMode = stage?.mode ?? mode;

      let band: Session["band"] = null;
      let reached: Session["reached"] = null;
      let challenge: Session["challenge"] = null;
      let ranked: Session["ranked"] = null;
      let script: SessionScript;
      const pathProgress = progressRef.current;
      if (daily) {
        const plan = new ChallengePlan(buildDailySteps(pathProgress));
        challenge = { section: null, plan };
        script = new AnswerScript(plan, plan.total);
      } else if (challengeSection !== null) {
        // Nachspielen wechselt Taktarten und Tempi, das Vorspielen trägt einen hindurch.
        const plan = new ChallengePlan(challengeSection);
        challenge = { section: challengeSection, plan };
        const first = SECTIONS[challengeSection]!.stages[0]!.level;
        script = new AnswerScript(
          plan,
          plan.total,
          hasSteadyPitch(first),
          hasAnswerGap(first),
        );
      } else if (level === null && rankedRun) {
        const variant: RhythmVariant = `${mode}:${input}`;
        const made = endlessScript(variant, rankedRun.seed);
        const recording = new RecordingScript(made.script);
        if (made.band) band = { source: made.band, ts: ENDLESS_METER };
        reached = made.reached;
        script = recording;
        ranked = {
          runId: rankedRun.runId,
          profileId: rankedRun.profileId,
          variant,
          recording,
          sentPresses: 0,
          sentDecisions: 0,
          timer: null,
          invalid: null,
        };
      } else if (level === null) {
        if (mode === "band") {
          const endless = new EndlessBandScript();
          band = { source: endless, ts: ENDLESS_METER };
          reached = () => endless.reached;
          script = endless;
        } else {
          const plan = new EndlessPlan();
          reached = () => plan.reached;
          script = new AnswerScript(plan, null);
        }
      } else if (playMode === "band") {
        const ts = pickMeter(level);
        const bpm = fixedBpm ?? bandBpmFor(level);
        const bars = createBandBars(level, ts);
        const fixed = new BandScript(bars, ts, bpm, hasSteadyPitch(level));
        band = { source: fixed, ts };
        script = fixed;
      } else {
        const ts = pickMeter(level);
        const bpm = fixedBpm ?? startBpm(level, pathProgress, stage?.id);
        const total = figuresForLevel(level);
        const plan = new AnswerPlan(level, ts, total, {
          start: bpm,
          fixed: fixedBpm !== null,
          steady: hasSteadyTempo(level),
        });
        script = new AnswerScript(
          plan,
          total,
          hasSteadyPitch(level),
          hasAnswerGap(level),
        );
      }

      const conductor = new Conductor(audio, script, {
        input,
        leniency: challenge
          ? CHALLENGE_LENIENCY
          : (level?.leniency ?? 1) +
            // Nur Stufen: Endlos wird auf dem Server mit der normalen Toleranz nachgerechnet.
            (level && playMode === "band" ? BAND_LENIENCY_BONUS : 0),
        latencySec,
      });
      const active: Session = {
        conductor,
        level,
        band,
        reached,
        challenge,
        ranked,
        stage,
        mode: playMode,
        startedAt: performance.now(),
      };
      if (ranked) {
        ranked.timer = window.setInterval(
          () => void sendRanked(active, false),
          RANKED_REPORT_MS,
        );
      }
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
    [audio, finish, latencyMs, sendRanked],
  );

  /** Mit Profil zählt Endlos für die Bestenliste, sonst läuft es nur auf dem Gerät. */
  const startEndless = useCallback(
    async (chosen?: PlayMode) => {
      if (chosen && chosen !== prefsRef.current.mode) {
        const next = { ...prefsRef.current, mode: chosen };
        prefsRef.current = next;
        changePrefs(next);
      }
      const profileId = activeProfileId();
      const { mode, input } = prefsRef.current;
      setRankedOutcome(null);
      try {
        if (!profileId) throw new Error("ohne Profil");
        const run = await startRhythmRun.mutateAsync({
          profileId,
          variant: `${mode}:${input}`,
        });
        setUnranked(null);
        await start(ENDLESS_ID, { ...run, profileId });
      } catch {
        setUnranked(unrankedReason(Boolean(profileId)));
        await start(ENDLESS_ID);
      }
    },
    [changePrefs, start, startRhythmRun],
  );

  const [paused, setPaused] = useState(false);

  /** Anhalten; ein Bestenlisten-Lauf zählt danach nicht mehr, der Server könnte ihn nicht nachspielen. */
  const pause = useCallback(() => {
    const active = sessionRef.current;
    if (!active || !active.conductor.pause()) return;
    if (active.ranked) {
      if (active.ranked.timer != null)
        window.clearInterval(active.ranked.timer);
      active.ranked = null;
      setUnranked(UNRANKED_PAUSED);
      setSession({ ...active });
    }
    setPaused(true);
  }, []);

  const resume = useCallback(async () => {
    const active = sessionRef.current;
    if (!active) return;
    // Nach dem Hintergrund kann der Audiokontext angehalten sein; das Tippen weckt ihn.
    await audio.ensure().catch(() => undefined);
    active.conductor.resume();
    setPaused(false);
  }, [audio]);

  const abort = useCallback((message: string | null) => {
    const timer = sessionRef.current?.ranked?.timer;
    if (timer != null) window.clearInterval(timer);
    sessionRef.current?.conductor.stop();
    sessionRef.current = null;
    setSession(null);
    setPaused(false);
    setNotice(message);
    setView("setup");
  }, []);

  /** Im Hintergrund läuft die Audiouhr anders weiter: lieber anhalten als falsch werten. */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [pause]);

  useEffect(
    () => () => {
      sessionRef.current?.conductor.stop();
      audio.close();
    },
    [audio],
  );

  const isEndless = prefs.levelId === ENDLESS_ID;
  const endlessLocked = sectionFinished(
    RHYTHM_PATH,
    ENDLESS_AFTER_SECTION,
    progress,
  )
    ? null
    : "Schaff erst Abschnitt 3";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-[clamp(0.5rem,1.8svh,1.25rem)]">
      {view === "setup" && (
        <SetupView
          prefs={prefs}
          progress={progress}
          endlessRecords={endlessRecords}
          notice={notice}
          celebration={celebration}
          onCelebrationEnd={() => setCelebration(null)}
          onChange={changePrefs}
          onStart={() => void start(prefs.levelId)}
          onStartDaily={() => void start(DAILY_ID)}
          onStartEndless={(mode) => void startEndless(mode)}
          onOpenBoard={() => setView("board")}
          onCalibrate={() => setView("calibrate")}
        />
      )}

      {view === "board" && (
        <LeaderboardView
          game="rhythmus"
          variants={RHYTHM_VARIANTS.map((id) => ({
            id,
            label: `${id.startsWith("band") ? "Notenband" : "Nachspielen"}, ${id.endsWith("hold") ? "Halten" : "Tippen"}`,
          }))}
          variant={`${prefs.mode}:${prefs.input}`}
          onVariant={(id) => {
            const [mode, input] = id.split(":") as [
              Prefs["mode"],
              Prefs["input"],
            ];
            changePrefs({ ...prefs, mode, input });
          }}
          unit="Punkte"
          playLocked={endlessLocked}
          onPlay={() => void startEndless()}
          onBack={() => setView("setup")}
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
            {!paused && (
              <button
                type="button"
                onClick={pause}
                aria-label="Pause"
                className={cn(
                  "border-rule text-dark hover:bg-rule/25 dark:border-night-rule dark:text-night-muted dark:hover:bg-night-raised mr-2 inline-flex min-h-11 min-w-11 items-center justify-center border transition-colors",
                  GAME_FOCUS_RING,
                )}
              >
                <Pause className="h-4 w-4" aria-hidden />
              </button>
            )}
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
          {session.level === null && !session.challenge && !session.ranked && (
            <UnrankedNotice reason={unranked} />
          )}
          {paused && <PauseCard band={session.band !== null} />}
          {/* Versteckt statt abgebaut: Das Band behält seine gezeichneten Takte. */}
          <div className={paused ? "hidden" : undefined}>
            {session.band ? (
              <BandStage
                conductor={session.conductor}
                source={session.band.source}
                timeSignature={session.band.ts}
              />
            ) : (
              <AnswerStage conductor={session.conductor} />
            )}
          </div>
          <GameDock>
            {paused ? (
              <Button
                type="button"
                size="lg"
                className="spiel-action w-full"
                onClick={() => void resume()}
              >
                Weiter
              </Button>
            ) : (
              <PlayPad
                label={
                  isListening && !session.band
                    ? "Hör zu"
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
            )}
          </GameDock>
        </>
      )}

      {view === "result" && rankedVariant && rankedOutcome && (
        <RankedResult
          game="rhythmus"
          variant={rankedVariant}
          outcome={rankedOutcome}
          unit="Punkte"
          onAgain={() => void startEndless()}
          onContinue={() => {
            audio.cancelScheduled();
            setRankedVariant(null);
            setView("setup");
          }}
        />
      )}

      {view === "result" && summary && !rankedVariant && (
        <ResultView
          summary={summary}
          challenge={challengeResult}
          bestStreak={bestStreak}
          points={reward.points}
          endless={endlessResult}
          isRecord={reward.isRecord}
          rankUp={reward.rankUp}
          awardsStars={
            challengeResult !== null || (prefs.fixedBpm === null && !isEndless)
          }
          audio={audio}
          onAgain={() => void start(prefs.levelId)}
          onSetup={() => {
            audio.cancelScheduled();
            setView("setup");
          }}
        />
      )}
    </div>
  );
}

/** Was beim Weiterspielen passiert, damit niemand mitten im Takt einsteigen muss. */
function PauseCard({ band }: { band: boolean }) {
  return (
    <div className="spiel-tile flex flex-col items-center gap-3 px-5 py-8 text-center">
      <Toni mood="idle" className="h-24 w-24" />
      <h2 className="condensed text-ink dark:text-night-text text-3xl font-extrabold">
        Pause
      </h2>
      <p className="text-dark dark:text-night-muted max-w-[34ch]">
        {band
          ? "Beim Weiterspielen zähle ich ein, der letzte Takt läuft noch einmal vorbei."
          : "Beim Weiterspielen zähle ich ein und spiele die Figur noch einmal vor."}
      </p>
    </div>
  );
}
