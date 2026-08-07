import Link from "next/link";
import PublicPage from "@/app/_components/general/public-page";
import HistoryTimeline from "@/app/_components/history-timeline";
import { api } from "@/trpc/server";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  BookOpenIcon,
  Building,
  EyeIcon,
  Music2Icon,
  MusicIcon,
} from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Struktur & Geschichte",
  description:
    "Aufbau, Bezirke und Geschichte des Evangelischen Posaunenwerks in der Evangelischen Kirche im Rheinland.",
  path: "/ueber-uns/struktur",
});

export default async function StrukturGeschichtePage() {
  const historyTimeline = await api.organization.getHistory({});

  return (
    <PublicPage
      title="Struktur & Geschichte"
      color="primary"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Über Uns", href: "/ueber-uns" },
        { label: "Struktur & Geschichte" },
      ]}
      description={
        <p>
          Erfahren Sie mehr über die organisatorische Struktur des Posaunenwerks
          Rheinland und entdecken Sie die bewegte Geschichte unserer
          Blechbläserarbeit von den Anfängen bis heute.
        </p>
      }
    >
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
                  <MusicIcon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-bold">Auswahlchöre</h3>
                <p className="text-sm opacity-90">
                  Förderung talentierter Bläser in unseren Ensembles
                </p>
              </div>

              <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <BookOpenIcon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-bold">Ausbildung</h3>
                <p className="text-sm opacity-90">
                  Unterstützung von Lehrgängen und Weiterbildungen
                </p>
              </div>

              <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Music2Icon className="h-5 w-5" />
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
                <ArrowRightIcon className="ml-2 h-5 w-5" />
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
      <section
        id="geschichte"
        className="bg-background dark:bg-dark-background scroll-mt-24 py-12 md:py-16 lg:py-20"
      >
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
                  <EyeIcon className="h-6 w-6 text-white" />
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
                  <BadgeCheckIcon className="h-6 w-6 text-white" />
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
              <ArrowRightIcon className="ml-2 h-6 w-6" />
            </Link>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
