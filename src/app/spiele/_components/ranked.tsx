"use client";

import { useEffect } from "react";
import { Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/_components/ui/button";
import { api } from "@/trpc/react";
import { GAME_FOCUS_RING } from "../_lib/focus-ring";
import { ENDLESS_HEARTS, NOTE_TIME_MS } from "../_lib/endless-rules";
import { ResultField } from "./game-kit";
import { GameDock } from "./game-shell-context";
import { ProfileAvatar, useProfiles } from "./profiles";

type Game = "noten-lesen" | "griffe" | "rhythmus";

/** Einstieg zur Bestenliste: nur mit Profil und Netz, weil der Server mitprüft. */
export function RankedTile({
  game,
  variant,
  variantLabel,
  rules = `${NOTE_TIME_MS / 1000} Sekunden je Note, ${ENDLESS_HEARTS} Herzen.`,
  onStart,
}: {
  game: Game;
  variant: string;
  variantLabel: string;
  /** Kurz, was in diesem Spiel zählt. */
  rules?: string;
  onStart: () => void;
}) {
  const { active } = useProfiles();
  const board = api.gameEndless.board.useQuery(
    { game, variant, profileId: active?.id ?? null },
    { refetchOnWindowFocus: true },
  );
  const leader = board.data?.entries[0];
  return (
    <section aria-label="Bestenliste">
      <button
        type="button"
        disabled={!active}
        onClick={onStart}
        className={cn(
          "spiel-tile flex w-full items-center gap-3 p-4 text-left disabled:opacity-60",
          GAME_FOCUS_RING,
        )}
      >
        <Medal
          className="text-primary-ink dark:text-primary h-8 w-8 shrink-0"
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold">
            Bestenliste {variantLabel}
          </span>
          <span className="mt-0.5 block text-sm leading-snug">
            {!active
              ? "Mit Anmeldung und Profil trittst du gegen alle an."
              : board.data?.myBest != null
                ? `Dein Bestwert: ${board.data.myBest}, Platz ${board.data.myRank}.`
                : leader
                  ? `Endlos gegen alle. Vorne: ${leader.name} mit ${leader.score}.`
                  : `Endlos gegen alle: ${rules}`}
          </span>
        </span>
      </button>
    </section>
  );
}

export type RankedOutcome =
  | { status: "finished"; score: number; best: number; isBest: boolean }
  | { status: "invalid"; reason: string }
  | { status: "checking" };

/** Ergebnis eines Bestenlisten-Laufs mit der Spitze der Liste. */
export function RankedResult({
  game,
  variant,
  outcome,
  unit = "richtig",
  onAgain,
  onContinue,
}: {
  game: Game;
  variant: string;
  outcome: RankedOutcome;
  unit?: string;
  onAgain: () => void;
  onContinue: () => void;
}) {
  const { active } = useProfiles();
  const board = api.gameEndless.board.useQuery(
    { game, variant, profileId: active?.id ?? null },
    { enabled: outcome.status !== "checking" },
  );
  const utils = api.useUtils();
  // Die Liste vom Start ist veraltet, sobald der neue Wert gespeichert ist.
  useEffect(() => {
    if (outcome.status !== "checking")
      void utils.gameEndless.board.invalidate();
  }, [outcome.status, utils]);
  return (
    <div className="flex flex-col gap-4 pb-2">
      {outcome.status === "finished" ? (
        <ResultField
          value={String(outcome.score)}
          valueLabel={unit}
          headline={
            outcome.isBest
              ? "Neuer Bestwert."
              : `Dein Bestwert: ${outcome.best}.`
          }
          stars={null}
          celebrate={outcome.isBest}
          badge={board.data?.myRank ? `Platz ${board.data.myRank}` : null}
        />
      ) : outcome.status === "checking" ? (
        <p
          role="status"
          className="text-dark dark:text-night-muted py-10 text-center text-lg font-bold"
        >
          Der Server zählt nach …
        </p>
      ) : (
        <p className="text-ink dark:text-night-text py-6 text-center text-xl font-bold">
          {outcome.reason}
        </p>
      )}
      {board.data && board.data.entries.length > 0 && (
        <ol className="flex flex-col">
          {board.data.entries.slice(0, 10).map((entry, index) => (
            <li
              key={entry.key}
              className={cn(
                "flex items-center gap-3 px-3 py-2",
                entry.isMe &&
                  "on-orange bg-primary text-ink rounded-[var(--spiel-corner,1rem)]",
              )}
            >
              <span className="w-6 text-right font-extrabold tabular-nums">
                {index + 1}
              </span>
              <ProfileAvatar profile={entry} className="h-9 w-9" />
              <span className="min-w-0 flex-1 truncate font-bold">
                {entry.name}
              </span>
              <span className="font-extrabold tabular-nums">{entry.score}</span>
            </li>
          ))}
        </ol>
      )}
      <GameDock>
        <div className="flex gap-2">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="flex-1"
            onClick={onAgain}
          >
            Nochmal
          </Button>
          <Button
            type="button"
            size="lg"
            className="spiel-action flex-1"
            onClick={onContinue}
          >
            Weiter
          </Button>
        </div>
      </GameDock>
    </div>
  );
}
