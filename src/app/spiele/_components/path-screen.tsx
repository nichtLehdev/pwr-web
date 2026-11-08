"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { isDailyDone } from "../_lib/daily";
import { Check, Lock, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/_components/ui/button";
import { GAME_FOCUS_RING } from "../_lib/focus-ring";
import {
  CHALLENGE_PASS_PERCENT,
  type LearningPath,
  type PathStage,
} from "../_lib/learning-path";
import type { usePathState } from "../_lib/use-path-state";
import { GameDock } from "./game-shell-context";
import { LearningPathMap } from "./learning-path-map";
import { usePathCelebration } from "./use-path-celebration";
import { TutorialHelpButton, useTutorial } from "./tutorial";
import { BottomSheet } from "./bottom-sheet";
import type { TutorialId } from "../_lib/tutorials";

/** Ein neuer Bildschirm beginnt oben, egal wie weit der Pfad gescrollt war. */
export function scrollGameToTop(from: Element | null): void {
  for (let el = from?.parentElement; el; el = el.parentElement) {
    if (el.scrollTop > 0) el.scrollTop = 0;
  }
  window.scrollTo(0, 0);
}

/** Der Einstieg eines Spiels: Pfad, Toni, Animation nach einer Stufe und Startknopf. */
export function PathScreen<S extends PathStage>({
  path,
  state,
  head,
  below,
  modes,
  challengeText = `Alles, was du bisher gelernt hast, drei Mal Puste. Schaffe ${CHALLENGE_PASS_PERCENT} %.`,
  tutorials,
  challengeTutorials = [],
  onStart,
}: {
  path: LearningPath<S>;
  state: ReturnType<typeof usePathState<S>>;
  head: ReactNode;
  below?: ReactNode;
  /** Kleine Knöpfe über dem Pfad: Tagestraining, Endlos, Bestenliste. */
  modes?: ReactNode;
  challengeText?: string;
  /** Was Toni vor einer Stufe zum ersten Mal erklärt; die Challenge kommt von selbst dazu. */
  tutorials?: (stage: S) => TutorialId[];
  challengeTutorials?: TutorialId[];
  onStart: () => void;
}) {
  const tutorial = useTutorial();
  const { selectedId, progress, celebration } = state;
  const challengeSection = path.parseChallengeId(selectedId);
  const stage = path.stageById(selectedId) ?? path.stages[0]!;
  const number = path.stages.indexOf(stage) + 1;
  const selectedRef = useRef<HTMLButtonElement>(null);
  const userPicked = useRef(false);
  const celebrating = usePathCelebration(
    celebration,
    state.select,
    state.clearCelebration,
  );

  // Beim Öffnen dort einsteigen, wo man zuletzt war; spätere Klicks verschieben nichts.
  useEffect(() => {
    if (userPicked.current) return;
    if (celebration) {
      selectedRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    } else if (challengeSection !== null || number > 3) {
      selectedRef.current?.scrollIntoView({ block: "center" });
    }
  }, [celebration, challengeSection, number]);

  const tutorialIds: TutorialId[] =
    challengeSection !== null
      ? ["challenge", ...challengeTutorials]
      : (tutorials?.(stage) ?? []);

  const celebratedNumber = celebration
    ? path.stages.findIndex((s) => s.id === celebration.fromId) + 1
    : 0;

  return (
    <div className="flex flex-col gap-5 pb-2">
      {head}
      {modes}
      <LearningPathMap
        path={path}
        selectedId={selectedId}
        celebration={
          celebration && celebrating.stage
            ? {
                ...celebration,
                stage: celebrating.stage,
                revealed: celebrating.revealed,
              }
            : null
        }
        progress={progress}
        selectedRef={selectedRef}
        onPick={(id) => {
          userPicked.current = true;
          state.select(id);
        }}
      />
      {below}
      <GameDock>
        <div className="flex flex-col gap-1.5">
          {celebration ? (
            <>
              <p
                role="status"
                className="text-ink dark:text-night-text text-center text-sm leading-snug font-bold"
              >
                {celebratedNumber > 0
                  ? `Stufe ${celebratedNumber} geschafft!`
                  : "Challenge geschafft!"}
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
                    : `${stage.title}:`}
                </strong>{" "}
                <span className="text-dark dark:text-night-muted">
                  {challengeSection !== null ? challengeText : stage.hint}
                </span>
                <TutorialHelpButton ids={tutorialIds} />
              </p>
              <Button
                type="button"
                size="lg"
                className="spiel-action w-full"
                onClick={() => {
                  tutorial.gate(tutorialIds, () => {
                    scrollGameToTop(selectedRef.current);
                    onStart();
                  });
                }}
              >
                {challengeSection !== null
                  ? "Challenge starten"
                  : number > 0
                    ? `Stufe ${number} spielen`
                    : "Bonus spielen"}
              </Button>
            </>
          )}
        </div>
      </GameDock>
    </div>
  );
}

/** Auswahl über dem Pfad, etwa das Instrument: Jede Wahl hat ihren eigenen Fortschritt. */
export function PathChoice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
          className={cn(
            "spiel-tile min-h-11 flex-1 basis-[calc(50%-0.5rem)] px-3 py-2 text-sm font-bold sm:basis-0",
            GAME_FOCUS_RING,
            option.id === value && "on-orange bg-primary text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Die freien Modi und eigenen Notensets als Blatt, geöffnet über den Knopf über dem Pfad. */
export function FreePractice({
  open,
  onToggle,
  children,
  onStart,
}: {
  open: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
  onStart: () => void;
}) {
  if (!open) return null;
  return (
    <BottomSheet
      eyebrow="Ohne Lernpfad"
      title="Frei üben"
      onClose={() => onToggle(false)}
    >
      <p className="text-dark dark:text-night-muted -mt-2 text-sm">
        Eigene Notensets, Quiz und Endlos. Zählt nicht für Sterne.
      </p>
      {children}
      <Button
        type="button"
        size="lg"
        className="spiel-action w-full"
        onClick={() => {
          onToggle(false);
          onStart();
        }}
      >
        Frei üben starten
      </Button>
    </BottomSheet>
  );
}

/** Zurück zum Pfad mitten in einer Runde; der Fortschritt bleibt unberührt. */
export function LeaveRunButton({ onLeave }: { onLeave: () => void }) {
  return (
    <button
      type="button"
      onClick={onLeave}
      className={cn(
        "border-rule text-dark hover:text-ink dark:border-night-rule dark:text-night-muted dark:hover:text-night-text inline-flex min-h-11 items-center gap-1.5 border px-3 text-sm font-bold transition-colors",
        GAME_FOCUS_RING,
      )}
    >
      <X className="h-4 w-4" aria-hidden />
      Abbrechen
    </button>
  );
}

/** Hat das Profil das heutige Tagestraining schon gemacht? */
export function useDailyDone(game: string, refresh?: unknown): boolean {
  const [done, setDone] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Serverbild kennt den Speicher nicht
  useEffect(() => setDone(isDailyDone(game)), [game, refresh]);
  return done;
}

export type ModeButtonSpec = {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Kurzer Zustand unter dem Namen. */
  status: string;
  /** Warum der Knopf noch zu ist; `null`, wenn er offen ist. */
  locked?: string | null;
  /** Hervorgehoben, etwa ein noch offenes Tagestraining. */
  highlight?: boolean;
  /** Für heute erledigt: Haken statt Symbol, erst morgen wieder spielbar. */
  done?: boolean;
  onClick: () => void;
};

/** Die Spielarten als runde Knöpfe in Stufengröße über dem Pfad; Gesperrtes trägt ein Schloss. */
export function ModeButtons({ buttons }: { buttons: ModeButtonSpec[] }) {
  const tutorial = useTutorial();
  return (
    <div
      className={cn(
        "flex justify-center",
        buttons.length > 3 ? "gap-3" : "gap-6",
      )}
    >
      {buttons.map(
        ({
          key,
          label,
          icon: Icon,
          status,
          locked,
          highlight,
          done,
          onClick,
        }) => (
          <div
            key={key}
            className="flex w-[72px] flex-col items-center gap-1.5"
          >
            <button
              type="button"
              disabled={Boolean(locked) || done}
              onClick={() =>
                tutorial.gate(
                  key === "daily" || key === "endless" ? [key] : [],
                  onClick,
                )
              }
              aria-label={`${label}: ${locked ?? status}`}
              title={locked ?? status}
              data-state={locked ? "locked" : highlight ? "active" : "done"}
              className={cn(
                "spiel-node spiel-mode flex items-center justify-center",
                GAME_FOCUS_RING,
              )}
              style={{ width: 64, height: 58 }}
            >
              {locked ? (
                <Lock className="h-6 w-6" aria-hidden />
              ) : done ? (
                <Check className="h-7 w-7 stroke-[3]" aria-hidden />
              ) : (
                <Icon className="h-7 w-7 stroke-[2.25]" aria-hidden />
              )}
            </button>
            <span
              className="text-ink dark:text-night-text text-xs font-extrabold"
              aria-hidden
            >
              {label}
            </span>
          </div>
        ),
      )}
    </div>
  );
}
