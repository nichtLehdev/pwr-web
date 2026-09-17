import Link from "next/link";
import PublicPage from "@/app/_components/general/public-page";
import { ButtonLink } from "@/app/_components/programmheft/button-link";
import {
  PageSection,
  Split,
} from "@/app/_components/programmheft/page-section";
import { Heading } from "@/app/_components/programmheft/section-head";
import { Note } from "@/app/_components/programmheft/note";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Prävention sexualisierter Gewalt",
  description:
    "Präventionsmaßnahmen des Posaunenwerks der Ev. Kirche im Rheinland zum Schutz von Kindern und Jugendlichen: Selbstverpflichtung, Grundsätze für Veranstaltungen und Vertrauenspersonen.",
  path: "/praevention",
});

/** Fließtext der Seite: Tinte, ruhige Zeilenlänge (Legal Page Rule: 65ch). */
const PROSE =
  "text-ink dark:text-night-text max-w-[65ch] space-y-4 text-lg leading-relaxed";

/** Nummerierte Liste im Tabellensatz statt grauer Kästen. */
function LegalNumbered({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="border-ink dark:border-night-text mt-4 border-t-2">
      {items.map((item, index) => (
        <li
          key={index}
          className="border-rule dark:border-night-rule text-ink dark:text-night-text flex gap-4 border-b px-1 py-4 text-lg leading-relaxed"
        >
          <span className="condensed text-ink dark:text-night-text shrink-0 text-xl font-extrabold tabular-nums">
            {index + 1}.
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

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
      <PageSection>
        <Note tone="important">
          <p>
            Du hast einen Verdacht, bist selbst betroffen oder unsicher, ob es
            sich um einen Verdacht handelt?{" "}
            <Link
              href="#vertrauenspersonen"
              className="font-semibold underline underline-offset-4"
            >
              Unsere Vertrauenspersonen
            </Link>{" "}
            hören zu und beraten vertraulich. Unabhängig davon erreichst du die
            „Nummer gegen Kummer“ kostenlos unter{" "}
            <a
              href="tel:116111"
              className="font-semibold underline underline-offset-4"
            >
              116 111
            </a>
            .
          </p>
        </Note>
      </PageSection>

      <PageSection labelledBy="selbstverpflichtung-heading" rule>
        <Split
          head={
            <Heading id="selbstverpflichtung-heading">
              Selbstverpflichtung
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <div className={PROSE}>
            <p>
              Personen, die regelmäßig für das Posaunenwerk im Bereich Kinder-
              und Jugendarbeit tätig sind, (bspw. Posaunenwarte, regelmäßige
              Lehrgangsdozentinnen und -dozenten), müssen zuvor eine
              Verpflichtungserklärung (
              <em>Schutzkonzept Selbstverpflichtung</em>) unterschreiben sowie
              alle fünf Jahre ein erweitertes Führungszeugnis vorlegen. Sie
              werden nach Möglichkeit von der Ansprechstelle der EKiR geschult.
            </p>
          </div>
          <ButtonLink
            href="/downloads/selbstverpflichtung-kinderschutz.pdf"
            kind="download"
            variant="outline"
            className="mt-6"
          >
            Selbstverpflichtungserklärung herunterladen
          </ButtonLink>
        </Split>
      </PageSection>

      <PageSection labelledBy="grundsaetze-heading" rule>
        <Split
          head={
            <Heading id="grundsaetze-heading" className="text-balance">
              Grundsätze für Veranstaltungen
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <div className={PROSE}>
            <p>
              Veranstaltungen des Posaunenwerks, an denen Kinder und Jugendliche
              beteiligt sind, werden durch den Landesposaunenwart nach Art,
              Ablauf, Dauer, Inhalten, Raumsituation etc. daraufhin beurteilt,
              ob sexualisierte Gewalt gegen Kinder und Jugendliche vollständig
              ausgeschlossen werden kann. Dies ist insbesondere dann nicht der
              Fall, wenn Übernachtungen Teil der Veranstaltung sind und/oder
              teilnehmende Kinder und Jugendliche mitunter allein oder in
              kleinen Gruppen agieren.
            </p>
            <p>
              Kann sexualisierte Gewalt im Rahmen einer Veranstaltung nicht
              vollständig ausgeschlossen werden, so gelten folgende Maßnahmen:
            </p>
          </div>
          <LegalNumbered
            items={[
              <>
                Leitungs- und Betreuungspersonen müssen zuvor die og.
                Verpflichtungserklärung unterschreiben, sowie ein erweitertes
                Führungszeugnis nicht älter als 6 Monate vorlegen. Dies ist
                nicht notwendig, wenn die Personen regelmäßig für das
                Posaunenwerk tätig sind und die Verpflichtungserklärung und das
                Führungszeugnis bereits im Rahmen dieser Tätigkeit vorgelegt
                haben.
              </>,
              <>
                Für die Veranstaltung werden vom LPW jeweils eine mitwirkende
                männliche und weibliche Vertrauens-/Ansprechperson benannt, die
                den Eltern mit den Veranstaltungsinformationen sowie den
                teilnehmenden Kindern und Jugendlichen vor Ort mitgeteilt
                werden.
              </>,
            ]}
          />
        </Split>
      </PageSection>

      <PageSection
        id="vertrauenspersonen"
        labelledBy="vertrauenspersonen-heading"
        rule
        className="scroll-mt-24"
      >
        <Split
          head={
            <Heading id="vertrauenspersonen-heading">
              Vertrauenspersonen
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <div className={PROSE}>
            <p>
              Der Vorstand des Posaunenwerkes hat zwei Vertrauenspersonen
              benannt. An diese Personen oder eine von beiden können sich
              Betroffene oder auch andere wenden bei einem Verdacht auf
              sexualisierte Gewalt oder bei Unsicherheit, ob es sich um einen
              Verdacht handeln könnte. Die Vertrauenspersonen nehmen deren
              Angaben und Fragen auf und wissen, wie die weiteren Verfahrenswege
              sind. Sie beraten und unterstützen.
            </p>
          </div>

          <ul className="border-ink dark:border-night-text mt-8 grid gap-x-10 border-t-2 sm:grid-cols-2">
            {vertrauenspersonen.map((person) => (
              <li
                key={person.email}
                className="border-rule dark:border-night-rule border-b py-5"
              >
                <p className="condensed text-ink dark:text-night-text text-[1.375rem] leading-tight font-bold">
                  {person.name}
                </p>
                <p className="mt-2">
                  <a
                    href={`mailto:${person.email}`}
                    className="link-ink text-base"
                  >
                    {person.email}
                  </a>
                </p>
                {person.phone ? (
                  <p className="mt-1">
                    <a
                      href={`tel:${person.phone.replace(/\s/g, "")}`}
                      className="link-ink text-base"
                    >
                      Tel. {person.phone}
                    </a>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <div className={`${PROSE} mt-8`}>
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
                className="link-ink"
              >
                Ansprechstelle der Ev. Kirche im Rheinland
                <span className="sr-only"> (öffnet eine externe Website)</span>
              </a>{" "}
              bietet Betroffenen, deren Angehörigen und anderen Ratsuchenden
              ebenfalls vertrauliche Beratung an. Ansprechpartnerin Claudia Paul
              ist unter{" "}
              <a href="tel:02113610312" className="link-ink">
                Tel. 0211 3610-312
              </a>{" "}
              zu erreichen.
            </p>
            <p>
              Darüber hinaus gibt es vom Posaunenwerk oder der Ev. Kirche
              unabhängige Beratungsangebote wie die „Nummer gegen Kummer“ (
              <a href="tel:116111" className="link-ink">
                Tel. 116 111
              </a>
              ), an die sich Betroffene oder Eltern auch direkt wenden können.
            </p>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="fortbildung-heading" rule>
        <Split
          head={
            <Heading id="fortbildung-heading" className="text-balance">
              Fortbildung und Beratung der Mitgliedschöre
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <div className={PROSE}>
            <p>
              Das Thema „Prävention und Schutz gegen Sexualisierte Gewalt gegen
              Kinder- und Jugendliche“ wird in Fortbildungen des Posaunenwerks
              für Chorleitung, Jungbläserausbildung und ähnliche Formate
              implementiert.
            </p>
            <p>
              Das Posaunenwerk bietet seinen Mitgliedschören Orientierung und
              Unterstützung bei der Erarbeitung und Umsetzung eigener Konzepte
              gegen sexualisierte Gewalt gegen Kinder und Jugendliche.
            </p>
          </div>
        </Split>
      </PageSection>
    </PublicPage>
  );
}
