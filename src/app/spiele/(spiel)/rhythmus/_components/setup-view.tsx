"use client";

import { useEffect, useRef } from "react";
import { Infinity as InfinityIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/_components/ui/button";
import { GameHead } from "../../../_components/game-kit";
import { LearningPathMap } from "../../../_components/learning-path-map";
import { DailyTile } from "../../../_components/path-screen";
import { RankedTile } from "../../../_components/ranked";
import { usePathCelebration } from "../../../_components/use-path-celebration";
import { GameDock } from "../../../_components/game-shell-context";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
import { LEVELS, levelById } from "../../../_lib/rhythm/levels";
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

const MIN_BPM = 40;
const MAX_BPM = 200;

const ON_ORANGE = "on-orange bg-primary text-ink";

/** Wahl aus zwei Feldern, Tinte statt Icons. */
function ChoiceField({
  active,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "border-ink dark:border-night-text flex min-h-11 flex-col border-2 p-3 text-left transition-colors",
        GAME_FOCUS_RING,
        active
          ? ON_ORANGE
          : "hover:bg-primary hover:text-ink text-ink dark:text-night-text",
      )}
    >
      <span className="spiel-choice-title condensed text-[1.75rem] leading-none font-extrabold">
        {title}
      </span>
      <span className="mt-1 text-sm leading-snug">{hint}</span>
    </button>
  );
}

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
  onStartRanked,
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
  onStartRanked: () => void;
  onCalibrate: () => void;
}) {
  const isEndless = prefs.levelId === ENDLESS_ID;
  const challengeSection = parseChallengeId(prefs.levelId);
  const level = levelById(prefs.levelId) ?? LEVELS[0]!;
  const levelNumber = LEVELS.indexOf(level) + 1;
  const endlessRecord = endlessRecords[prefs.mode];
  const autoBpm = startBpm(level, progress);
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
  const setMode = (mode: PlayMode) => onChange({ ...prefs, mode });
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

      <div className="grid grid-cols-2 gap-2">
        <ChoiceField
          active={prefs.mode === "answer"}
          title="Nachspielen"
          hint="Hören, dann du"
          onClick={() => setMode("answer")}
        />
        <ChoiceField
          active={prefs.mode === "band"}
          title="Notenband"
          hint="Lesen und spielen"
          onClick={() => setMode("band")}
        />
      </div>

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
        after={
          <>
            <DailyTile game="rhythmus" onStart={onStartDaily} />
            <RankedTile
              game="rhythmus"
              variant={`${prefs.mode}:${prefs.input}`}
              variantLabel={`${prefs.mode === "band" ? "Notenband" : "Nachspielen"}, ${prefs.input === "hold" ? "Halten" : "Tippen"}`}
              rules="Drei Mal Puste, der Server zählt nach."
              onStart={onStartRanked}
            />
            <section aria-label="Endlos">
              <button
                ref={isEndless ? selectedRef : undefined}
                type="button"
                aria-pressed={isEndless}
                onClick={() => pick(ENDLESS_ID)}
                className={cn(
                  "spiel-tile flex w-full items-center gap-3 p-4 text-left",
                  GAME_FOCUS_RING,
                  isEndless && "on-orange bg-primary text-ink",
                )}
              >
                <InfinityIcon
                  className="h-8 w-8 shrink-0 stroke-[2.5]"
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold">Endlos</span>
                  <span className="mt-0.5 block text-sm leading-snug">
                    {endlessRecord
                      ? `Immer schwerer, bis die Puste weg ist. Dein Rekord: ${endlessRecord.points} Punkte.`
                      : "Immer schwerer, bis die Puste weg ist."}
                  </span>
                </span>
              </button>
            </section>
          </>
        }
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
                  : `Stufe ${LEVELS.findIndex((l) => l.id === celebration.fromId) + 1} geschafft!`}
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
                      : `${level.title}:`}
                </strong>{" "}
                <span className="text-dark dark:text-night-muted">
                  {challengeSection !== null
                    ? `Alles, was du bisher gelernt hast, drei Mal Puste. Schaffe ${CHALLENGE_PASS_PERCENT} %.`
                    : isEndless
                      ? "Drei Mal Puste, wie weit kommst du?"
                      : level.hint}
                </span>
              </p>
              <Button
                type="button"
                size="lg"
                className="spiel-action w-full"
                onClick={onStart}
              >
                {challengeSection !== null
                  ? "Challenge starten"
                  : isEndless
                    ? "Endlos spielen"
                    : `Stufe ${levelNumber} spielen`}
              </Button>
            </>
          )}
        </div>
      </GameDock>
    </div>
  );
}
