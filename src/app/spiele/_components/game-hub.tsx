"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Tag } from "@/app/_components/programmheft/tag";
import { WayList, WayRow } from "@/app/_components/programmheft/way-list";
import { GAMES, UPCOMING_GAMES, type GameDefinition } from "../_lib/games";
import { loadGameState } from "../_lib/stats/storage";
import { DailyStats } from "./game-kit";
import { ProfileAvatar, ProfileBadge, useProfiles } from "./profiles";
import { Toni } from "./toni";

type LastPlayed = { game: GameDefinition; at: string } | null;

function findLastPlayed(): LastPlayed {
  let last: LastPlayed = null;
  for (const game of GAMES) {
    const at = loadGameState(game.slug).aggregates.lastPlayedAt;
    if (at && (!last || at > last.at)) last = { game, at };
  }
  return last;
}

/** Tonis Empfang auf der Übersicht: Programmheft-Linien, aber schon ein Stück Spiel. */
export function GameHub() {
  const { active } = useProfiles();
  const [last, setLast] = useState<LastPlayed>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Serverbild kennt den Speicher nicht
  useEffect(() => setLast(findLastPlayed()), [active?.id]);
  const target = last?.game ?? GAMES[0]!;

  return (
    <section
      aria-label="Weiterspielen"
      className="border-ink dark:border-night-text mb-8 flex flex-col gap-4 border-y-2 py-5 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {active ? (
          <ProfileAvatar
            profile={active}
            className="h-24 w-24 sm:h-28 sm:w-28"
          />
        ) : (
          <Toni mood="idle" className="h-24 w-24 sm:h-28 sm:w-28" />
        )}
        <div className="min-w-0">
          <p className="condensed text-ink dark:text-night-text text-[1.75rem] leading-none font-extrabold">
            {active
              ? `Hallo, ${active.name}!`
              : last
                ? "Schön, dass du wieder da bist!"
                : "Hallo, ich bin Toni!"}
          </p>
          <DailyStats />
          <ProfileBadge />
        </div>
      </div>
      <Link
        href={`/spiele/${target.slug}`}
        className="spiele-hub-action mb-1.5 flex min-h-14 items-center justify-center px-6 text-lg font-extrabold sm:shrink-0"
      >
        {last ? `Weiter: ${target.title}` : `Los geht's: ${target.title}`}
      </Link>
    </section>
  );
}

/** Die Spiele als Wegzeilen; wer schon gespielt hat, sieht hier seine Runden. */
export function GameRows({ labelledBy }: { labelledBy: string }) {
  const { active } = useProfiles();
  const [plays, setPlays] = useState<Record<string, number>>({});
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Serverbild kennt den Speicher nicht
    setPlays(
      Object.fromEntries(
        GAMES.map((g) => [g.slug, loadGameState(g.slug).aggregates.plays]),
      ),
    );
  }, [active?.id]);

  return (
    <WayList labelledBy={labelledBy} columns={2}>
      {GAMES.map((game) => {
        const count = plays[game.slug] ?? 0;
        return (
          <WayRow
            key={game.slug}
            href={`/spiele/${game.slug}`}
            title={game.cardTitle}
            description={game.cardDescription}
            status={
              count > 0 ? (
                <Tag>{count === 1 ? "1 Runde" : `${count} Runden`}</Tag>
              ) : undefined
            }
          />
        );
      })}
      {UPCOMING_GAMES.map((game) => (
        <WayRow
          key={game.cardTitle}
          title={game.cardTitle}
          description={game.cardDescription}
          status={<Tag>Demnächst</Tag>}
        />
      ))}
    </WayList>
  );
}
