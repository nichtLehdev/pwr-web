import Link from "next/link";
import Image from "next/image";
import PageHeader from "@/app/_components/general/page-header";
import { api } from "@/trpc/server";

export default async function LiteraturPage() {
  const blaesherhefte = await api.materials.getBlaserhefte();

  return (
    <div>
      <PageHeader title="Literatur & CDs" color="district-2" />

      {/* Hero Section */}
      <section className="bg-district-2 py-12 text-white md:py-16 lg:py-20">
        <div className="container">
          <nav className="mb-4 flex items-center gap-2 text-sm opacity-90">
            <Link href="/" className="transition-colors hover:text-white">
              Start
            </Link>
            <span>/</span>
            <Link
              href="/materialien"
              className="transition-colors hover:text-white"
            >
              Materialien
            </Link>
            <span>/</span>
            <span>Literatur & CDs</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
              Bläserliteratur und CDs
            </h1>
            <p className="text-lg leading-relaxed opacity-95 md:text-xl">
              Entdecken Sie unsere Reihe &quot;Musik aus ...&quot; mit
              hochwertiger Bläserliteratur aus verschiedenen Ländern und
              Regionen. Jede Ausgabe bietet eine Mischung aus klassischen
              Meisterwerken, Choralbearbeitungen und zeitgenössischen
              Auftragskompositionen.
            </p>
          </div>
        </div>
      </section>

      {/* Einleitung */}
      <section className="bg-background py-12 md:py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-lg bg-white p-6 shadow-lg md:p-8">
              <h2 className="text-dark mb-4 text-2xl font-bold md:text-3xl">
                Rheinische Bläserhefte
              </h2>
              <p className="mb-4 leading-relaxed text-gray-600">
                Die Rheinischen Bläserhefte erscheinen regelmäßig und bieten
                jeweils eine umfangreiche Sammlung von Musik aus einem
                bestimmten Land oder einer Region. Jedes Heft umfasst mehrere
                Kapitel mit verschiedenen musikalischen Schwerpunkten:
              </p>
              <ul className="mb-6 space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <svg
                    className="text-district-2 mt-0.5 h-5 w-5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                  Bearbeitungen von Werken großer Komponisten
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="text-district-2 mt-0.5 h-5 w-5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                  Neue Vorspiele und Begleitsätze zu Gesangbuchliedern
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="text-district-2 mt-0.5 h-5 w-5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                  Exklusive Auftragskompositionen renommierter Komponisten
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="text-district-2 mt-0.5 h-5 w-5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                  Populäre Melodien aus Film, Musical und Popmusik
                </li>
              </ul>
              <p className="leading-relaxed text-gray-600">
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
      <section className="bg-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-dark mb-8 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Unsere Bläserhefte
            </h2>

            <div className="space-y-12">
              {blaesherhefte.map((heft, index) => (
                <div
                  key={heft.id}
                  className={`overflow-hidden rounded-lg bg-white shadow-lg ${
                    index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  } flex flex-col md:flex`}
                >
                  {/* Bild */}
                  <div className="relative h-64 bg-gray-200 md:h-auto md:w-1/3">
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
                        <h3 className="text-dark mb-1 text-2xl font-bold md:text-3xl">
                          {heft.title}
                        </h3>
                        <p className="text-district-2 text-lg font-semibold">
                          {heft.subtitle}
                        </p>
                      </div>
                    </div>

                    <p className="mb-4 leading-relaxed text-gray-600">
                      {heft.description}
                    </p>

                    {/* Chapters */}
                    {heft.chapters && heft.chapters.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-dark mb-2 text-sm font-semibold">
                          Kapitel:
                        </h4>
                        <ul className="space-y-1">
                          {heft.chapters.map((chapter, idx) => (
                            <li
                              key={idx}
                              className="relative pl-4 text-sm text-gray-600 before:absolute before:left-0 before:content-['•']"
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
                        <h4 className="text-dark mb-2 text-sm font-semibold">
                          Besondere Highlights:
                        </h4>
                        <ul className="space-y-1">
                          {heft.highlights.map((highlight, idx) => (
                            <li
                              key={idx}
                              className="before:text-district-2 relative pl-4 text-sm text-gray-600 before:absolute before:left-0 before:content-['★']"
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
                        <h4 className="text-dark mb-2 text-sm font-semibold">
                          Hörprobe:
                        </h4>
                        <audio controls className="w-full max-w-md">
                          <source src={heft.audioSample} type="audio/mpeg" />
                          Ihr Browser unterstützt das Audio-Element nicht.
                        </audio>
                      </div>
                    )}

                    {/* Preise */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-dark mb-3 font-semibold">
                        Verfügbar:
                      </h4>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {heft.availableBlaeserheft && heft.priceBlaeserheft && (
                          <div className="bg-district-2/5 rounded-lg p-3 text-center">
                            <p className="mb-1 text-sm text-gray-600">
                              Bläserheft
                            </p>
                            <p className="text-dark text-lg font-bold">
                              {heft.priceBlaeserheft} €
                            </p>
                          </div>
                        )}
                        {heft.availableBeiheft && heft.priceBeiheft && (
                          <div className="bg-district-2/5 rounded-lg p-3 text-center">
                            <p className="mb-1 text-sm text-gray-600">
                              Beiheft
                            </p>
                            <p className="text-dark text-lg font-bold">
                              {heft.priceBeiheft} €
                            </p>
                          </div>
                        )}
                        {heft.availableTrompeten && heft.priceTrompeten && (
                          <div className="bg-district-2/5 rounded-lg p-3 text-center">
                            <p className="mb-1 text-sm text-gray-600">
                              Trompeten in B
                            </p>
                            <p className="text-dark text-lg font-bold">
                              {heft.priceTrompeten} €
                            </p>
                          </div>
                        )}
                        {heft.availableCd && heft.priceCd && (
                          <div className="bg-district-2/5 rounded-lg p-3 text-center">
                            <p className="mb-1 text-sm text-gray-600">CD</p>
                            <p className="text-dark text-lg font-bold">
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
      <section className="bg-background py-12 md:py-16 lg:py-20">
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
                  <svg
                    className="mr-2 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Geschäftsstelle kontaktieren
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
    </div>
  );
}
