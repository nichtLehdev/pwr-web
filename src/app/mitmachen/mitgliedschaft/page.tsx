import Link from "next/link";
import PublicPage from "../../_components/general/public-page";
import { ButtonLink } from "../../_components/programmheft/button-link";
import {
  PageSection,
  Split,
} from "../../_components/programmheft/page-section";
import { Panel } from "../../_components/programmheft/panel";
import {
  Heading,
  SectionHead,
} from "../../_components/programmheft/section-head";
import { ValueTable } from "../../_components/programmheft/value-table";
import { WayList, WayRow } from "../../_components/programmheft/way-list";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Mitgliedschaft & Versicherung",
  description:
    "Mitgliedschaft im Posaunenwerk Rheinland für Posaunenchöre: Mitgliedsbeiträge, Satzung und Aufnahmeantrag, Ehrungen sowie die Instrumentenversicherung über unseren Rahmenvertrag.",
  path: "/mitmachen/mitgliedschaft",
});

const BEITRAEGE = [
  { label: "Grundbeitrag", value: "45 €" },
  { label: "Je Chormitglied mit Einkommen", value: "16 €" },
  { label: "Je Chormitglied ohne Einkommen", value: "8 €" },
];

const UNTERLAGEN = [
  "Schriftliche Schilderung des Schadens­hergangs",
  "Genaue Bezeichnung des geschädigten Instrumentes",
  "Wenn möglich: Angebot einer Fachfirma zur Schadens­höhe",
];

/** Fließtext der Seite: Tinte, ruhige Zeilenlänge. */
const PROSE =
  "text-ink dark:text-night-text max-w-[65ch] space-y-4 text-lg leading-relaxed";

/** Kleiner Kopf innerhalb eines Abschnitts, z. B. „Jährliche Mitgliedsbeiträge:“. */
const LABEL_HEAD =
  "semi-condensed text-ink dark:text-night-text text-lg font-semibold";

/** Für Mitgliedschöre und Obleute, daher „Sie“ (die Einstiegsseite /mitmachen duzt). */
export default function MitgliedschaftPage() {
  return (
    <PublicPage
      title="Mitgliedschaft & Versicherung"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Mitmachen", href: "/mitmachen" },
        { label: "Mitgliedschaft & Versicherung" },
      ]}
      description={
        <p>
          Über Ihr Interesse an einer Mitgliedschaft im Posaunenwerk Rheinland
          freuen wir uns sehr.
        </p>
      }
    >
      <PageSection id="mitgliedschaft" labelledBy="mitgliedschaft-heading">
        <Split
          head={
            <Heading id="mitgliedschaft-heading" className="text-balance">
              Mitgliedschaft im Posaunenwerk
            </Heading>
          }
          bodyClassName="mt-8 space-y-16"
        >
          <div>
            <Heading as="h3" size="list" rule>
              Einzelmitgliedschaft
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Da das Posaunenwerk im Kern ein Verbund von Posaunenchören ist,
                ist eine Einzelmitgliedschaft nur in besonderen und eng
                begrenzten Ausnahmefällen möglich. Wir freuen uns, dass Sie uns
                verbunden sein möchten, und empfehlen hierzu die Mitgliedschaft
                in unserem{" "}
                <Link href="/foerderverein" className="link-ink">
                  Förderverein
                </Link>
                .
              </p>
              <p>
                Über eine solche Mitgliedschaft erhalten Sie auch unser
                Blechblatt sowie alle Informationen und Einladungen zu unseren
                Veranstaltungen.
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              Mitgliedschaft für Posaunenchöre
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Die Mitgliedschaft eines Posaunenchores im Posaunenwerk der Ev.
                Kirche im Rheinland e.V. kann schriftlich bei der
                Geschäftsstelle beantragt werden.
              </p>
            </div>

            <h4 className={`${LABEL_HEAD} mt-8`}>
              Jährliche Mitgliedsbeiträge:
            </h4>
            <ValueTable rows={BEITRAEGE} className="mt-3" />

            <WayList className="mt-10">
              <WayRow
                href="/downloads/satzung-posaunenwerk.pdf"
                kind="download"
                title="Satzung herunterladen"
              />
              <WayRow
                href="/downloads/aufnahmeantrag-choere.pdf"
                kind="download"
                title="Aufnahmeantrag herunterladen"
              />
            </WayList>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              Ehrungen
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Informationen zu Ehrungen finden sich in der{" "}
                <a
                  href="/downloads/ehrenordnung.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-ink"
                >
                  Ehrenordnung des Posaunenwerks
                  <span className="sr-only"> (PDF, öffnet in neuem Tab)</span>
                </a>
                .
              </p>
              <p>
                Fragen zu Ehrungen oder zur Mitgliedschaft im Allgemeinen
                beantwortet gerne die{" "}
                <Link href="/kontakt" className="link-ink">
                  Geschäftsstelle
                </Link>
                .
              </p>
            </div>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="versicherung-heading" rule>
        <Split
          head={
            <SectionHead
              id="versicherung-heading"
              title={<>Instrumenten&shy;versicherung</>}
              className="hyphens-manual"
              intro={
                <>
                  Schützen Sie Ihre wertvollen Instrumente optimal mit unserer
                  günstigen Rahmen&shy;versicherung.
                </>
              }
            />
          }
          bodyClassName="mt-12 space-y-16"
        >
          <div>
            <Heading as="h3" size="list" rule>
              Unser Rahmen&shy;vertrag
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Das Posaunenwerk der Ev. Kirche im Rheinland e.V. hat einen
                Rahmenvertrag über eine preisgünstige
                Musik&shy;instrumenten&shy;versicherung mit der{" "}
                <strong className="font-semibold whitespace-nowrap">
                  Sparkassen-Versicherung AG
                </strong>{" "}
                in 70365 Stuttgart abgeschlossen, vermittelt durch{" "}
                <strong className="font-semibold">ECCLESIA</strong> -
                Versicherungs&shy;dienst GmbH in 32754 Detmold.
              </p>
              <p>
                Innerhalb dieses Rahmens können unsere Mitglieds&shy;chöre
                Versicherungen abschließen, die durch uns vermittelt und deren
                Versicherungs&shy;beiträge durch uns eingezogen werden.
              </p>
              <p>
                Die Versicherung verlängert sich automatisch zu den gleichen
                Bedingungen um ein weiteres Jahr, wenn uns bis zum{" "}
                <strong className="font-semibold whitespace-nowrap">
                  30. November
                </strong>{" "}
                keine Änderungs&shy;meldung bzw. Kündigung zugeht.
              </p>
            </div>
          </div>

          <Panel as="section" labelledBy="schadensfall-heading">
            <Heading as="h3" id="schadensfall-heading" size="list">
              Im Schadensfall
            </Heading>
            <p className="text-ink dark:text-night-text mt-4 max-w-[65ch] text-lg leading-relaxed">
              Ansprechpartner beim Posaunenwerk für die Meldung und Abwicklung
              eines unter den Versicherungs&shy;schutz fallenden Schadens ist
              die{" "}
              <Link href="/kontakt" className="link-ink whitespace-nowrap">
                Geschäftsstelle
              </Link>
              .
            </p>

            <h4 className={`${LABEL_HEAD} mt-8`}>Benötigte Unterlagen:</h4>
            <ul className="border-ink dark:border-night-text mt-3 border-t-2">
              {UNTERLAGEN.map((unterlage) => (
                <li
                  key={unterlage}
                  className="border-rule dark:border-night-rule text-ink dark:text-night-text flex gap-3 border-b px-1 py-3 text-lg leading-snug"
                >
                  <span
                    aria-hidden
                    className="bg-ink dark:bg-night-text mt-2 h-2 w-2 shrink-0"
                  />
                  {unterlage}
                </li>
              ))}
            </ul>

            <ButtonLink href="/kontakt" className="mt-8">
              Schaden melden
            </ButtonLink>
          </Panel>
        </Split>
      </PageSection>
    </PublicPage>
  );
}
