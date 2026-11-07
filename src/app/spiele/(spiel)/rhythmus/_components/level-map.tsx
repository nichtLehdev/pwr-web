"use client";

import { useEffect, useLayoutEffect, useRef, type Ref } from "react";
import { Check, Infinity as InfinityIcon, Lock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { StarMarks } from "../../../_components/game-kit";
import { Toni, type ToniMood } from "../../../_components/toni";
import { spawnBurst } from "../../../_components/note-burst";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
import { LEVELS } from "../../../_lib/rhythm/levels";
import {
  challengeId,
  isChallengePassed,
  isSectionUnlocked,
  SECTIONS,
  type Celebration,
  type CelebrationStage,
} from "../_lib/path";
import type { Progress } from "../_lib/prefs";

const NODE_STEP_Y = 92;
const NODE_SIZE = 72;
const SWING_PX = 84;

function nodeOffset(index: number): number {
  return SWING_PX * Math.sin(index * 0.85);
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
export function LevelMap({
  selectedId,
  celebration,
  isEndless,
  progress,
  endlessHint,
  selectedRef,
  onPick,
  onPickEndless,
}: {
  selectedId: string;
  celebration:
    (Celebration & { stage: CelebrationStage; revealed: number }) | null;
  isEndless: boolean;
  progress: Progress;
  endlessHint: string;
  selectedRef: Ref<HTMLButtonElement>;
  onPick: (id: string) => void;
  onPickEndless: () => void;
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
  }, [stage, selectedId, isEndless]);

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
      {SECTIONS.map((section) => {
        const unlocked = isSectionUnlocked(section.index, locks);
        const passed = isChallengePassed(section.index, shown);
        const challenge = challengeId(section.index);
        const challengeActive = selectedId === challenge;
        const firstNumber = LEVELS.indexOf(section.levels[0]!) + 1;
        const challengeOffset = nodeOffset(
          firstNumber - 1 + section.levels.length,
        );
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
                    ? section.levels[0]!.hint
                    : `Schaffe die Challenge von Abschnitt ${section.index}, dann geht es hier weiter.`}
                </p>
              </div>
            </div>

            <div
              className="relative mt-5"
              style={{
                height: (section.levels.length + 1) * NODE_STEP_Y + 24,
              }}
            >
              {section.levels.map((level, i) => {
                const number = firstNumber + i;
                const isCelebrated = level.id === fromId;
                const earned =
                  isCelebrated && revealing && celebration
                    ? celebration.revealed
                    : (shown[level.id]?.stars ?? 0);
                const active = !isEndless && level.id === selectedId;
                const offset = nodeOffset(number - 1);
                return (
                  <div
                    key={level.id}
                    className="absolute flex flex-col items-center"
                    style={{
                      top: i * NODE_STEP_Y,
                      left: `calc(50% + ${offset}px - ${NODE_SIZE / 2}px)`,
                      width: NODE_SIZE,
                    }}
                  >
                    {active && (
                      <TravelingToni
                        offset={offset}
                        mood={toniMood}
                        toniRef={toniRef}
                      />
                    )}
                    <button
                      ref={active ? selectedRef : undefined}
                      type="button"
                      disabled={!unlocked}
                      aria-pressed={active}
                      aria-label={
                        unlocked
                          ? `Stufe ${number}: ${level.title}. ${level.hint}. ${earned} von 3 Sternen.`
                          : `Stufe ${number}: ${level.title}. Gesperrt.`
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
                        "spiel-node flex items-center justify-center text-2xl font-extrabold",
                        GAME_FOCUS_RING,
                      )}
                      style={{ width: NODE_SIZE, height: NODE_SIZE - 8 }}
                    >
                      {unlocked ? (
                        number
                      ) : (
                        <Lock className="h-6 w-6" aria-hidden />
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
                  </div>
                );
              })}

              <div
                className="absolute flex flex-col items-center"
                style={{
                  top: section.levels.length * NODE_STEP_Y,
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

      <section aria-label="Endlos">
        <button
          ref={isEndless ? selectedRef : undefined}
          type="button"
          aria-pressed={isEndless}
          onClick={onPickEndless}
          className={cn(
            "spiel-tile flex w-full items-center gap-3 p-4 text-left",
            GAME_FOCUS_RING,
            isEndless && "on-orange bg-primary text-ink",
          )}
        >
          <InfinityIcon className="h-8 w-8 shrink-0 stroke-[2.5]" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold">Endlos</span>
            <span className="mt-0.5 block text-sm leading-snug">
              {endlessHint}
            </span>
          </span>
        </button>
      </section>
    </div>
  );
}
