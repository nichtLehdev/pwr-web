import Link from "next/link";
import PublicPage from "@/app/_components/general/public-page";
import {
  DownloadIcon,
  MailIcon,
  PhoneIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Prävention sexualisierter Gewalt",
  description:
    "Präventionsmaßnahmen des Posaunenwerks der Ev. Kirche im Rheinland zum Schutz von Kindern und Jugendlichen: Selbstverpflichtung, Grundsätze für Veranstaltungen und Vertrauenspersonen.",
  path: "/praevention",
});

/**
 * Übernahme der Seite, die auf der alten Website unter dem irreführenden
 * Pfad /posaunenchor-finden-2/ lag (offenbar eine Kopie, deren Slug nie
 * angepasst wurde). Ein Redirect in next.config.js hält alte Links am Leben.
 *
 * Der Text ist bewusst wortgleich übernommen — er ist vom Vorstand so
 * veröffentlicht und beschreibt verbindliche Maßnahmen. Neu ist nur der
 * Sprungverweis zu den Vertrauenspersonen: wer Hilfe sucht, soll die
 * Kontaktdaten nicht erst erlesen müssen.
 */
export default function PraeventionPage() {
  const vertrauenspersonen = [
    {
      name: "Astrid Neuhaus",
      email: "astrid.neuhaus@posaunenwerk-rheinland.de",
      phone: null,
    },
    {
      name: "Andrea Lehmann",
      email: "andrea.lehmann@posaunenwerk-rheinland.de",
      phone: "06841 630922",
    },
  ];

  return (
    <PublicPage
      title="Prävention sexualisierter Gewalt"
      heroTitle="Prävention und Schutz gegen sexualisierte Gewalt gegen Kinder und Jugendliche"
      color="primary"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Über uns", href: "/ueber-uns" },
        { label: "Prävention sexualisierter Gewalt" },
      ]}
      description={
        <p>
          Auf dieser Seite finden sich einzelne Präventionsmaßnahmen des
          Posaunenwerkes der Ev. Kirche im Rheinland zum Schutz von Kindern und
          Jugendlichen gegen sexualisierte Gewalt. Diese Maßnahmen sind
          Bausteine eines umfassenden Präventions- und Schutzkonzeptes, welches
          im Moment erarbeitet und weiterentwickelt wird. Ziel des Konzeptes ist
          das Festhalten von Maßnahmen, Projekten und Aktionen, die den Schutz
          vor Gewalt und Kindeswohlgefährdung innerhalb des Posaunenwerkes
          vorantreiben soll.
        </p>
      }
    >
      {/* Direkter Weg zu den Ansprechpersonen */}
      <section className="bg-background dark:bg-dark-background pt-12">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="border-primary dark:bg-dark-surface rounded-lg border-l-4 bg-white p-6 shadow-sm dark:border-l-4">
              <div className="flex items-start gap-4">
                <ShieldCheckIcon className="text-primary mt-0.5 h-6 w-6 shrink-0" />
                <p className="text-gray-700 dark:text-gray-300">
                  Du hast einen Verdacht, bist selbst betroffen oder unsicher,
                  ob es sich um einen Verdacht handelt?{" "}
                  <Link
                    href="#vertrauenspersonen"
                    className="text-primary font-semibold hover:underline"
                  >
                    Unsere Vertrauenspersonen
                  </Link>{" "}
                  hören zu und beraten vertraulich. Unabhängig davon erreichst
                  du die „Nummer gegen Kummer“ kostenlos unter{" "}
                  <a
                    href="tel:116111"
                    className="text-primary font-semibold hover:underline"
                  >
                    116 111
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Selbstverpflichtung */}
      <section className="bg-background dark:bg-dark-background py-12">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold md:text-3xl">
              Selbstverpflichtung
            </h2>
            <p className="leading-relaxed text-gray-700 dark:text-gray-300">
              Personen, die regelmäßig für das Posaunenwerk im Bereich Kinder-
              und Jugendarbeit tätig sind, (bspw. Posaunenwarte, regelmäßige
              Lehrgangsdozentinnen und -dozenten), müssen zuvor eine
              Verpflichtungserklärung (
              <em>Schutzkonzept Selbstverpflichtung</em>) unterschreiben sowie
              alle fünf Jahre ein erweitertes Führungszeugnis vorlegen. Sie
              werden nach Möglichkeit von der Ansprechstelle der EKiR geschult.
            </p>

            <div className="mt-6">
              <a
                href="/downloads/selbstverpflichtung-kinderschutz.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="border-primary text-primary hover:bg-primary inline-flex items-center justify-center rounded-lg border-2 bg-white px-6 py-3 font-semibold transition-colors hover:text-white"
              >
                <DownloadIcon className="mr-2 h-5 w-5" />
                Selbstverpflichtungserklärung herunterladen
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Grundsätze für Veranstaltungen */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold md:text-3xl">
              Grundsätze für Veranstaltungen
            </h2>
            <div className="space-y-4 leading-relaxed text-gray-700 dark:text-gray-300">
              <p>
                Veranstaltungen des Posaunenwerks, an denen Kinder und
                Jugendliche beteiligt sind, werden durch den Landesposaunenwart
                nach Art, Ablauf, Dauer, Inhalten, Raumsituation etc. daraufhin
                beurteilt, ob sexualisierte Gewalt gegen Kinder und Jugendliche
                vollständig ausgeschlossen werden kann. Dies ist insbesondere
                dann nicht der Fall, wenn Übernachtungen Teil der Veranstaltung
                sind und/oder teilnehmende Kinder und Jugendliche mitunter
                allein oder in kleinen Gruppen agieren.
              </p>
              <p>
                Kann sexualisierte Gewalt im Rahmen einer Veranstaltung nicht
                vollständig ausgeschlossen werden, so gelten folgende Maßnahmen:
              </p>
              <ol className="ml-6 list-decimal space-y-3">
                <li>
                  Leitungs- und Betreuungspersonen müssen zuvor die og.
                  Verpflichtungserklärung unterschreiben, sowie ein erweitertes
                  Führungszeugnis nicht älter als 6 Monate vorlegen. Dies ist
                  nicht notwendig, wenn die Personen regelmäßig für das
                  Posaunenwerk tätig sind und die Verpflichtungserklärung und
                  das Führungszeugnis bereits im Rahmen dieser Tätigkeit
                  vorgelegt haben.
                </li>
                <li>
                  Für die Veranstaltung werden vom LPW jeweils eine mitwirkende
                  männliche und weibliche Vertrauens-/Ansprechperson benannt,
                  die den Eltern mit den Veranstaltungsinformationen sowie den
                  teilnehmenden Kindern und Jugendlichen vor Ort mitgeteilt
                  werden.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Vertrauenspersonen */}
      <section
        id="vertrauenspersonen"
        className="bg-background dark:bg-dark-background scroll-mt-24 py-12"
      >
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold md:text-3xl">
              Vertrauenspersonen
            </h2>
            <p className="mb-8 leading-relaxed text-gray-700 dark:text-gray-300">
              Der Vorstand des Posaunenwerkes hat zwei Vertrauenspersonen
              benannt. An diese Personen oder eine von beiden können sich
              Betroffene oder auch andere wenden bei einem Verdacht auf
              sexualisierte Gewalt oder bei Unsicherheit, ob es sich um einen
              Verdacht handeln könnte. Die Vertrauenspersonen nehmen deren
              Angaben und Fragen auf und wissen, wie die weiteren Verfahrenswege
              sind. Sie beraten und unterstützen.
            </p>

            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              {vertrauenspersonen.map((person) => (
                <div
                  key={person.email}
                  className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-semibold">
                    {person.name}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2">
                      <MailIcon className="text-primary h-4 w-4 shrink-0" />
                      <a
                        href={`mailto:${person.email}`}
                        className="text-primary break-all hover:underline"
                      >
                        {person.email}
                      </a>
                    </p>
                    {person.phone && (
                      <p className="flex items-center gap-2">
                        <PhoneIcon className="text-primary h-4 w-4 shrink-0" />
                        <a
                          href={`tel:${person.phone.replace(/\s/g, "")}`}
                          className="text-primary hover:underline"
                        >
                          Tel. {person.phone}
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 leading-relaxed text-gray-700 dark:text-gray-300">
              <p>
                Die Vertrauenspersonen werden von der Ansprechstelle der EKiR
                geschult.
              </p>
              <p>
                Die{" "}
                <a
                  href="https://ansprechstelle.ekir.de"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Ansprechstelle der Ev. Kirche im Rheinland
                </a>{" "}
                bietet Betroffenen, deren Angehörigen und anderen Ratsuchenden
                ebenfalls vertrauliche Beratung an. Ansprechpartnerin Claudia
                Paul ist unter{" "}
                <a
                  href="tel:02113610312"
                  className="text-primary hover:underline"
                >
                  Tel. 0211 3610-312
                </a>{" "}
                zu erreichen.
              </p>
              <p>
                Darüber hinaus gibt es vom Posaunenwerk oder der Ev. Kirche
                unabhängige Beratungsangebote wie die „Nummer gegen Kummer“ (
                <a href="tel:116111" className="text-primary hover:underline">
                  Tel. 116 111
                </a>
                ), an die sich Betroffene oder Eltern auch direkt wenden können.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fortbildung und Beratung der Mitgliedschöre */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold md:text-3xl">
              Fortbildung und Beratung der Mitgliedschöre
            </h2>
            <div className="space-y-4 leading-relaxed text-gray-700 dark:text-gray-300">
              <p>
                Das Thema „Prävention und Schutz gegen Sexualisierte Gewalt
                gegen Kinder- und Jugendliche“ wird in Fortbildungen des
                Posaunenwerks für Chorleitung, Jungbläserausbildung und ähnliche
                Formate implementiert.
              </p>
              <p>
                Das Posaunenwerk bietet seinen Mitgliedschören Orientierung und
                Unterstützung bei der Erarbeitung und Umsetzung eigener Konzepte
                gegen sexualisierte Gewalt gegen Kinder und Jugendliche.
              </p>
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
