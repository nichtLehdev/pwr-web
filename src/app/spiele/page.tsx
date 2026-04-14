import PublicPage from "@/app/_components/general/public-page";
import ParticipationCard from "@/app/_components/general/participation-card";

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
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
