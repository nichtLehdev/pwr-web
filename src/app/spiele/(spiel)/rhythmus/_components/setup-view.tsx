"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Infinity as InfinityIcon, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/_components/ui/button";
import { GameHead } from "../../../_components/game-kit";
import { LearningPathMap } from "../../../_components/learning-path-map";
import { ModeButtons, useDailyDone } from "../../../_components/path-screen";
import {
  DAILY_AFTER_SECTION,
  ENDLESS_AFTER_SECTION,
  sectionFinished,
} from "../../../_lib/learning-path";
import { usePathCelebration } from "../../../_components/use-path-celebration";
import { GameDock } from "../../../_components/game-shell-context";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
import type { InputMode } from "../_lib/conductor";
import { ENDLESS_ID, type EndlessRecords } from "../_lib/endless";
import {
  CHALLENGE_PASS_PERCENT,
  parseChallengeId,
  RHYTHM_PATH,
  type Celebration,
} from "../_lib/path";
import {
  startBpm,
  type PlayMode,
  type Prefs,
  type Progress,
} from "../_lib/prefs";
import { MAX_STARS, rankFor, totalStars } from "../_lib/ranks";
import { hasAnswerGap } from "../../../_lib/rhythm/levels";
import { TutorialHelpButton, useTutorial } from "../../../_components/tutorial";
import { noteTutorialFor, type TutorialId } from "../../../_lib/tutorials";

const MIN_BPM = 40;
const MAX_BPM = 200;

const ON_ORANGE = "on-orange bg-primary text-ink";

export function SetupView({
  prefs,
  progress,
  endlessRecords,
  notice,
  celebration,
  onCelebrationEnd,
  onChange,
  onStart,
  onStartDaily,
  onStartEndless,
  onOpenBoard,
  onCalibrate,
}: {
  prefs: Prefs;
  progress: Progress;
  endlessRecords: EndlessRecords;
  notice: string | null;
  celebration: Celebration | null;
  onCelebrationEnd: () => void;
  onChange: (next: Prefs) => void;
  onStart: () => void;
  onStartDaily: () => void;
  onStartEndless: (mode: PlayMode) => void;
  onOpenBoard: () => void;
  onCalibrate: () => void;
}) {
  const isEndless = prefs.levelId === ENDLESS_ID;
  const tutorial = useTutorial();
  const dailyDone = useDailyDone("rhythmus");
  const [choosingEndless, setChoosingEndless] = useState(false);
  const challengeSection = parseChallengeId(prefs.levelId);
  const stage = RHYTHM_PATH.stageById(prefs.levelId) ?? RHYTHM_PATH.stages[0]!;
  const level = stage.level;
  const levelNumber = RHYTHM_PATH.stages.indexOf(stage) + 1;
  const notes = noteTutorialFor(level.id);
  // Wer aus den Grundlagen kommt, erfährt vorher, dass der Takt zum Einzählen wegfällt.
  const noGap: TutorialId[] = hasAnswerGap(level)
    ? []
    : ["rhythmus-ohne-pause"];
  const tutorialIds: TutorialId[] =
    challengeSection !== null
      ? challengeSection > 0
        ? ["challenge", "rhythmus-ohne-pause"]
        : ["challenge"]
      : isEndless
        ? ["endless"]
        : stage.mode === "band"
          ? ["rhythmus-band"]
          : ["rhythmus-start", ...noGap, ...(notes ? [notes] : [])];
  const endlessRecord = endlessRecords[prefs.mode];
  const autoBpm = startBpm(level, progress, stage.id);
  const stars = totalStars(progress);
  const rank = rankFor(stars);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const userPicked = useRef(false);
  const celebrating = usePathCelebration(
    celebration,
    (levelId) => onChange({ ...prefs, levelId }),
    onCelebrationEnd,
  );

  // Beim Öffnen dort einsteigen, wo man zuletzt war. Die Auswahl kommt erst nach dem
  // Mount aus dem Speicher; spätere Klicks sollen die Liste nicht verschieben.
  useEffect(() => {
    if (userPicked.current) return;
    if (celebration) {
      selectedRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    } else if (isEndless || challengeSection !== null || levelNumber > 3) {
      selectedRef.current?.scrollIntoView({ block: "center" });
    }
  }, [celebration, isEndless, challengeSection, levelNumber]);

  const pick = (levelId: string) => {
    userPicked.current = true;
    onChange({ ...prefs, levelId });
  };
  const setInput = (input: InputMode) => onChange({ ...prefs, input });
  const stepBpm = (delta: number) =>
    onChange({
      ...prefs,
      fixedBpm: Math.min(
        MAX_BPM,
        Math.max(MIN_BPM, (prefs.fixedBpm ?? autoBpm) + delta),
      ),
    });

  const smallButton = cn(
    "border-ink text-ink dark:border-night-text dark:text-night-text min-h-11 border-2 px-3 text-sm font-bold",
    GAME_FOCUS_RING,
  );

  return (
    <div className="flex flex-col gap-5 pb-2">
      <GameHead
        title="Rhythmus"
        text="Drück und halte wie beim Blasen: Der Ton beginnt mit dem Druck und endet mit dem Loslassen."
        weltTitle="Hallo, ich bin Toni!"
        weltText="Komm, wir machen Musik!"
        aside={null}
      >
        <p className="semi-condensed text-dark dark:text-night-muted mt-3 font-semibold tabular-nums">
          {rank.title} · {stars} von {MAX_STARS} Sternen
          {rank.nextTitle &&
            ` · noch ${rank.starsToNext} bis ${rank.nextTitle}`}
        </p>
      </GameHead>

      {notice && (
        <p
          className="text-sm font-bold text-red-700 dark:text-red-400"
          role="status"
        >
          {notice}
        </p>
      )}

      <ModeButtons
        buttons={[
          {
            key: "daily",
            label: "Tagestraining",
            icon: CalendarDays,
            status: dailyDone ? "Heute geschafft" : "Doppelte XP",
            highlight: !dailyDone,
            locked: sectionFinished(RHYTHM_PATH, DAILY_AFTER_SECTION, progress)
              ? null
              : "Schaff erst Abschnitt 2",
            onClick: onStartDaily,
          },
          {
            key: "endless",
            label: "Endlos",
            icon: InfinityIcon,
            status: endlessRecord
              ? `Rekord ${endlessRecord.points}`
              : "Drei Mal Puste",
            locked: sectionFinished(
              RHYTHM_PATH,
              ENDLESS_AFTER_SECTION,
              progress,
            )
              ? null
              : "Schaff erst Abschnitt 3",
            onClick: () => setChoosingEndless((open) => !open),
          },
          {
            key: "board",
            label: "Bestenliste",
            icon: Medal,
            status: "Ansehen",
            onClick: onOpenBoard,
          },
        ]}
      />
      {choosingEndless && (
        <div
          role="group"
          aria-label="Endlos spielen"
          className="spiel-tile flex flex-col gap-2 p-3"
        >
          <p className="text-ink dark:text-night-text text-center text-sm font-bold">
            Wie willst du Endlos spielen?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onStartEndless("answer")}
            >
              Nachspielen
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onStartEndless("band")}
            >
              Notenband
            </Button>
          </div>
        </div>
      )}
      <LearningPathMap
        path={RHYTHM_PATH}
        selectedId={prefs.levelId}
        celebration={
          celebration && celebrating.stage
            ? {
                ...celebration,
                stage: celebrating.stage,
                revealed: celebrating.revealed,
              }
            : null
        }
        offPath={isEndless}
        progress={progress}
        selectedRef={selectedRef}
        onPick={pick}
      />

      <details className="border-ink dark:border-night-text border-t-2">
        <summary
          className={cn(
            "text-ink dark:text-night-text flex min-h-14 cursor-pointer list-none items-center gap-2 font-bold [&::-webkit-details-marker]:hidden",
            GAME_FOCUS_RING,
          )}
        >
          Einstellungen
          <span className="text-dark dark:text-night-muted ml-auto text-sm font-normal">
            {prefs.input === "hold" ? "Halten" : "Tippen"} ·{" "}
            {prefs.fixedBpm === null
              ? "Tempo passt sich an"
              : `${prefs.fixedBpm} BPM`}
          </span>
        </summary>
        <div className="flex flex-col gap-4 pb-3">
          <div>
            <p className="text-dark dark:text-night-muted mb-1.5 text-sm">
              Eingabe: Bei „Halten“ zählt auch, wie lange der Ton klingt.
            </p>
            <div className="flex gap-2">
              {(
                [
                  ["hold", "Halten"],
                  ["tap", "Tippen"],
                ] as const
              ).map(([id, title]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={prefs.input === id}
                  onClick={() => setInput(id)}
                  className={cn(
                    smallButton,
                    "flex-1",
                    prefs.input === id && cn(ON_ORANGE, "dark:text-ink"),
                  )}
                >
                  {title}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-dark dark:text-night-muted mb-1.5 text-sm">
              Tempo: Mit festem Tempo übst du frei, aber ohne Sterne.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={prefs.fixedBpm === null}
                onClick={() =>
                  onChange({
                    ...prefs,
                    fixedBpm: prefs.fixedBpm === null ? autoBpm : null,
                  })
                }
                className={cn(
                  smallButton,
                  prefs.fixedBpm === null && cn(ON_ORANGE, "dark:text-ink"),
                )}
              >
                Passt sich an
              </button>
              {prefs.fixedBpm !== null && (
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Tempo verlangsamen"
                    onClick={() => stepBpm(-4)}
                    className={cn(smallButton, "w-11 text-xl")}
                  >
                    −
                  </button>
                  <span className="condensed text-ink dark:text-night-text min-w-20 text-center text-xl font-extrabold tabular-nums">
                    {prefs.fixedBpm} BPM
                  </span>
                  <button
                    type="button"
                    aria-label="Tempo erhöhen"
                    onClick={() => stepBpm(4)}
                    className={cn(smallButton, "w-11 text-xl")}
                  >
                    +
                  </button>
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onCalibrate}
            className={cn(smallButton, "self-start")}
          >
            Klingt der Ton verzögert? Timing einstellen
          </button>
        </div>
      </details>

      <GameDock>
        <div className="flex flex-col gap-1.5">
          {celebration ? (
            <>
              <p
                role="status"
                className="text-ink dark:text-night-text text-center text-sm leading-snug font-bold"
              >
                {parseChallengeId(celebration.fromId) !== null
                  ? "Challenge geschafft!"
                  : RHYTHM_PATH.stages.some(
                        (st) => st.id === celebration.fromId,
                      )
                    ? `Stufe ${RHYTHM_PATH.stages.findIndex((st) => st.id === celebration.fromId) + 1} geschafft!`
                    : "Bonus geschafft!"}
              </p>
              <Button
                type="button"
                size="lg"
                className="spiel-action w-full"
                onClick={celebrating.skip}
              >
                Überspringen
              </Button>
            </>
          ) : (
            <>
              <p className="text-center text-sm leading-snug">
                <strong className="text-ink dark:text-night-text font-bold">
                  {challengeSection !== null
                    ? `Challenge Abschnitt ${challengeSection + 1}:`
                    : isEndless
                      ? "Endlos:"
                      : `${stage.title}:`}
                </strong>{" "}
                <span className="text-dark dark:text-night-muted">
                  {challengeSection !== null
                    ? `Alles, was du bisher gelernt hast, drei Mal Puste. Schaffe ${CHALLENGE_PASS_PERCENT} %.`
                    : isEndless
                      ? "Drei Mal Puste, wie weit kommst du?"
                      : stage.hint}
                </span>
                <TutorialHelpButton ids={tutorialIds} />
              </p>
              <Button
                type="button"
                size="lg"
                className="spiel-action w-full"
                onClick={() => tutorial.gate(tutorialIds, onStart)}
              >
                {challengeSection !== null
                  ? "Challenge starten"
                  : isEndless
                    ? "Endlos spielen"
                    : levelNumber > 0
                      ? `Stufe ${levelNumber} spielen`
                      : "Bonus spielen"}
              </Button>
            </>
          )}
        </div>
      </GameDock>
    </div>
  );
}
