import PageHeader from "@/app/_components/general/page-header";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/trpc/server";
import ConcertCard from "@/app/_components/events/concert-card";
import {
  Music,
  Calendar,
  MapPin,
  Users,
  ChevronRight,
  User,
} from "lucide-react";

export default async function AuswahlchoerePage() {
  const ensembles = (await api.auswahlchoere.getAll({})).auswahlchoere;

  return (
    <div>
      <PageHeader title="Auswahlchöre" color="district-3" />

      {/* Hero Section */}
      <section className="bg-district-3 py-12 text-white md:py-16 lg:py-20">
        <div className="container">
          <nav className="mb-4 flex items-center gap-2 text-sm opacity-90">
            <Link href="/" className="transition-colors hover:text-white">
              Start
            </Link>
            <span>/</span>
            <Link
              href="/ueber-uns"
              className="transition-colors hover:text-white"
            >
              Über Uns
            </Link>
            <span>/</span>
            <span>Auswahlchöre</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
              Unsere Auswahlchöre
            </h1>
            <p className="text-lg leading-relaxed opacity-95 md:text-xl">
              Die Auswahlchöre des Posaunenwerks Rheinland repräsentieren die
              musikalische Spitze unserer Arbeit. Sie setzen sich aus besonders
              engagierten und talentierten Bläserinnen und Bläsern zusammen und
              präsentieren die Vielfalt der Posaunenchormusik auf höchstem
              Niveau.
            </p>
          </div>
        </div>
      </section>

      {/* Ensembles */}
      {ensembles.map((ensemble, index) => (
        <section
          key={ensemble.name}
          id={ensemble.slug}
          className={`scroll-mt-20 py-12 md:py-16 lg:py-20 ${
            index % 2 === 0
              ? "bg-background dark:bg-dark-background"
              : "bg-background-secondary dark:bg-dark-background-secondary"
          }`}
        >
          <div className="container">
            <div
              className={`flex flex-col ${
                index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
              } mx-auto max-w-6xl items-start gap-8 lg:gap-12`}
            >
              <div className="w-full lg:w-1/2">
                <div className="relative h-full overflow-hidden rounded-lg shadow-xl">
                  {!ensemble.image && (
                    <div
                      className={`absolute inset-0 ${ensemble.color} flex items-center justify-center`}
                    >
                      <Music className="h-32 w-32 text-white opacity-50" />
                    </div>
                  )}

                  {ensemble.image && (
                    <div className="relative h-full w-full">
                      <Image
                        src={ensemble.image.url}
                        alt={`Ein Bild des Ensembles ${ensemble.name}`}
                        priority={index < 2}
                        width={800}
                        height={533}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="w-full lg:w-1/2">
                <h2 className="text-dark dark:text-dark-text mb-2 text-3xl font-bold wrap-break-word md:text-4xl">
                  {ensemble.name}
                </h2>
                <p className="text-primary mb-6 text-xl font-semibold">
                  {ensemble.subtitle}
                </p>

                {/* Metadaten */}
                <div className="mb-6 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Calendar className="h-5 w-5" />
                    <span className="font-semibold">
                      Seit {ensemble.founded}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Users className="h-5 w-5" />
                    <span className="font-semibold">{ensemble.members}</span>
                  </div>
                  {ensemble.conductor && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <User className="h-5 w-5" />
                      <span className="font-semibold">
                        {ensemble.conductor.displayRole &&
                          `${ensemble.conductor.displayRole} `}
                        {ensemble.conductor.displayName}
                      </span>
                    </div>
                  )}
                </div>

                <p className="mb-6 leading-relaxed text-gray-600 dark:text-gray-400">
                  {ensemble.description}
                </p>

                {/* Kommende Konzerte */}
                {ensemble.events && ensemble.events.length > 0 && (
                  <div className="dark:bg-dark-surface dark:shadow-dark-border mb-6 rounded-lg bg-white p-6 shadow-md">
                    <h3 className="text-dark dark:text-dark-text mb-4 text-lg font-bold">
                      Kommende Termine
                    </h3>
                    <div className="space-y-4">
                      {ensemble.events.map((event, i: number) => (
                        <ConcertCard
                          key={i}
                          concert={event}
                          ensemble={ensemble}
                          i={i}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Bewerbung für LaJuPo */}
                {ensemble.showApplication && (
                  <div className={`p-6 ${ensemble.color}/10 rounded-lg`}>
                    <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-bold">
                      Interesse am LaJuPo?
                    </h3>
                    <p className="mb-4 text-gray-600 dark:text-gray-400">
                      Teilnehmen kann, wer 15-25 Jahre alt ist. Die Teilnahme
                      erfolgt über ein Vorspiel, das alle 2 Jahre stattfindet.
                      Mit der Teilnahme verpflichtet man sich für 2 Jahre bei
                      den 3-4 Proben&shy;wochenenden und Konzerten pro Jahr. Die
                      nächste Legislatur beginnt 2027.
                    </p>
                    <Link
                      href="/kontakt"
                      className={`inline-flex items-center px-6 py-3 ${ensemble.color} rounded-lg font-semibold text-white transition-opacity hover:opacity-90`}
                    >
                      Jetzt informieren
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20"></section>

      <section className="bg-primary py-12 text-white md:py-16 lg:py-20"></section>
    </div>
  );
}
