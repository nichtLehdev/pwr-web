import Link from "next/link";
import Image from "next/image";
import PublicPage from "@/app/_components/general/public-page";
import { api } from "@/trpc/server";
import { ArrowRightIcon, CheckIcon } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Literatur & CDs",
  description:
    "Noten, Bläserhefte, Literaturempfehlungen und CDs des Posaunenwerks Rheinland für Posaunenchöre und Jungbläser.",
  path: "/materialien/literatur",
});

export default async function LiteraturPage() {
  const blaesherhefte = await api.materials.getBlaserhefte();

  return (
    <PublicPage
      title="Literatur & CDs"
      heroTitle="Bläserliteratur und CDs"
      color="district-2"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Materialien", href: "/materialien" },
        { label: "Literatur & CDs" },
      ]}
      description={
        <p>
          Entdecken Sie unsere Reihe &quot;Musik aus ...&quot; mit hochwertiger
          Bläserliteratur aus verschiedenen Ländern und Regionen. Jede Ausgabe
          bietet eine Mischung aus klassischen Meisterwerken,
          Choralbearbeitungen und zeitgenössischen Auftragskompositionen.
        </p>
      }
    >
      {/* Einleitung */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8">
              <h2 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold md:text-3xl">
                Rheinische Bläserhefte
              </h2>
              <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-400">
                Die Rheinischen Bläserhefte erscheinen regelmäßig und bieten
                jeweils eine umfangreiche Sammlung von Musik aus einem
                bestimmten Land oder einer Region. Jedes Heft umfasst mehrere
                Kapitel mit verschiedenen musikalischen Schwerpunkten:
              </p>
              <ul className="mb-6 space-y-2 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <CheckIcon className="text-district-2 mt-0.5 h-5 w-5 shrink-0" />
                  Bearbeitungen von Werken großer Komponisten
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="text-district-2 mt-0.5 h-5 w-5 shrink-0" />
                  Neue Vorspiele und Begleitsätze zu Gesangbuchliedern
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="text-district-2 mt-0.5 h-5 w-5 shrink-0" />
                  Exklusive Auftragskompositionen renommierter Komponisten
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="text-district-2 mt-0.5 h-5 w-5 shrink-0" />
                  Populäre Melodien aus Film, Musical und Popmusik
                </li>
              </ul>
              <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                Ergänzend zu jedem Bläserheft erscheinen Beihefte mit
                Kurzandachten, ausgearbeiteten Gottesdiensten und
                Konzertbausteinen sowie CDs mit Einspielungen durch unser
                Auswahlensemble Con Spirito.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bläserhefte */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-dark dark:text-dark-text mb-8 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Unsere Bläserhefte
            </h2>

            <div className="space-y-12">
              {blaesherhefte.map((heft, index) => (
                <div
                  key={heft.id}
                  className={`dark:bg-dark-surface dark:shadow-dark-border overflow-hidden rounded-lg bg-white shadow-lg ${
                    index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  } flex flex-col md:flex`}
                >
                  {/* Bild */}
                  <div className="dark:bg-dark-background-secondary relative h-64 bg-gray-200 md:h-auto md:w-1/3">
                    <Image
                      src={heft.image.url}
                      alt={heft.image.alt || heft.title || "Bläserheft Cover"}
                      fill
                      className="object-cover"
                    />
                    {!heft.availableBlaeserheft && (
                      <div className="absolute top-4 right-4 rounded-full bg-red-500 px-3 py-1 text-sm font-semibold text-white">
                        Vergriffen
                      </div>
                    )}
                    {heft.year >= 2024 && (
                      <div className="bg-district-2 absolute top-4 left-4 rounded-full px-3 py-1 text-sm font-semibold text-white">
                        Neu
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 md:w-2/3 md:p-8">
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <h3 className="text-dark dark:text-dark-text mb-1 text-2xl font-bold md:text-3xl">
                          {heft.title}
                        </h3>
                        <p className="text-district-2 text-lg font-semibold">
                          {heft.subtitle}
                        </p>
                      </div>
                    </div>

                    <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-400">
                      {heft.description}
                    </p>

                    {/* Chapters */}
                    {heft.chapters && heft.chapters.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-dark dark:text-dark-text mb-2 text-sm font-semibold">
                          Kapitel:
                        </h4>
                        <ul className="space-y-1">
                          {heft.chapters.map((chapter, idx) => (
                            <li
                              key={idx}
                              className="relative pl-4 text-sm text-gray-600 before:absolute before:left-0 before:content-['•'] dark:text-gray-400"
                            >
                              {chapter}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Highlights */}
                    {heft.highlights && heft.highlights.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-dark dark:text-dark-text mb-2 text-sm font-semibold">
                          Besondere Highlights:
                        </h4>
                        <ul className="space-y-1">
                          {heft.highlights.map((highlight, idx) => (
                            <li
                              key={idx}
                              className="before:text-district-2 relative pl-4 text-sm text-gray-600 before:absolute before:left-0 before:content-['★'] dark:text-gray-400"
                            >
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Audio Sample */}
                    {heft.audioSample && (
                      <div className="mb-6">
                        <h4 className="text-dark dark:text-dark-text mb-2 text-sm font-semibold">
                          Hörprobe:
                        </h4>
                        <audio controls className="w-full max-w-md">
                          <source src={heft.audioSample} type="audio/mpeg" />
                          Ihr Browser unterstützt das Audio-Element nicht.
                        </audio>
                      </div>
                    )}

                    {/* Preise */}
                    <div className="dark:border-dark-border border-t border-gray-200 pt-4">
                      <h4 className="text-dark dark:text-dark-text mb-3 font-semibold">
                        Verfügbar:
                      </h4>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {heft.availableBlaeserheft && heft.priceBlaeserheft && (
                          <div className="bg-district-2/5 dark:bg-district-2/10 rounded-lg p-3 text-center">
                            <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                              Bläserheft
                            </p>
                            <p className="text-dark dark:text-dark-text text-lg font-bold">
                              {heft.priceBlaeserheft} €
                            </p>
                          </div>
                        )}
                        {heft.availableBeiheft && heft.priceBeiheft && (
                          <div className="bg-district-2/5 dark:bg-district-2/10 rounded-lg p-3 text-center">
                            <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                              Beiheft
                            </p>
                            <p className="text-dark dark:text-dark-text text-lg font-bold">
                              {heft.priceBeiheft} €
                            </p>
                          </div>
                        )}
                        {heft.availableTrompeten && heft.priceTrompeten && (
                          <div className="bg-district-2/5 dark:bg-district-2/10 rounded-lg p-3 text-center">
                            <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                              Trompeten in B
                            </p>
                            <p className="text-dark dark:text-dark-text text-lg font-bold">
                              {heft.priceTrompeten} €
                            </p>
                          </div>
                        )}
                        {heft.availableCd && heft.priceCd && (
                          <div className="bg-district-2/5 dark:bg-district-2/10 rounded-lg p-3 text-center">
                            <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                              CD
                            </p>
                            <p className="text-dark dark:text-dark-text text-lg font-bold">
                              {heft.priceCd} €
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bestellinformationen */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="bg-district-2 rounded-lg p-6 text-white md:p-8">
              <h2 className="mb-4 text-2xl font-bold md:text-3xl">
                Bestellung
              </h2>
              <p className="mb-6 text-lg leading-relaxed opacity-95">
                Die Bläserhefte sowie dazu erschienene CDs mit jeweils einer
                Auswahl von Stücken aus dem Heft sowie Begleitmaterial für
                Konzerte und Gottesdienste können über die Geschäftsstelle oder
                den einschlägigen Musikalienhandel bezogen werden.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/kontakt"
                  className="text-district-2 inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 font-semibold transition-colors hover:bg-gray-100"
                >
                  Geschäftsstelle kontaktieren
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  href="/materialien"
                  className="inline-flex items-center justify-center rounded-lg border-2 border-white px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Zurück zu Materialien
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
