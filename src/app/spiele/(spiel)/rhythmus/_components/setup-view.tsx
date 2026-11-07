"use client";

import { useEffect, useRef } from "react";
import {
  BookOpen,
  Ear,
  Infinity as InfinityIcon,
  Settings2,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ArcadeButton } from "../../../_components/arcade-button";
import { GameDock } from "../../../_components/game-shell-context";
import { Toni } from "../../../_components/toni";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
import { LEVELS, levelById, type Level } from "../../../_lib/rhythm/levels";
import type { InputMode } from "../_lib/conductor";
import { ENDLESS_ID, type EndlessRecords } from "../_lib/endless";
import {
  startBpm,
  type PlayMode,
  type Prefs,
  type Progress,
} from "../_lib/prefs";
import { MAX_STARS, rankFor, totalStars } from "../_lib/ranks";

const GROUP_COLORS: Record<string, string> = {
  Grundlagen: "#faa619",
  Achtel: "#3b82f6",
  Sechzehntel: "#8b5cf6",
  "Triolen und 6/8": "#10b981",
  "Für Fortgeschrittene": "#ef4444",
};

const STEP_Y = 92;
const GROUP_GAP = 52;
const TOP_PAD = 16;
const MIN_BPM = 40;
const MAX_BPM = 200;

/** Der Weg schlängelt sich: Position je Stufe in Prozent der Breite und in px von oben. */
function pathLayout(levels: readonly Level[]) {
  let y = TOP_PAD;
  let previousGroup: string | null = null;
  const stations = levels.map((level, index) => {
    const newGroup = level.group !== previousGroup;
    if (newGroup) y += GROUP_GAP;
    previousGroup = level.group;
    const station = {
      level,
      index,
      newGroup,
      x: 50 + 30 * Math.sin(index * 0.95),
      y,
    };
    y += STEP_Y;
    return station;
  });
  return { stations, height: y + 12 };
}

function StarRow({
  stars,
  size = "h-3.5 w-3.5",
}: {
  stars: number;
  size?: string;
}) {
  return (
    <span
      className="flex gap-0.5"
      role="img"
      aria-label={`${stars} von 3 Sternen`}
    >
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          className={cn(
            size,
            "stroke-[1.5]",
            n <= stars
              ? "fill-primary text-ink dark:text-night-text"
              : "text-ink/25 dark:text-night-rule",
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}

function ModeCard({
  active,
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  icon: typeof Ear;
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
        "flex min-h-11 items-center gap-2.5 rounded-2xl border-[3px] p-2.5 text-left transition-colors",
        GAME_FOCUS_RING,
        active
          ? "bg-primary border-ink text-ink"
          : "border-rule bg-paper hover:border-ink dark:border-night-rule dark:bg-night dark:hover:border-night-text",
      )}
    >
      <Icon
        className={cn(
          "h-7 w-7 shrink-0",
          !active && "text-ink dark:text-night-text",
        )}
        aria-hidden
      />
      <span className="min-w-0">
        <span
          className={cn(
            "condensed block text-lg leading-tight font-extrabold",
            !active && "text-ink dark:text-night-text",
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            "block text-xs leading-snug",
            active ? "text-ink" : "text-dark dark:text-night-muted",
          )}
        >
          {hint}
        </span>
      </span>
    </button>
  );
}

export function SetupView({
  prefs,
  progress,
  endlessRecords,
  notice,
  onChange,
  onStart,
  onCalibrate,
}: {
  prefs: Prefs;
  progress: Progress;
  endlessRecords: EndlessRecords;
  notice: string | null;
  onChange: (next: Prefs) => void;
  onStart: () => void;
  onCalibrate: () => void;
}) {
  const isEndless = prefs.levelId === ENDLESS_ID;
  const level = levelById(prefs.levelId) ?? LEVELS[0]!;
  const endlessRecord = endlessRecords[prefs.mode];
  const levelNumber = LEVELS.indexOf(level) + 1;
  const autoBpm = startBpm(level, progress);
  const stars = totalStars(progress);
  const rank = rankFor(stars);
  const { stations, height } = pathLayout(LEVELS);
  const selectedStation = stations[levelNumber - 1]!;
  const selectedRef = useRef<HTMLButtonElement>(null);
  const endlessRef = useRef<HTMLButtonElement>(null);
  const userPicked = useRef(false);

  // Beim Öffnen dort einsteigen, wo man zuletzt war. Die Auswahl kommt erst nach dem
  // Mount aus dem Speicher; spätere Klicks sollen die Karte nicht verschieben.
  useEffect(() => {
    if (userPicked.current) return;
    if (isEndless) endlessRef.current?.scrollIntoView({ block: "center" });
    else if (selectedStation.index > 2) {
      selectedRef.current?.scrollIntoView({ block: "center" });
    }
  }, [isEndless, selectedStation.index]);

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

  const pathPoints = stations.map((s) => `${s.x},${s.y + 32}`).join(" ");
  const smallButton = cn(
    "border-rule text-ink dark:border-night-rule dark:text-night-text min-h-11 rounded-xl border-2 px-3 text-sm font-bold",
    GAME_FOCUS_RING,
  );

  return (
    <div className="flex flex-col gap-3 pb-2">
      <div className="spiel-buehne flex items-center gap-3 rounded-3xl p-3">
        <Toni mood="idle" className="spiel-float h-20 w-20 sm:h-24 sm:w-24" />
        <div className="min-w-0 flex-1">
          <h2 className="condensed text-ink dark:text-night-text text-[clamp(1.5rem,4svh,2.5rem)] leading-none font-extrabold">
            Hallo, ich bin Toni!
          </h2>
          <p className="text-ink dark:text-night-text mt-1 leading-snug">
            Komm, wir machen Musik! Du bist{" "}
            <strong className="font-extrabold">{rank.title}</strong>.
          </p>
          <p className="text-dark dark:text-night-muted mt-1 flex items-center gap-1.5 text-sm font-bold tabular-nums">
            <Star
              className="fill-primary text-ink dark:text-night-text h-4 w-4"
              aria-hidden
            />
            {stars} von {MAX_STARS}
            {rank.nextTitle &&
              ` · noch ${rank.starsToNext} bis ${rank.nextTitle}`}
          </p>
        </div>
      </div>

      {notice && (
        <p
          className="text-sm font-bold text-red-700 dark:text-red-400"
          role="status"
        >
          {notice}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <ModeCard
          active={prefs.mode === "answer"}
          icon={Ear}
          title="Nachspielen"
          hint="Hören, dann du"
          onClick={() => setMode("answer")}
        />
        <ModeCard
          active={prefs.mode === "band"}
          icon={BookOpen}
          title="Notenband"
          hint="Lesen und spielen"
          onClick={() => setMode("band")}
        />
      </div>

      <section aria-label="Musikweg: Stufe wählen">
        <div className="relative" style={{ height }}>
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 100 ${height}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <polyline
              points={pathPoints}
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeDasharray="2 12"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="text-ink/25 dark:text-night-rule"
            />
          </svg>

          {stations.map(({ level: entry, index, newGroup, x, y }) => {
            const active = !isEndless && entry.id === level.id;
            const earned = progress[entry.id]?.stars ?? 0;
            const color = GROUP_COLORS[entry.group] ?? "#faa619";
            const labelOnRight = x < 50;
            return (
              <div key={entry.id}>
                {newGroup && (
                  <p
                    className="condensed absolute left-1/2 z-[1] -translate-x-1/2 rounded-full px-4 py-1 text-base font-extrabold whitespace-nowrap text-white"
                    style={{ top: y - 44, backgroundColor: darken(color) }}
                  >
                    {entry.group}
                  </p>
                )}
                <button
                  ref={active ? selectedRef : undefined}
                  type="button"
                  aria-pressed={active}
                  aria-label={`Stufe ${index + 1}: ${entry.title}. ${entry.hint}. ${earned} von 3 Sternen.`}
                  onClick={() => {
                    userPicked.current = true;
                    onChange({ ...prefs, levelId: entry.id });
                  }}
                  className={cn(
                    "condensed absolute z-[2] flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border-[3px] text-2xl font-extrabold transition-transform hover:scale-105",
                    GAME_FOCUS_RING,
                    active
                      ? "spiel-glow border-ink text-ink scale-110"
                      : earned > 0
                        ? "border-ink text-ink"
                        : "border-rule bg-paper text-ink dark:border-night-rule dark:bg-night-raised dark:text-night-text",
                  )}
                  style={{
                    left: `${x}%`,
                    top: y,
                    backgroundColor: active || earned > 0 ? color : undefined,
                  }}
                >
                  {index + 1}
                </button>
                <div
                  className={cn(
                    "absolute z-[1] w-[34%] sm:w-[30%]",
                    labelOnRight ? "text-left" : "text-right",
                  )}
                  style={{
                    top: y + 6,
                    ...(labelOnRight
                      ? { left: `calc(${x}% + 2.75rem)` }
                      : { right: `calc(${100 - x}% + 2.75rem)` }),
                  }}
                  aria-hidden
                >
                  <p
                    className={cn(
                      "text-ink dark:text-night-text text-sm leading-tight font-bold",
                      active && "font-extrabold",
                    )}
                  >
                    {entry.title}
                  </p>
                  <span
                    className={cn(
                      "mt-0.5 flex",
                      labelOnRight ? "justify-start" : "justify-end",
                    )}
                  >
                    <StarRow stars={earned} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <button
        ref={endlessRef}
        type="button"
        aria-pressed={isEndless}
        onClick={() => {
          userPicked.current = true;
          onChange({ ...prefs, levelId: ENDLESS_ID });
        }}
        className={cn(
          "flex min-h-20 w-full items-center gap-3 rounded-3xl border-[3px] p-3 text-left transition-colors",
          GAME_FOCUS_RING,
          isEndless
            ? "spiel-glow bg-primary border-ink text-ink"
            : "border-ink bg-ink text-paper dark:border-night-text dark:bg-night-raised dark:text-night-text",
        )}
      >
        <InfinityIcon className="h-10 w-10 shrink-0 stroke-[2.5]" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="condensed block text-2xl leading-none font-extrabold">
            Endlos
          </span>
          <span className="mt-1 block text-sm leading-snug">
            Immer schwerer, bis die Puste weg ist.
            {endlessRecord
              ? ` Dein Rekord: ${endlessRecord.points} Punkte.`
              : ""}
          </span>
        </span>
      </button>

      <details className="border-rule dark:border-night-rule rounded-2xl border-2">
        <summary
          className={cn(
            "text-ink dark:text-night-text flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-2xl px-3 text-sm font-bold [&::-webkit-details-marker]:hidden",
            GAME_FOCUS_RING,
          )}
        >
          <Settings2 className="h-4 w-4" aria-hidden />
          Einstellungen
          <span className="text-dark dark:text-night-muted ml-auto font-normal">
            {prefs.input === "hold" ? "Halten" : "Tippen"} ·{" "}
            {prefs.fixedBpm === null
              ? "Tempo passt sich an"
              : `${prefs.fixedBpm} BPM`}
          </span>
        </summary>
        <div className="flex flex-col gap-3 px-3 pb-3">
          <div>
            <p className="text-dark dark:text-night-muted mb-1 text-xs font-bold">
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
                    prefs.input === id &&
                      "bg-primary border-ink text-ink dark:text-ink",
                  )}
                >
                  {title}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-dark dark:text-night-muted mb-1 text-xs font-bold">
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
                  prefs.fixedBpm === null &&
                    "bg-primary border-ink text-ink dark:text-ink",
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
          <p className="text-center text-sm leading-snug">
            <strong className="text-ink dark:text-night-text font-extrabold">
              {isEndless ? "Endlos:" : `${level.title}:`}
            </strong>{" "}
            <span className="text-dark dark:text-night-muted">
              {isEndless ? "Drei Mal Puste, wie weit kommst du?" : level.hint}
            </span>
          </p>
          <ArcadeButton onClick={onStart}>
            {isEndless ? "Endlos spielen" : `Stufe ${levelNumber} spielen`}
          </ArcadeButton>
        </div>
      </GameDock>
    </div>
  );
}

/** Weiße Schrift auf den Wegschildern braucht dunklere Töne als die Stationen. */
function darken(color: string): string {
  const map: Record<string, string> = {
    "#faa619": "#a55800",
    "#3b82f6": "#1d4ed8",
    "#8b5cf6": "#6d28d9",
    "#10b981": "#047857",
    "#ef4444": "#b91c1c",
  };
  return map[color] ?? color;
}
