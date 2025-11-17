import PageHeader from "@/components/PageHeader";
import HistoryTimeline from "@/components/HistoryTimeline";
import { historyTimeline, bezirke } from "@/lib/generalData";
import Link from "next/link";
import Image from "next/image";

export default function StrukturGeschichtePage() {
  return (
    <div>
      <PageHeader title="Struktur & Geschichte" color="primary" />

      {/* Hero Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-primary text-white">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Struktur & Geschichte
            </h1>
            <p className="text-lg md:text-xl leading-relaxed opacity-95">
              Erfahren Sie mehr über die organisatorische Struktur des
              Posaunenwerks Rheinland und entdecken Sie die bewegte Geschichte
              unserer Blechbläserarbeit von den Anfängen bis heute.
            </p>
          </div>
        </div>
      </section>

      {/* Organisatorische Struktur */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-8">
              Organisatorische Struktur
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-gray-600 leading-relaxed mb-6">
                  Das Evangelische Posaunenwerk in der Evangelischen Kirche im
                  Rheinland ist die Dachorganisation für mehr als 200
                  Posaunenchöre mit über 2.000 aktiven Bläserinnen und Bläsern.
                  Die Arbeit ist strukturiert in 13 Bezirken, die das gesamte
                  Gebiet der Evangelischen Kirche im Rheinland abdecken.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Geleitet wird das Posaunenwerk vom Posaunenrat, der die
                  strategischen Entscheidungen trifft und den Vorstand wählt.
                  Die operative Arbeit wird von den Landesposaunenwarten
                  koordiniert, unterstützt durch die Bezirksobleute in den
                  einzelnen Regionen.
                </p>
              </div>

              <div className="bg-primary/5 rounded-lg p-6 border-l-4 border-primary">
                <h3 className="text-xl font-bold text-dark mb-4">
                  Kernzahlen im Überblick
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Posaunenchöre</span>
                    <span className="text-2xl font-bold text-primary">
                      200+
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Aktive Bläser</span>
                    <span className="text-2xl font-bold text-primary">
                      2.000+
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Bezirke</span>
                    <span className="text-2xl font-bold text-primary">13</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Auswahlchöre</span>
                    <span className="text-2xl font-bold text-primary">3</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hierarchie-Darstellung */}
            <div className="bg-white rounded-lg shadow-lg p-6 lg:p-8">
              <h3 className="text-xl md:text-2xl font-bold text-dark mb-8 text-center">
                Organisatorischer Aufbau
              </h3>

              <div className="space-y-6">
                {/* Posaunenrat */}
                <div className="flex flex-col items-center">
                  <div className="bg-primary text-white px-6 py-4 rounded-lg shadow-md text-center">
                    <div className="font-bold text-lg mb-1">Posaunenrat</div>
                    <div className="text-sm opacity-90">
                      Strategische Führung
                    </div>
                  </div>
                  <div className="w-0.5 h-8 bg-gray-300"></div>
                </div>

                {/* Vorstand */}
                <div className="flex flex-col items-center">
                  <div className="bg-primary-dark text-white px-6 py-4 rounded-lg shadow-md text-center">
                    <div className="font-bold text-lg mb-1">Vorstand</div>
                    <div className="text-sm opacity-90">
                      Leitung & Koordination
                    </div>
                  </div>
                  <div className="w-0.5 h-8 bg-gray-300"></div>
                </div>

                {/* Landesposaunenwarte */}
                <div className="flex flex-col items-center">
                  <div className="bg-district-3 text-white px-6 py-4 rounded-lg shadow-md text-center">
                    <div className="font-bold text-lg mb-1">
                      Landesposaunenwarte
                    </div>
                    <div className="text-sm opacity-90">
                      Operative Leitung & Ausbildung
                    </div>
                  </div>
                  <div className="w-0.5 h-8 bg-gray-300"></div>
                </div>

                {/* Bezirke */}
                <div className="flex flex-col items-center">
                  <div className="bg-district-2 text-white px-6 py-4 rounded-lg shadow-md text-center">
                    <div className="font-bold text-lg mb-1">
                      13 Bezirke mit Bezirksobfrauen/-männern
                    </div>
                    <div className="text-sm opacity-90">
                      Regionale Koordination
                    </div>
                  </div>
                  <div className="w-0.5 h-8 bg-gray-300"></div>
                </div>

                {/* Posaunenchöre */}
                <div className="flex flex-col items-center">
                  <div className="bg-gray-600 text-white px-6 py-4 rounded-lg shadow-md text-center">
                    <div className="font-bold text-lg mb-1">
                      200+ Posaunenchöre
                    </div>
                    <div className="text-sm opacity-90">
                      Musikalische Basis in den Gemeinden
                    </div>
                  </div>
                </div>
              </div>

              {/* Links zu Unterseiten */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-8 border-t border-gray-200">
                <Link
                  href="/ueber-uns/posaunenrat"
                  className="text-center p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors group"
                >
                  <div className="text-primary font-semibold mb-1 group-hover:underline">
                    Posaunenrat
                  </div>
                  <div className="text-sm text-gray-600">
                    Aufgaben & Mitglieder
                  </div>
                </Link>

                <Link
                  href="/ueber-uns/vorstand"
                  className="text-center p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors group"
                >
                  <div className="text-primary font-semibold mb-1 group-hover:underline">
                    Vorstand
                  </div>
                  <div className="text-sm text-gray-600">
                    Personen & Kontakt
                  </div>
                </Link>

                <Link
                  href="/ueber-uns/bezirke"
                  className="text-center p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors group"
                >
                  <div className="text-primary font-semibold mb-1 group-hover:underline">
                    Bezirke
                  </div>
                  <div className="text-sm text-gray-600">
                    Obleute & Regionen
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Förderverein */}
      <section className="py-12 md:py-16 lg:py-20 bg-foerderverein text-white">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-block p-3 bg-white/10 rounded-full mb-4">
                <svg
                  className="w-12 h-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                Förderverein – Gemeinsam stark
              </h2>
              <p className="text-lg md:text-xl leading-relaxed opacity-95 max-w-3xl mx-auto">
                Seit 2008 unterstützt unser Förderverein die Arbeit des
                Posaunenwerks: von Auswahlchören über Lehrgänge bis zu
                CD-Produktionen. Werden Sie Teil unserer Gemeinschaft!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
                <div className="text-4xl font-bold mb-2">36 €</div>
                <p className="text-sm opacity-90">Jahresbeitrag</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
                <div className="text-4xl font-bold mb-2">2008</div>
                <p className="text-sm opacity-90">Gründungsjahr</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
                <div className="text-4xl font-bold mb-2">1.000 €</div>
                <p className="text-sm opacity-90">
                  p.a. für Lehrgangs&shy;förderung
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
                <div className="text-4xl font-bold mb-2">100%</div>
                <p className="text-sm opacity-90">Ehrenamtlich</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-3">
                  <svg
                    className="w-5 h-5"
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
                </div>
                <h3 className="font-bold mb-2">Auswahlchöre</h3>
                <p className="text-sm opacity-90">
                  Förderung talentierter Bläser in unseren Ensembles
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-3">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <h3 className="font-bold mb-2">Ausbildung</h3>
                <p className="text-sm opacity-90">
                  Unterstützung von Lehrgängen und Weiterbildungen
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-3">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </div>
                <h3 className="font-bold mb-2">Projekte</h3>
                <p className="text-sm opacity-90">
                  CD-Produktionen und besondere Initiativen
                </p>
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/foerderverein"
                className="inline-flex items-center px-8 py-4 bg-white text-foerderverein font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-lg mr-4"
              >
                Mehr erfahren
                <svg
                  className="w-5 h-5 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
              <a
                href="mailto:foerderverein@posaunenwerk-rheinland.de?subject=Mitgliedschaft im Förderverein"
                className="inline-flex items-center px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
              >
                Mitglied werden
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Geschichte */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-4">
              Unsere Geschichte
            </h2>
            <p className="text-lg text-gray-600 mb-12">
              Über 140 Jahre Posaunenchorarbeit im Rheinland – eine Geschichte
              von Tradition, Innovation und gelebter Gemeinschaft. Erleben Sie
              die wichtigsten Meilensteine unserer Entwicklung.
            </p>

            <HistoryTimeline events={historyTimeline} />
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-12 md:py-16 lg:py-20 bg-primary text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-8 text-center">
              Vision & Mission
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Unsere Vision</h3>
                <p className="opacity-90 leading-relaxed">
                  Wir möchten durch Musik Menschen bewegen, Gemeinschaft stiften
                  und den christlichen Glauben verkündigen. Unsere Vision ist
                  eine lebendige Posaunenchorarbeit in jeder Gemeinde des
                  Rheinlands.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Unsere Mission</h3>
                <p className="opacity-90 leading-relaxed">
                  Wir fördern musikalische Exzellenz, bieten qualifizierte
                  Ausbildung und schaffen Räume für Begegnung. Dabei verbinden
                  wir Tradition mit Innovation und leben eine offene,
                  wertschätzende Gemeinschaft.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-16 bg-background-secondary">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-dark mb-4">
              Teil unserer Geschichte werden?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Finden Sie einen Posaunenchor in Ihrer Nähe und werden Sie Teil
              dieser lebendigen Tradition.
            </p>
            <Link
              href="/mitmachen/chor-finden"
              className="inline-flex items-center px-8 py-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors text-lg"
            >
              Chor finden
              <svg
                className="w-6 h-6 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
