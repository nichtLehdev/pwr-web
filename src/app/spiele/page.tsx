import PublicPage from "@/app/_components/general/public-page";
import ParticipationCard from "@/app/_components/general/participation-card";
import { Info } from "lucide-react";

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
            <h2 className="text-dark dark:text-dark-text mb-8 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Angebote
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ParticipationCard
                title="Rhythmus-Training"
                description="Rhythmus lesen und mit Tippen wiedergeben — mit Metronom und Auswertung"
                icon="music"
                href="/spiele/rhythmus"
                color="district-6"
              />
              <ParticipationCard
                title="Noten lesen"
                description="Einzelne Noten im Schlüssel erkennen — Instrument, Modus und Schwierigkeit wählbar"
                icon="music"
                href="/spiele/noten-lesen"
                color="district-6"
              />
              <ParticipationCard
                title="Griffe"
                description="Noten lesen und die passenden Ventile oder Zugpositionen wählen — mit Sofort-Feedback"
                icon="music"
                href="/spiele/griffe"
                color="district-6"
              />
              <ParticipationCard
                title="Notenwaage"
                description="Notenwerte auf der rechten Seite ergänzen, bis die Waage mit links genau ausgeglichen ist"
                icon="music"
                href="/spiele/notenwaage"
                color="district-6"
              />
              <ParticipationCard
                title="Choräle-Raten"
                description="Erkenne den Choral anhand der ersten Takte der Melodie in den Noten"
                icon="music"
                color="district-6"
                comingSoon
              />
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
