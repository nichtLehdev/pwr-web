import Link from "next/link";
import PublicPage from "../_components/general/public-page";
import { ArrowRightIcon } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Impressum",
  description:
    "Impressum und rechtliche Informationen des Posaunenwerks Rheinland",
  path: "/impressum",
});

export default function ImpressumPage() {
  return (
    <PublicPage
      title="Impressum"
      color="primary"
      breadcrumbs={[{ label: "Start", href: "/" }, { label: "Impressum" }]}
      description={
        <p>Angaben gemäß § 5 DDG und weitere rechtliche Informationen</p>
      }
    >
      {/* Angaben gemäß § 5 DDG */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                Angaben gemäß § 5 DDG
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    Diensteanbieter
                  </h3>
                  <div className="text-gray-700 dark:text-gray-300">
                    <p className="font-semibold">
                      Evangelisches Posaunenwerk in der Evangelischen Kirche im
                      Rheinland
                    </p>
                    <p className="mt-2">
                      Rudolf-Harbig-Str. 20
                      <br />
                      56179 Vallendar
                      <br />
                      Deutschland
                    </p>
                  </div>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    Kontaktmöglichkeiten
                  </h3>
                  <div className="space-y-2 text-gray-700 dark:text-gray-300">
                    <p>
                      <span className="font-semibold">Telefon:</span>{" "}
                      <a
                        href="tel:02613000011"
                        className="text-primary hover:underline"
                      >
                        0261 300 00 11
                      </a>
                    </p>
                    <p>
                      <span className="font-semibold">E-Mail:</span>{" "}
                      <a
                        href="mailto:info@posaunenwerk-rheinland.de"
                        className="text-primary hover:underline"
                      >
                        info@posaunenwerk-rheinland.de
                      </a>
                    </p>
                    <p>
                      <span className="font-semibold">Website:</span>{" "}
                      <a
                        href="https://www.posaunenwerk-rheinland.de"
                        className="text-primary hover:underline"
                      >
                        www.posaunenwerk-rheinland.de
                      </a>
                    </p>
                  </div>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    Vertretungsberechtigte Personen
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Vertreten durch den Vorstand des Posaunenwerks Rheinland
                  </p>
                  <Link
                    href="/ueber-uns/vorstand"
                    className="text-primary mt-2 inline-block text-sm hover:underline"
                  >
                    Zur Vorstandsübersicht →
                  </Link>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    Zugehörigkeit
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Das Evangelische Posaunenwerk ist ein Werk der{" "}
                    <a
                      href="https://www.ekir.de"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Evangelischen Kirche im Rheinland
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Verantwortlich für den Inhalt */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                Verantwortlich für den Inhalt
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    Redaktionell Verantwortlicher
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:
                    <br />
                    Landesposaunenwart des Posaunenwerks Rheinland
                    <br />
                    Rudolf-Harbig-Str. 20
                    <br />
                    56179 Vallendar
                  </p>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    Technische Betreuung
                  </h3>
                  <p className="mb-2 text-gray-700 dark:text-gray-300">
                    Bei technischen Fragen zur Website wenden Sie sich bitte an
                    unser Internet-Team:
                  </p>
                  <a
                    href="mailto:webmaster@posaunenwerk-rheinland.de"
                    className="text-primary hover:underline"
                  >
                    webmaster@posaunenwerk-rheinland.de
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Haftungsausschluss */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                Haftungsausschluss
              </h2>

              <div className="space-y-6 text-gray-700 dark:text-gray-300">
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-semibold">
                    Haftung für Inhalte
                  </h3>
                  <p className="leading-relaxed">
                    Die Inhalte unserer Seiten wurden mit größter Sorgfalt
                    erstellt. Für die Richtigkeit, Vollständigkeit und
                    Aktualität der Inhalte können wir jedoch keine Gewähr
                    übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs. 1
                    DDG für eigene Inhalte auf diesen Seiten nach den
                    allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG
                    sind wir als Diensteanbieter jedoch nicht verpflichtet,
                    übermittelte oder gespeicherte fremde Informationen zu
                    überwachen oder nach Umständen zu forschen, die auf eine
                    rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur
                    Entfernung oder Sperrung der Nutzung von Informationen nach
                    den allgemeinen Gesetzen bleiben hiervon unberührt. Eine
                    diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der
                    Kenntnis einer konkreten Rechtsverletzung möglich. Bei
                    Bekanntwerden von entsprechenden Rechtsverletzungen werden
                    wir diese Inhalte umgehend entfernen.
                  </p>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-semibold">
                    Haftung für Links
                  </h3>
                  <p className="leading-relaxed">
                    Unser Angebot enthält Links zu externen Webseiten Dritter,
                    auf deren Inhalte wir keinen Einfluss haben. Deshalb können
                    wir für diese fremden Inhalte auch keine Gewähr übernehmen.
                    Für die Inhalte der verlinkten Seiten ist stets der
                    jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
                    Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung
                    auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte
                    waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine
                    permanente inhaltliche Kontrolle der verlinkten Seiten ist
                    jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung
                    nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen
                    werden wir derartige Links umgehend entfernen.
                  </p>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-semibold">
                    Urheberrecht
                  </h3>
                  <p className="leading-relaxed">
                    Die durch die Seitenbetreiber erstellten Inhalte und Werke
                    auf diesen Seiten unterliegen dem deutschen Urheberrecht.
                    Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
                    der Verwertung außerhalb der Grenzen des Urheberrechtes
                    bedürfen der schriftlichen Zustimmung des jeweiligen Autors
                    bzw. Erstellers. Downloads und Kopien dieser Seite sind nur
                    für den privaten, nicht kommerziellen Gebrauch gestattet.
                    Soweit die Inhalte auf dieser Seite nicht vom Betreiber
                    erstellt wurden, werden die Urheberrechte Dritter beachtet.
                    Insbesondere werden Inhalte Dritter als solche
                    gekennzeichnet. Sollten Sie trotzdem auf eine
                    Urheberrechtsverletzung aufmerksam werden, bitten wir um
                    einen entsprechenden Hinweis. Bei Bekanntwerden von
                    Rechtsverletzungen werden wir derartige Inhalte umgehend
                    entfernen.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source Lizenzen */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                Open Source Lizenzen
              </h2>

              <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300">
                  Diese Website nutzt verschiedene Open-Source-Softwarepakete.
                  Wir möchten den Entwicklern dieser Projekte für ihre
                  großartige Arbeit danken. Die Übersicht der eingesetzten
                  Pakete und die Lizenztexte im Wortlaut findest du hier:
                </p>
                <Link
                  href="/lizenzen"
                  className="text-primary inline-flex items-center gap-1 hover:underline"
                >
                  Zu den Open-Source-Lizenzen
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Datenschutz & Weitere Informationen */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                Weitere Informationen
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-semibold">
                    Datenschutz
                  </h3>
                  <p className="mb-3 text-gray-700 dark:text-gray-300">
                    Informationen zum Datenschutz und zur Verarbeitung
                    personenbezogener Daten finden Sie in unserer
                    Datenschutzerklärung.
                  </p>
                  <Link
                    href="/datenschutz"
                    className="text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    Zur Datenschutzerklärung
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-semibold">
                    Kontakt
                  </h3>
                  <p className="mb-3 text-gray-700 dark:text-gray-300">
                    Bei Fragen oder Anregungen zu dieser Website oder unserem
                    Angebot stehen wir Ihnen gerne zur Verfügung.
                  </p>
                  <Link
                    href="/kontakt"
                    className="text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    Zur Kontaktseite
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-semibold">
                    Bildnachweise
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Die auf dieser Website verwendeten Bilder sind, sofern nicht
                    anders angegeben, Eigentum des Posaunenwerks Rheinland oder
                    wurden mit entsprechender Erlaubnis zur Nutzung
                    bereitgestellt. Bildnachweise werden, wo erforderlich,
                    direkt bei den jeweiligen Bildern angegeben.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stand der Information */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-8">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Stand dieser Impressumsangaben: August 2026
            </p>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
