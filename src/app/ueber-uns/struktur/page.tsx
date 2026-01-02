import Link from "next/link";
import PageHeader from "@/app/_components/general/page-header";
import HistoryTimeline from "@/app/_components/history-timeline";
import { api } from "@/trpc/server";
import { Building, ChevronRight } from "lucide-react";

export default async function StrukturGeschichtePage() {
  const historyTimeline = await api.organization.getHistory({});

  return (
    <div>
      <PageHeader title="Struktur & Geschichte" color="primary" />

      {/* Hero Section */}
      <section className="bg-primary dark:bg-primary-dark py-12 text-white md:py-16 lg:py-20">
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
            <span>Struktur & Geschichte</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
              Struktur & Geschichte
            </h1>
            <p className="text-lg leading-relaxed opacity-95 md:text-xl">
              Erfahren Sie mehr über die organisatorische Struktur des
              Posaunenwerks Rheinland und entdecken Sie die bewegte Geschichte
              unserer Blechbläserarbeit von den Anfängen bis heute.
            </p>
          </div>
        </div>
      </section>

      {/* Organisatorische Struktur */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-dark dark:text-dark-text mb-8 text-2xl font-bold md:text-3xl lg:text-4xl">
              Organisatorische Struktur
            </h2>

            <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                <p className="mb-6 leading-relaxed text-gray-600 dark:text-gray-400">
                  Das Evangelische Posaunenwerk in der Evangelischen Kirche im
                  Rheinland ist die Dachorganisation für mehr als 200
                  Posaunenchöre mit über 2.000 aktiven Bläserinnen und Bläsern.
                  Die Arbeit ist strukturiert in 13 Bezirken, die das gesamte
                  Gebiet der Evangelischen Kirche im Rheinland abdecken.
                </p>
                <p className="leading-relaxed text-gray-600">
                  Geleitet wird das Posaunenwerk vom Posaunenrat, der die
                  strategischen Entscheidungen trifft und den Vorstand wählt.
                  Die operative Arbeit wird von den Landesposaunenwarten
                  koordiniert, unterstützt durch die Bezirksobleute in den
                  einzelnen Regionen.
                </p>
              </div>

              <div className="bg-primary/5 dark:bg-primary/10 border-primary rounded-lg border-l-4 p-6">
                <h3 className="text-dark dark:text-dark-text mb-4 text-xl font-bold">
                  Kernzahlen im Überblick
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Posaunenchöre
                    </span>
                    <span className="text-primary text-2xl font-bold">
                      200+
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Aktive Bläser
                    </span>
                    <span className="text-primary text-2xl font-bold">
                      2.000+
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Bezirke
                    </span>
                    <span className="text-primary text-2xl font-bold">13</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Auswahlchöre
                    </span>
                    <span className="text-primary text-2xl font-bold">3</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hierarchie-Darstellung */}
            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg lg:p-8">
              <h3 className="text-dark dark:text-dark-text mb-8 text-center text-xl font-bold md:text-2xl">
                Organisatorischer Aufbau
              </h3>

              <div className="space-y-6">
                {/* Posaunenrat */}
                <div className="flex flex-col items-center">
                  <div className="bg-primary rounded-lg px-6 py-4 text-center text-white shadow-md">
                    <div className="mb-1 text-lg font-bold">Posaunenrat</div>
                    <div className="text-sm opacity-90">
                      Strategische Führung
                    </div>
                  </div>
                  <div className="dark:bg-dark-border h-8 w-0.5 bg-gray-300"></div>
                </div>

                {/* Vorstand */}
                <div className="flex flex-col items-center">
                  <div className="bg-primary-dark rounded-lg px-6 py-4 text-center text-white shadow-md">
                    <div className="mb-1 text-lg font-bold">Vorstand</div>
                    <div className="text-sm opacity-90">
                      Leitung & Koordination
                    </div>
                  </div>
                  <div className="dark:bg-dark-border h-8 w-0.5 bg-gray-300"></div>
                </div>

                {/* Landesposaunenwarte */}
                <div className="flex flex-col items-center">
                  <div className="bg-district-3 rounded-lg px-6 py-4 text-center text-white shadow-md">
                    <div className="mb-1 text-lg font-bold">
                      Landesposaunenwarte
                    </div>
                    <div className="text-sm opacity-90">
                      Operative Leitung & Ausbildung
                    </div>
                  </div>
                  <div className="dark:bg-dark-border h-8 w-0.5 bg-gray-300"></div>
                </div>

                {/* Bezirke */}
                <div className="flex flex-col items-center">
                  <div className="bg-district-2 rounded-lg px-6 py-4 text-center text-white shadow-md">
                    <div className="mb-1 text-lg font-bold">
                      13 Bezirke mit Bezirksobfrauen/-männern
                    </div>
                    <div className="text-sm opacity-90">
                      Regionale Koordination
                    </div>
                  </div>
                  <div className="dark:bg-dark-border h-8 w-0.5 bg-gray-300"></div>
                </div>

                {/* Posaunenchöre */}
                <div className="flex flex-col items-center">
                  <div className="rounded-lg bg-gray-600 px-6 py-4 text-center text-white shadow-md">
                    <div className="mb-1 text-lg font-bold">
                      200+ Posaunenchöre
                    </div>
                    <div className="text-sm opacity-90">
                      Musikalische Basis in den Gemeinden
                    </div>
                  </div>
                </div>
              </div>

              {/* Links zu Unterseiten */}
              <div className="dark:border-dark-border mt-8 grid grid-cols-1 gap-4 border-t border-gray-200 pt-8 md:grid-cols-3">
                <Link
                  href="/ueber-uns/posaunenrat"
                  className="bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 group rounded-lg p-4 text-center transition-colors"
                >
                  <div className="text-primary mb-1 font-semibold group-hover:underline">
                    Posaunenrat
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Aufgaben & Mitglieder
                  </div>
                </Link>

                <Link
                  href="/ueber-uns/vorstand"
                  className="bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 group rounded-lg p-4 text-center transition-colors"
                >
                  <div className="text-primary mb-1 font-semibold group-hover:underline">
                    Vorstand
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Personen & Kontakt
                  </div>
                </Link>

                <Link
                  href="/ueber-uns/bezirke"
                  className="bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 group rounded-lg p-4 text-center transition-colors"
                >
                  <div className="text-primary mb-1 font-semibold group-hover:underline">
                    Bezirke
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Obleute & Regionen
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Förderverein */}
      <section className="bg-foerderverein dark:bg-foerderverein-dark py-12 text-white md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 text-center">
              <div className="mb-4 inline-block rounded-full bg-white/10 p-3">
                <Building className="h-12 w-12" />
              </div>
              <h2 className="mb-4 text-2xl font-bold md:text-3xl lg:text-4xl">
                Förderverein – Gemeinsam stark
              </h2>
              <p className="mx-auto max-w-3xl text-lg leading-relaxed opacity-95 md:text-xl">
                Seit 2008 unterstützt unser Förderverein die Arbeit des
                Posaunenwerks: von Auswahlchören über Lehrgänge bis zu
                CD-Produktionen. Werden Sie Teil unserer Gemeinschaft!
              </p>
            </div>

            <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-white/10 p-6 text-center backdrop-blur-sm">
                <div className="mb-2 text-4xl font-bold">36 €</div>
                <p className="text-sm opacity-90">Jahresbeitrag</p>
              </div>
              <div className="rounded-lg bg-white/10 p-6 text-center backdrop-blur-sm">
                <div className="mb-2 text-4xl font-bold">2008</div>
                <p className="text-sm opacity-90">Gründungsjahr</p>
              </div>
              <div className="rounded-lg bg-white/10 p-6 text-center backdrop-blur-sm">
                <div className="mb-2 text-4xl font-bold">1.000 €</div>
                <p className="text-sm opacity-90">
                  p.a. für Lehrgangs&shy;förderung
                </p>
              </div>
              <div className="rounded-lg bg-white/10 p-6 text-center backdrop-blur-sm">
                <div className="mb-2 text-4xl font-bold">100%</div>
                <p className="text-sm opacity-90">Ehrenamtlich</p>
              </div>
            </div>

            <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <svg
                    className="h-5 w-5"
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
                <h3 className="mb-2 font-bold">Auswahlchöre</h3>
                <p className="text-sm opacity-90">
                  Förderung talentierter Bläser in unseren Ensembles
                </p>
              </div>

              <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <svg
                    className="h-5 w-5"
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
                <h3 className="mb-2 font-bold">Ausbildung</h3>
                <p className="text-sm opacity-90">
                  Unterstützung von Lehrgängen und Weiterbildungen
                </p>
              </div>

              <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <svg
                    className="h-5 w-5"
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
                <h3 className="mb-2 font-bold">Projekte</h3>
                <p className="text-sm opacity-90">
                  CD-Produktionen und besondere Initiativen
                </p>
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/foerderverein"
                className="text-foerderverein mr-4 inline-flex items-center rounded-lg bg-white px-8 py-4 font-bold shadow-lg transition-colors hover:bg-gray-100"
              >
                Mehr erfahren
                <svg
                  className="ml-2 h-5 w-5"
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
                className="inline-flex items-center rounded-lg border-2 border-white bg-transparent px-8 py-4 font-semibold text-white transition-colors hover:bg-white/10"
              >
                Mitglied werden
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Geschichte */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold md:text-3xl lg:text-4xl">
              Unsere Geschichte
            </h2>
            <p className="mb-12 text-lg text-gray-600 dark:text-gray-400">
              Über 140 Jahre Posaunenchorarbeit im Rheinland – eine Geschichte
              von Tradition, Innovation und gelebter Gemeinschaft. Erleben Sie
              die wichtigsten Meilensteine unserer Entwicklung.
            </p>

            <HistoryTimeline events={historyTimeline} />
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="bg-primary dark:bg-primary-dark py-12 text-white md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Vision & Mission
            </h2>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                  <svg
                    className="h-6 w-6 text-white"
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
                <h3 className="mb-3 text-xl font-bold">Unsere Vision</h3>
                <p className="leading-relaxed opacity-90">
                  Wir möchten durch Musik Menschen bewegen, Gemeinschaft stiften
                  und den christlichen Glauben verkündigen. Unsere Vision ist
                  eine lebendige Posaunenchorarbeit in jeder Gemeinde des
                  Rheinlands.
                </p>
              </div>

              <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                  <svg
                    className="h-6 w-6 text-white"
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
                <h3 className="mb-3 text-xl font-bold">Unsere Mission</h3>
                <p className="leading-relaxed opacity-90">
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
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold md:text-3xl">
              Teil unserer Geschichte werden?
            </h2>
            <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">
              Finden Sie einen Posaunenchor in Ihrer Nähe und werden Sie Teil
              dieser lebendigen Tradition.
            </p>
            <Link
              href="/mitmachen/chor-finden"
              className="bg-primary hover:bg-primary-dark inline-flex items-center rounded-lg px-8 py-4 text-lg font-semibold text-white transition-colors"
            >
              Chor finden
              <svg
                className="ml-2 h-6 w-6"
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
