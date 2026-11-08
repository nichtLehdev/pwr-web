"use client";

import { useEffect } from "react";
import { Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/_components/ui/button";
import { api } from "@/trpc/react";
import { GAME_FOCUS_RING } from "../_lib/focus-ring";
import { ResultField } from "./game-kit";
import { GameDock } from "./game-shell-context";
import { ProfileAvatar, useProfiles } from "./profiles";

type Game = "noten-lesen" | "griffe" | "rhythmus";

export type RankedOutcome =
  | { status: "finished"; score: number; best: number; isBest: boolean }
  | { status: "invalid"; reason: string }
  | { status: "checking" }
  /** Ohne Profil oder Netz: gespielt, aber nicht in der Liste. */
  | { status: "unranked"; score: number; reason: string };

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
      ) : outcome.status === "unranked" ? (
        <ResultField
          value={String(outcome.score)}
          valueLabel={unit}
          headline="Gut gespielt."
          stars={null}
          badge={null}
        />
      ) : null}
      {outcome.status === "unranked" ? (
        <p className="text-dark dark:text-night-muted text-center text-sm">
          {outcome.reason}
        </p>
      ) : outcome.status === "checking" ? (
        <p
          role="status"
          className="text-dark dark:text-night-muted py-10 text-center text-lg font-bold"
        >
          Der Server zählt nach …
        </p>
      ) : outcome.status === "invalid" ? (
        <p className="text-ink dark:text-night-text py-6 text-center text-xl font-bold">
          {outcome.reason}
        </p>
      ) : null}
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

/** Die ganze Bestenliste; Spielen geht von hier, aber erst, wenn Endlos offen ist. */
export function LeaderboardView({
  game,
  variants,
  variant,
  onVariant,
  unit = "richtig",
  playLocked,
  onPlay,
  onBack,
}: {
  game: Game;
  variants: readonly { id: string; label: string }[];
  variant: string;
  onVariant: (id: string) => void;
  unit?: string;
  /** Warum Endlos noch zu ist; `null`, wenn gespielt werden darf. */
  playLocked: string | null;
  onPlay: () => void;
  onBack: () => void;
}) {
  const { active } = useProfiles();
  const board = api.gameEndless.board.useQuery(
    { game, variant, profileId: active?.id ?? null },
    { refetchOnWindowFocus: true },
  );
  const mineVisible = board.data?.entries.some((e) => e.isMe);
  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex items-center gap-3">
        <Medal
          className="text-primary-ink dark:text-primary h-9 w-9 shrink-0"
          aria-hidden
        />
        <h2 className="text-ink dark:text-night-text text-3xl font-extrabold">
          Bestenliste
        </h2>
      </div>
      {variants.length > 1 && (
        <div role="group" aria-label="Liste" className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={v.id === variant}
              onClick={() => onVariant(v.id)}
              className={cn(
                "spiel-tile min-h-11 px-3 py-2 text-sm font-bold",
                GAME_FOCUS_RING,
                v.id === variant && "on-orange bg-primary text-ink",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
      {board.isPending ? (
        <p className="text-dark dark:text-night-muted py-8 text-center text-sm">
          Lädt …
        </p>
      ) : board.data && board.data.entries.length > 0 ? (
        <ol className="flex flex-col">
          {board.data.entries.map((entry, index) => (
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
                {entry.isMe && <span className="sr-only"> (du)</span>}
              </span>
              <span className="font-extrabold tabular-nums">
                {entry.score} <span className="text-xs font-bold">{unit}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-ink dark:text-night-text py-6 text-center text-lg">
          Hier hat noch niemand gespielt.
        </p>
      )}
      {board.data?.myBest != null && !mineVisible && (
        <p className="text-ink dark:text-night-text text-center font-bold">
          Dein Bestwert: {board.data.myBest}, Platz {board.data.myRank}.
        </p>
      )}
      {!active && (
        <p className="text-dark dark:text-night-muted text-center text-sm">
          Mit Anmeldung und Profil kommst du selbst in die Liste.
        </p>
      )}
      <GameDock>
        <div className="flex gap-2">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="flex-1"
            onClick={onBack}
          >
            Zurück
          </Button>
          <Button
            type="button"
            size="lg"
            className="spiel-action flex-1"
            disabled={Boolean(playLocked)}
            onClick={onPlay}
          >
            {playLocked ? "Noch gesperrt" : "Spielen"}
          </Button>
        </div>
      </GameDock>
    </div>
  );
}

export const UNRANKED_NO_PROFILE =
  "Ohne Profil zählt dieser Lauf nicht für die Bestenliste.";
export const UNRANKED_OFFLINE =
  "Offline: Dieser Lauf zählt nicht für die Bestenliste.";
export const UNRANKED_SERVER =
  "Der Server ist gerade nicht erreichbar. Dieser Lauf zählt nicht für die Bestenliste.";

/** Warum ein Endlos-Lauf nicht in die Liste kommt, gleich beim Start. */
export function unrankedReason(hasProfile: boolean): string {
  if (!hasProfile) return UNRANKED_NO_PROFILE;
  if (typeof navigator !== "undefined" && !navigator.onLine)
    return UNRANKED_OFFLINE;
  return UNRANKED_SERVER;
}

/** Sichtbar während des Laufs, damit niemand erst am Ende enttäuscht ist. */
export function UnrankedNotice({ reason }: { reason: string | null }) {
  if (!reason) return null;
  return (
    <p
      role="status"
      className="border-rule bg-rule/25 text-ink dark:border-night-rule dark:bg-night-raised dark:text-night-text rounded-[var(--spiel-corner,1rem)] border px-3 py-2 text-center text-sm font-bold"
    >
      {reason}
    </p>
  );
}
