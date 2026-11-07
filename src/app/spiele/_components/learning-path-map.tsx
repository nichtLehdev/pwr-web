"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type Ref,
} from "react";
import { Check, Lock, Music, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { StarMarks } from "./game-kit";
import { Toni, type ToniMood } from "./toni";
import { spawnBurst } from "./note-burst";
import { GAME_FOCUS_RING } from "../_lib/focus-ring";
import type {
  Celebration,
  CelebrationStage,
  LearningPath,
  PathProgress,
  PathStage,
} from "../_lib/learning-path";

const NODE_STEP_Y = 92;
const NODE_SIZE = 72;
const SWING_PX = 84;

function nodeOffset(index: number): number {
  return SWING_PX * Math.sin(index * 0.85);
}

const NODE_CENTER_Y = (NODE_SIZE - 8) / 2;
const BONUS_GAP_PX = 140;
const BONUS_MAX_PX = 130;

/** Weiche Kurve zwischen zwei Knoten, senkrecht hinein und hinaus. */
function trail(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const bend = (to.y - from.y) / 2;
  return `M${from.x} ${from.y}C${from.x} ${from.y + bend} ${to.x} ${to.y - bend} ${to.x} ${to.y}`;
}

type NodeShared = {
  unlocked: boolean;
  offPath: boolean;
  selectedId: string;
  selectedRef: Ref<HTMLButtonElement>;
  toniRef: Ref<HTMLDivElement>;
  toniMood: ToniMood;
  fromId: string | null;
  stage: CelebrationStage | null;
  revealing: boolean;
  celebration: (Celebration & { revealed: number }) | null;
  shown: PathProgress;
  onPick: (id: string) => void;
};

/** Ein Knoten des Pfads: Stufe oder Bonusstufe, mit Sternen und Toni daneben. */
function StageNode<S extends PathStage>({
  level,
  label,
  face,
  caption,
  row,
  offset,
  unlocked,
  offPath,
  selectedId,
  selectedRef,
  toniRef,
  toniMood,
  fromId,
  stage,
  revealing,
  celebration,
  shown,
  onPick,
}: NodeShared & {
  level: S;
  label: string;
  face: ReactNode;
  caption?: string;
  row: number;
  offset: number;
}) {
  const isCelebrated = level.id === fromId;
  const earned =
    isCelebrated && revealing && celebration
      ? celebration.revealed
      : (shown[level.id]?.stars ?? 0);
  const active = !offPath && level.id === selectedId;
  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        top: row * NODE_STEP_Y,
        left: `calc(50% + ${offset}px - ${NODE_SIZE / 2}px)`,
        width: NODE_SIZE,
      }}
    >
      {active && (
        <TravelingToni offset={offset} mood={toniMood} toniRef={toniRef} />
      )}
      <button
        ref={active ? selectedRef : undefined}
        type="button"
        disabled={!unlocked}
        aria-pressed={active}
        aria-label={
          unlocked
            ? `${label}: ${level.title}. ${level.hint}. ${earned} von 3 Sternen.`
            : `${label}: ${level.title}. Gesperrt.`
        }
        onClick={() => onPick(level.id)}
        data-path-id={level.id}
        data-celebrate={isCelebrated && stage === "done"}
        data-state={
          !unlocked
            ? "locked"
            : active
              ? "active"
              : earned > 0
                ? "done"
                : "open"
        }
        className={cn(
          "spiel-node relative flex items-center justify-center text-2xl font-extrabold",
          GAME_FOCUS_RING,
        )}
        style={{ width: NODE_SIZE, height: NODE_SIZE - 8 }}
      >
        {unlocked ? face : <Lock className="h-6 w-6" aria-hidden />}
        {level.badge === "read" && unlocked && (
          <span className="spiel-node-badge" aria-hidden>
            <Music className="h-3.5 w-3.5" />
          </span>
        )}
      </button>
      {(earned > 0 || (isCelebrated && revealing)) && (
        <div
          className="spiel-node-stars mt-1.5"
          data-big={isCelebrated && revealing}
        >
          <StarMarks stars={earned} className="h-3 w-3" />
        </div>
      )}
      {caption && earned === 0 && !(isCelebrated && revealing) && (
        <span
          className="text-dark dark:text-night-muted mt-1 text-xs font-extrabold"
          aria-hidden
        >
          {caption}
        </span>
      )}
    </div>
  );
}

function TravelingToni({
  offset,
  mood,
  toniRef,
}: {
  offset: number;
  mood: ToniMood;
  toniRef: Ref<HTMLDivElement>;
}) {
  return (
    <Toni
      ref={toniRef}
      mood={mood}
      className={cn(
        "absolute top-0 z-10 h-20 w-20",
        offset > 0 ? "right-[calc(100%+0.75rem)]" : "left-[calc(100%+0.75rem)]",
      )}
    />
  );
}

const WALK_MS = 950;
const HOP_HEIGHT_PX = 24;
const HOPS = 3;

/** Toni hüpft in drei Sprüngen von der alten Stelle zur neuen. */
function hopFrames(dx: number, dy: number): Keyframe[] {
  const at = (t: number, lift: number) =>
    `translate(${dx * (1 - t)}px, ${dy * (1 - t) - lift}px)`;
  return Array.from({ length: HOPS * 2 + 1 }, (_, i) => ({
    transform: at(i / (HOPS * 2), i % 2 ? HOP_HEIGHT_PX : 0),
    easing: i % 2 ? "ease-in" : "ease-out",
  }));
}

/** Der Lernpfad: Abschnitte öffnen sich nacheinander, jeder endet mit einer Challenge. */
export function LearningPathMap<S extends PathStage>({
  path,
  selectedId,
  celebration,
  offPath = false,
  progress,
  selectedRef,
  onPick,
  after,
}: {
  path: LearningPath<S>;
  selectedId: string;
  celebration:
    (Celebration & { stage: CelebrationStage; revealed: number }) | null;
  /** Etwas außerhalb des Pfads ist gewählt, etwa Endlos: Toni steht dann bei keiner Stufe. */
  offPath?: boolean;
  progress: PathProgress;
  selectedRef: Ref<HTMLButtonElement>;
  onPick: (id: string) => void;
  /** Was unter dem Pfad folgt, etwa Endlos. */
  after?: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const toniRef = useRef<HTMLDivElement>(null);
  const toniSpot = useRef<{ x: number; y: number } | null>(null);
  const stage = celebration?.stage ?? null;
  const fromId = celebration?.fromId ?? null;
  const toniMood: ToniMood = stage && stage !== "arrive" ? "happy" : "idle";
  // Der alte Stand steht noch, bis die Stufe als geschafft aufleuchtet.
  const shown =
    celebration && stage === "arrive" ? celebration.before : progress;
  const locks = celebration && stage !== "walk" ? celebration.before : progress;
  const revealing = stage === "done" || stage === "stars";

  // Relativ zum Pfad gemessen, damit Scrollen die Strecke nicht verfälscht.
  useLayoutEffect(() => {
    const toni = toniRef.current;
    const root = rootRef.current;
    if (!toni || !root) {
      toniSpot.current = null;
      return;
    }
    const box = toni.getBoundingClientRect();
    const origin = root.getBoundingClientRect();
    const spot = { x: box.left - origin.left, y: box.top - origin.top };
    const previous = toniSpot.current;
    toniSpot.current = spot;
    if (stage !== "walk" || !previous) return;
    const walk = toni.animate(
      hopFrames(previous.x - spot.x, previous.y - spot.y),
      { duration: WALK_MS },
    );
    return () => walk.cancel();
  }, [stage, selectedId, offPath]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (stage === "done" && fromId) {
      const node = root.querySelector(`[data-path-id="${fromId}"]`);
      if (node) {
        const box = node.getBoundingClientRect();
        const origin = root.getBoundingClientRect();
        spawnBurst(
          root,
          box.left - origin.left + box.width / 2,
          box.top - origin.top + box.height / 2,
          5,
        );
      }
    }
    if (stage === null) {
      root.querySelectorAll(".spiel-burst").forEach((piece) => piece.remove());
    }
  }, [stage, fromId]);

  return (
    <div ref={rootRef} className="relative flex flex-col gap-5">
      {path.sections.map((section) => {
        const unlocked = path.isSectionUnlocked(section.index, locks);
        const passed = path.isChallengePassed(section.index, shown);
        const challenge = path.challengeId(section.index);
        const challengeActive = !offPath && selectedId === challenge;
        const firstNumber = path.stages.indexOf(section.stages[0]!) + 1;
        const count = section.stages.length;
        const bonus = section.bonus ?? [];
        const challengeRow = count + bonus.length;
        const challengeOffset = nodeOffset(firstNumber - 1 + count);
        const lastOffset = nodeOffset(firstNumber - 2 + count);
        // Bonusstufen liegen neben dem Weg, auf der Seite, die gerade frei ist.
        const middle = (lastOffset + challengeOffset) / 2;
        const bonusOffset = Math.max(
          -BONUS_MAX_PX,
          Math.min(
            BONUS_MAX_PX,
            middle > 0 ? middle - BONUS_GAP_PX : middle + BONUS_GAP_PX,
          ),
        );
        const points = [
          ...section.stages.map((_, i) => ({
            x: nodeOffset(firstNumber - 1 + i),
            y: i * NODE_STEP_Y + NODE_CENTER_Y,
            done: (shown[section.stages[i]!.id]?.stars ?? 0) > 0,
          })),
          {
            x: challengeOffset,
            y: challengeRow * NODE_STEP_Y + 38,
            done: passed,
          },
        ];
        const nodeProps = {
          unlocked,
          offPath,
          selectedId,
          selectedRef,
          toniRef,
          toniMood,
          fromId,
          stage,
          revealing,
          celebration,
          shown,
          onPick,
        };
        return (
          <section
            key={section.title}
            aria-labelledby={`abschnitt-${section.index}`}
          >
            <div
              className="spiel-banner flex items-center gap-3 px-4 py-3"
              data-locked={!unlocked}
              data-unlocking={
                stage === "walk" &&
                celebration?.unlockedSection === section.index
              }
            >
              {!unlocked && <Lock className="h-6 w-6 shrink-0" aria-hidden />}
              <div className="min-w-0">
                <h3
                  id={`abschnitt-${section.index}`}
                  className="text-lg font-bold"
                >
                  Abschnitt {section.index + 1}: {section.title}
                </h3>
                <p className="text-sm">
                  {unlocked
                    ? (section.hint ?? section.stages[0]!.hint)
                    : `Schaffe die Challenge von Abschnitt ${section.index}, dann geht es hier weiter.`}
                </p>
              </div>
            </div>

            <div
              className="relative mt-5"
              style={{ height: (challengeRow + 1) * NODE_STEP_Y + 24 }}
            >
              <svg
                aria-hidden
                className="pointer-events-none absolute top-0 overflow-visible"
                style={{ left: "50%" }}
                width={1}
                height={(challengeRow + 1) * NODE_STEP_Y}
              >
                {points.slice(1).map((to, k) => {
                  const from = points[k]!;
                  return (
                    <path
                      key={k}
                      className="spiel-trail"
                      data-done={unlocked && from.done}
                      data-locked={!unlocked}
                      d={trail(from, to)}
                    />
                  );
                })}
                {bonus.map((b, k) => {
                  const from = points[count - 1]!;
                  return (
                    <path
                      key={b.id}
                      className="spiel-trail"
                      data-branch
                      data-locked={!unlocked}
                      d={trail(from, {
                        x: bonusOffset,
                        y: (count + k) * NODE_STEP_Y + NODE_CENTER_Y,
                      })}
                    />
                  );
                })}
              </svg>

              {section.stages.map((level, i) => (
                <StageNode
                  key={level.id}
                  {...nodeProps}
                  level={level}
                  label={`Stufe ${firstNumber + i}`}
                  face={firstNumber + i}
                  row={i}
                  offset={nodeOffset(firstNumber - 1 + i)}
                />
              ))}
              {bonus.map((level, k) => (
                <StageNode
                  key={level.id}
                  {...nodeProps}
                  level={level}
                  label="Bonus"
                  face={<Sparkles className="h-6 w-6" aria-hidden />}
                  caption="Bonus"
                  row={count + k}
                  offset={bonusOffset}
                />
              ))}

              <div
                className="absolute flex flex-col items-center"
                style={{
                  top: challengeRow * NODE_STEP_Y,
                  left: `calc(50% + ${challengeOffset}px - 3rem)`,
                  width: "6rem",
                }}
              >
                {challengeActive && (
                  <TravelingToni
                    offset={challengeOffset}
                    mood={toniMood}
                    toniRef={toniRef}
                  />
                )}
                <button
                  ref={challengeActive ? selectedRef : undefined}
                  type="button"
                  disabled={!unlocked}
                  aria-pressed={challengeActive}
                  aria-label={`Challenge von Abschnitt ${section.index + 1}${
                    passed ? ", geschafft" : unlocked ? "" : ", gesperrt"
                  }.`}
                  onClick={() => onPick(challenge)}
                  data-path-id={challenge}
                  data-celebrate={challenge === fromId && stage === "done"}
                  data-state={
                    !unlocked
                      ? "locked"
                      : challengeActive
                        ? "active"
                        : passed
                          ? "done"
                          : "challenge"
                  }
                  className={cn(
                    "spiel-node flex items-center justify-center",
                    GAME_FOCUS_RING,
                  )}
                  style={{ width: 84, height: 76 }}
                >
                  {passed ? (
                    <Check className="h-9 w-9 stroke-3" aria-hidden />
                  ) : unlocked ? (
                    <Trophy className="h-9 w-9" aria-hidden />
                  ) : (
                    <Lock className="h-7 w-7" aria-hidden />
                  )}
                </button>
                <span
                  className={cn(
                    "mt-2 text-sm font-extrabold",
                    unlocked
                      ? "text-ink dark:text-night-text"
                      : "text-dark dark:text-night-muted",
                  )}
                  aria-hidden
                >
                  Challenge
                </span>
              </div>
            </div>
          </section>
        );
      })}

      {after}
    </div>
  );
}
