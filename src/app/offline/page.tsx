import type { Metadata } from "next";
import { WifiOff, ArrowRight } from "lucide-react";
import { GAMES } from "../spiele/_lib/games";

export const metadata: Metadata = {
  title: "Offline",
  description: "Du bist gerade offline.",
};

/**
 * Service-Worker-Fallback für nicht gecachte Routen. Normale Anker statt `next/link`,
 * damit die Links zu den gecachten Spielen auch ohne Hydration funktionieren.
 */
export default function OfflinePage() {
  return (
    <div className="programm font-programm bg-paper text-ink dark:bg-night dark:text-night-text min-h-screen">
      <div className="sheet flex min-h-screen flex-col items-center justify-center py-16 text-center md:py-24">
        <WifiOff
          className="text-primary-ink dark:text-primary h-12 w-12 stroke-[1.5]"
          aria-hidden
        />
        <h1 className="condensed mt-6 text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[0.95] font-extrabold">
          Du bist offline
        </h1>
        <p className="mt-4 max-w-[60ch] text-lg leading-relaxed">
          Diese Seite ist ohne Internetverbindung nicht verfügbar. Zuletzt
          geladene Spiele funktionieren aber weiter:
        </p>

        <ul className="border-ink dark:border-night-text mt-8 w-full max-w-md border-t-2 text-left">
          {GAMES.map((game) => (
            <li
              key={game.slug}
              className="fill-row border-rule dark:border-night-rule border-b"
            >
              <a
                href={`/spiele/${game.slug}`}
                className="condensed text-ink dark:text-night-text flex min-h-14 items-center justify-between gap-4 px-1 text-[1.5rem] leading-tight font-bold"
              >
                {game.cardTitle}
                <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
              </a>
            </li>
          ))}
        </ul>

        <p className="text-dark dark:text-night-muted mt-8 text-sm">
          Sobald du wieder online bist, laden alle Seiten normal.
        </p>
      </div>
    </div>
  );
}
