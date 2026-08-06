import PublicPage from "@/app/_components/general/public-page";
import ParticipationCard from "@/app/_components/general/participation-card";
import { Info } from "lucide-react";
import { GAMES, UPCOMING_GAMES } from "./_lib/games";
import { InstallHintCard } from "./_components/install-hint-card";
import { OfflineReadyCard } from "./_components/offline-ready-card";
import { StatsSyncRunner } from "./_components/stats-sync-runner";

export default function SpielePage() {
  return (
    <PublicPage
      title="Spiele"
      heroTitle="Spiele & Übungen"
      color="district-6"
      breadcrumbs={[{ label: "Start", href: "/" }, { label: "Spiele" }]}
      description={
        <p>
          Kleine interaktive Übungen zum Mitmachen — ohne Anmeldung, direkt im
          Browser.
        </p>
      }
    >
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-5xl">
            <div
              className="mb-8 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950 md:p-5 md:text-base dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100"
              role="note"
            >
              <Info
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden
              />
              <p>
                Alle Spiele befinden sich derzeit in einer frühen
                Entwicklungsphase und können sich noch ändern.
                Schwierigkeitsstufen werden später angepasst.
              </p>
            </div>
            <InstallHintCard />
            <OfflineReadyCard />
            <StatsSyncRunner />
            <h2 className="text-dark dark:text-dark-text mb-8 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Angebote
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {GAMES.map((game) => (
                <ParticipationCard
                  key={game.slug}
                  title={game.cardTitle}
                  description={game.cardDescription}
                  icon="music"
                  href={`/spiele/${game.slug}`}
                  color="district-6"
                />
              ))}
              {UPCOMING_GAMES.map((game) => (
                <ParticipationCard
                  key={game.cardTitle}
                  title={game.cardTitle}
                  description={game.cardDescription}
                  icon="music"
                  color="district-6"
                  comingSoon
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
