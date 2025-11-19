import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import Image from "next/image";
import { blaesherhefte } from "@/lib/generalData";

export default function LiteraturPage() {
  return (
    <div>
      <PageHeader title="Literatur & CDs" color="district-2" />

      {/* Hero Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-district-2 text-white">
        <div className="container">
          <nav className="text-sm mb-4 flex items-center gap-2 opacity-90">
            <Link href="/" className="hover:text-white transition-colors">
              Start
            </Link>
            <span>/</span>
            <Link
              href="/materialien"
              className="hover:text-white transition-colors"
            >
              Materialien
            </Link>
            <span>/</span>
            <span>Literatur & CDs</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Bläserliteratur und CDs
            </h1>
            <p className="text-lg md:text-xl leading-relaxed opacity-95">
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
      <section className="py-12 md:py-16 bg-background">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-dark mb-4">
                Rheinische Bläserhefte
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Die Rheinischen Bläserhefte erscheinen regelmäßig und bieten
                jeweils eine umfangreiche Sammlung von Musik aus einem
                bestimmten Land oder einer Region. Jedes Heft umfasst mehrere
                Kapitel mit verschiedenen musikalischen Schwerpunkten:
              </p>
              <ul className="space-y-2 text-gray-600 mb-6">
                <li className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-district-2 shrink-0 mt-0.5"
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
                    className="w-5 h-5 text-district-2 shrink-0 mt-0.5"
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
                    className="w-5 h-5 text-district-2 shrink-0 mt-0.5"
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
                    className="w-5 h-5 text-district-2 shrink-0 mt-0.5"
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
              <p className="text-gray-600 leading-relaxed">
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
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-8 text-center">
              Unsere Bläserhefte
            </h2>

            <div className="space-y-12">
              {blaesherhefte.map((heft, index) => (
                <div
                  key={heft.id}
                  className={`bg-white rounded-lg shadow-lg overflow-hidden ${
                    index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  } flex flex-col md:flex`}
                >
                  {/* Bild */}
                  <div className="md:w-1/3 relative h-64 md:h-auto bg-gray-200">
                    <Image
                      src={heft.image}
                      alt={heft.title}
                      fill
                      className="object-cover"
                    />
                    {!heft.available.blaeserheft && (
                      <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        Vergriffen
                      </div>
                    )}
                    {heft.year >= 2024 && (
                      <div className="absolute top-4 left-4 bg-district-2 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        Neu
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="md:w-2/3 p-6 md:p-8">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl md:text-3xl font-bold text-dark mb-1">
                          {heft.title}
                        </h3>
                        <p className="text-lg text-district-2 font-semibold">
                          {heft.subtitle}
                        </p>
                      </div>
                    </div>

                    <p className="text-gray-600 leading-relaxed mb-4">
                      {heft.description}
                    </p>

                    {/* Chapters */}
                    {heft.chapters && heft.chapters.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-dark mb-2 text-sm">
                          Kapitel:
                        </h4>
                        <ul className="space-y-1">
                          {heft.chapters.map((chapter, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-gray-600 pl-4 relative before:content-['•'] before:absolute before:left-0"
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
                        <h4 className="font-semibold text-dark mb-2 text-sm">
                          Besondere Highlights:
                        </h4>
                        <ul className="space-y-1">
                          {heft.highlights.map((highlight, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-gray-600 pl-4 relative before:content-['★'] before:absolute before:left-0 before:text-district-2"
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
                        <h4 className="font-semibold text-dark mb-2 text-sm">
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
                      <h4 className="font-semibold text-dark mb-3">
                        Verfügbar:
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {heft.available.blaeserheft &&
                          heft.prices.blaeserheft && (
                            <div className="text-center p-3 bg-district-2/5 rounded-lg">
                              <p className="text-sm text-gray-600 mb-1">
                                Bläserheft
                              </p>
                              <p className="text-lg font-bold text-dark">
                                {heft.prices.blaeserheft} €
                              </p>
                            </div>
                          )}
                        {heft.available.beiheft && heft.prices.beiheft && (
                          <div className="text-center p-3 bg-district-2/5 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">
                              Beiheft
                            </p>
                            <p className="text-lg font-bold text-dark">
                              {heft.prices.beiheft} €
                            </p>
                          </div>
                        )}
                        {heft.available.trompeten && heft.prices.trompeten && (
                          <div className="text-center p-3 bg-district-2/5 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">
                              Trompeten in B
                            </p>
                            <p className="text-lg font-bold text-dark">
                              {heft.prices.trompeten} €
                            </p>
                          </div>
                        )}
                        {heft.available.cd && heft.prices.cd && (
                          <div className="text-center p-3 bg-district-2/5 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">CD</p>
                            <p className="text-lg font-bold text-dark">
                              {heft.prices.cd} €
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
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="bg-district-2 text-white rounded-lg p-6 md:p-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Bestellung
              </h2>
              <p className="text-lg leading-relaxed opacity-95 mb-6">
                Die Bläserhefte sowie dazu erschienene CDs mit jeweils einer
                Auswahl von Stücken aus dem Heft sowie Begleitmaterial für
                Konzerte und Gottesdienste können über die Geschäftsstelle oder
                den einschlägigen Musikalienhandel bezogen werden.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/kontakt"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-district-2 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg
                    className="w-5 h-5 mr-2"
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
                  className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
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
