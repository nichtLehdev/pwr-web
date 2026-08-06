import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { GAMES } from "../spiele/_lib/games";

export const metadata: Metadata = {
  title: "Offline",
  description: "Du bist gerade offline.",
};

/**
 * Fallback-Seite des Service Workers für nicht gecachte Routen.
 * Bewusst schlicht: Die Links funktionieren auch ohne JavaScript-Hydration
 * als normale Anker und führen zu den (gecachten) Spielen.
 */
export default function OfflinePage() {
  return (
    <section className="bg-background dark:bg-dark-background py-16 md:py-24">
      <div className="container">
        <div className="mx-auto max-w-xl text-center">
          <WifiOff
            className="text-primary mx-auto h-12 w-12 stroke-[1.5]"
            aria-hidden
          />
          <h1 className="text-dark dark:text-dark-text mt-4 text-2xl font-bold md:text-3xl">
            Du bist offline
          </h1>
          <p className="text-dark dark:text-dark-text-secondary mt-3">
            Diese Seite ist ohne Internetverbindung nicht verfügbar. Zuletzt
            geladene Spiele funktionieren aber weiter:
          </p>
          <ul className="mt-6 space-y-2">
            {GAMES.map((game) => (
              <li key={game.slug}>
                <a
                  href={`/spiele/${game.slug}`}
                  className="text-primary dark:text-primary-light font-semibold underline-offset-4 hover:underline"
                >
                  {game.cardTitle}
                </a>
              </li>
            ))}
          </ul>
          <p className="text-dark dark:text-dark-text-muted mt-8 text-sm">
            Sobald du wieder online bist, laden alle Seiten normal.
          </p>
        </div>
      </div>
    </section>
  );
}
