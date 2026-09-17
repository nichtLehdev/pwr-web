import PublicPage from "../_components/general/public-page";
import { PageSection, Split } from "../_components/programmheft/page-section";
import { Heading, ArrowLink } from "../_components/programmheft/section-head";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Impressum",
  description:
    "Impressum und rechtliche Informationen des Posaunenwerks Rheinland",
  path: "/impressum",
});

/** Fließtext der Seite: Tinte, ruhige Zeilenlänge (Legal Page Rule: 65ch). */
const PROSE =
  "text-ink dark:text-night-text max-w-[65ch] space-y-4 text-lg leading-relaxed";

export default function ImpressumPage() {
  return (
    <PublicPage
      title="Impressum"
      breadcrumbs={[{ label: "Start", href: "/" }, { label: "Impressum" }]}
      description={
        <p>Angaben gemäß § 5 DDG und weitere rechtliche Informationen</p>
      }
    >
      <PageSection labelledBy="angaben-heading">
        <Split
          head={<Heading id="angaben-heading">Angaben gemäß § 5 DDG</Heading>}
          bodyClassName="mt-8 space-y-12"
        >
          <div>
            <Heading as="h3" size="list" rule>
              Diensteanbieter
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                <strong className="font-semibold">
                  Posaunenwerk der Evangelischen Kirche im Rheinland e.V.
                </strong>
                <br />
                Rudolf-Harbig-Str. 20
                <br />
                56179 Vallendar
                <br />
                Deutschland
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              Kontaktmöglichkeiten
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                <strong className="font-semibold">Telefon:</strong>{" "}
                <a href="tel:02613000011" className="link-ink">
                  0261 300 00 11
                </a>
              </p>
              <p>
                <strong className="font-semibold">E-Mail:</strong>{" "}
                <a
                  href="mailto:info@posaunenwerk-rheinland.de"
                  className="link-ink"
                >
                  info@posaunenwerk-rheinland.de
                </a>
              </p>
              <p>
                <strong className="font-semibold">Website:</strong>{" "}
                <a
                  href="https://www.posaunenwerk-rheinland.de"
                  className="link-ink"
                >
                  www.posaunenwerk-rheinland.de
                </a>
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              Vertretungsberechtigte Personen
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>Vertreten durch den Vorstand des Posaunenwerks Rheinland</p>
            </div>
            <ArrowLink href="/ueber-uns/vorstand" className="mt-4">
              Zur Vorstandsübersicht
            </ArrowLink>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              Zugehörigkeit
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Das Rheinische Posaunenwerk ist ein Verband innerhalb der{" "}
                <a
                  href="https://www.ekir.de"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-ink"
                >
                  Evangelischen Kirche im Rheinland
                  <span className="sr-only">
                    {" "}
                    (öffnet eine externe Website)
                  </span>
                </a>
              </p>
            </div>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="verantwortlich-heading" rule>
        <Split
          head={
            <Heading id="verantwortlich-heading" className="text-balance">
              Verantwortlich für den Inhalt
            </Heading>
          }
          bodyClassName="mt-8 space-y-12"
        >
          <div>
            <Heading as="h3" size="list" rule>
              Redaktionell Verantwortlicher
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:
                <br />
                Landesobmann Friedemann Schmidt-Eggert
                <br />
                Rudolf-Harbig-Str. 20
                <br />
                56179 Vallendar
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              Technische Betreuung
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Bei technischen Fragen zur Website wenden Sie sich bitte an
                unser Internet-Team:
              </p>
              <p>
                <a
                  href="mailto:webmaster@posaunenwerk-rheinland.de"
                  className="link-ink"
                >
                  webmaster@posaunenwerk-rheinland.de
                </a>
              </p>
            </div>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="haftung-heading" rule>
        <Split
          head={<Heading id="haftung-heading">Haftungsausschluss</Heading>}
          bodyClassName="mt-8 space-y-12"
        >
          <div>
            <Heading as="h3" size="list" rule>
              Haftung für Inhalte
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt.
                Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte
                können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter
                sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen
                Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8
                bis 10 DDG sind wir als Diensteanbieter jedoch nicht
                verpflichtet, übermittelte oder gespeicherte fremde
                Informationen zu überwachen oder nach Umständen zu forschen, die
                auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur
                Entfernung oder Sperrung der Nutzung von Informationen nach den
                allgemeinen Gesetzen bleiben hiervon unberührt. Eine
                diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der
                Kenntnis einer konkreten Rechtsverletzung möglich. Bei
                Bekanntwerden von entsprechenden Rechtsverletzungen werden wir
                diese Inhalte umgehend entfernen.
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              Haftung für Links
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Unser Angebot enthält Links zu externen Webseiten Dritter, auf
                deren Inhalte wir keinen Einfluss haben. Deshalb können wir für
                diese fremden Inhalte auch keine Gewähr übernehmen. Für die
                Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
                oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten
                wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße
                überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der
                Verlinkung nicht erkennbar. Eine permanente inhaltliche
                Kontrolle der verlinkten Seiten ist jedoch ohne konkrete
                Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
                Bekanntwerden von Rechtsverletzungen werden wir derartige Links
                umgehend entfernen.
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              Urheberrecht
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf
                diesen Seiten unterliegen dem deutschen Urheberrecht. Die
                Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
                Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der
                schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
                Downloads und Kopien dieser Seite sind nur für den privaten,
                nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf
                dieser Seite nicht vom Betreiber erstellt wurden, werden die
                Urheberrechte Dritter beachtet. Insbesondere werden Inhalte
                Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine
                Urheberrechtsverletzung aufmerksam werden, bitten wir um einen
                entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen
                werden wir derartige Inhalte umgehend entfernen.
              </p>
            </div>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="lizenzen-heading" rule>
        <Split
          head={
            <Heading id="lizenzen-heading" className="text-balance">
              Open Source Lizenzen
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <div className={PROSE}>
            <p>
              Diese Website nutzt verschiedene Open-Source-Softwarepakete. Wir
              möchten den Entwicklern dieser Projekte für ihre großartige Arbeit
              danken. Die Übersicht der eingesetzten Pakete und die Lizenztexte
              im Wortlaut findest du hier:
            </p>
          </div>
          <ArrowLink href="/lizenzen" className="mt-4">
            Zu den Open-Source-Lizenzen
          </ArrowLink>
        </Split>
      </PageSection>

      <PageSection labelledBy="weitere-heading" rule>
        <Split
          head={
            <Heading id="weitere-heading" className="text-balance">
              Weitere Informationen
            </Heading>
          }
          bodyClassName="mt-8 space-y-12"
        >
          <div>
            <Heading as="h3" size="list" rule>
              Datenschutz
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Informationen zum Datenschutz und zur Verarbeitung
                personenbezogener Daten finden Sie in unserer
                Datenschutzerklärung.
              </p>
            </div>
            <ArrowLink href="/datenschutz" className="mt-4">
              Zur Datenschutzerklärung
            </ArrowLink>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              Kontakt
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Bei Fragen oder Anregungen zu dieser Website oder unserem
                Angebot stehen wir Ihnen gerne zur Verfügung.
              </p>
            </div>
            <ArrowLink href="/kontakt" className="mt-4">
              Zur Kontaktseite
            </ArrowLink>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              Bildnachweise
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Die auf dieser Website verwendeten Bilder sind, sofern nicht
                anders angegeben, Eigentum des Posaunenwerks Rheinland oder
                wurden mit entsprechender Erlaubnis zur Nutzung bereitgestellt.
                Bildnachweise werden, wo erforderlich, direkt bei den jeweiligen
                Bildern angegeben.
              </p>
            </div>
          </div>
        </Split>
      </PageSection>

      <PageSection spacing="close" rule>
        <p className="text-dark dark:text-night-muted text-sm">
          Stand dieser Impressumsangaben: August 2026
        </p>
      </PageSection>
    </PublicPage>
  );
}
