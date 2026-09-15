import Link from "next/link";
import PublicPage from "../_components/general/public-page";
import { ButtonLink } from "../_components/programmheft/button-link";
import { ClosingCall } from "../_components/programmheft/closing-call";
import { Note } from "../_components/programmheft/note";
import { PageSection } from "../_components/programmheft/page-section";
import { Panel } from "../_components/programmheft/panel";
import { PointList } from "../_components/programmheft/point-list";
import { Heading, SectionHead } from "../_components/programmheft/section-head";
import { ValueTable } from "../_components/programmheft/value-table";
import { WayList, WayRow } from "../_components/programmheft/way-list";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Mitmachen",
  description:
    "Einstiegsmöglichkeiten ins Posaunenwerk Rheinland: Chor finden, Jungbläserarbeit, Aus- und Weiterbildung sowie ehrenamtliches Engagement.",
  path: "/mitmachen",
});

const EINSTIEGE = [
  {
    href: "/mitmachen/chor-finden",
    title: "Chor finden",
    description:
      "Finde einen Posaunenchor in deiner Nähe und werde Teil einer musikalischen Gemeinschaft.",
  },
  {
    href: "/mitmachen/bildung",
    title: "Aus- und Weiterbildung",
    description:
      "Von Anfängerkursen bis zu Fortbildungen – entdecke unsere vielfältigen Bildungsangebote.",
  },
  {
    href: "/mitmachen/jungblaeser",
    title: "Jungbläserarbeit",
    description:
      "Musik von Anfang an – Angebote für Kinder und Jugendliche im Posaunenchor.",
  },
  {
    href: "/mitmachen/ehrenamt",
    title: "Ehrenamtlich engagieren",
    description:
      "Bringe deine Fähigkeiten ein und gestalte die Zukunft des Posaunenwerks aktiv mit.",
  },
  {
    href: "/foerderverein",
    title: "Fördern & Spenden",
    description:
      "Unterstütze unsere Arbeit durch eine Mitgliedschaft im Förderverein oder eine Spende.",
    tone: "foerderverein" as const,
  },
];

const FOERDERVEREIN_FAKTEN = [
  { title: "Nur 36 € / Jahr" },
  { title: "Geschenk-CD 2025", text: "für Neumitglieder" },
  { title: "Direkte Förderung", text: "Lehrgänge & Projekte" },
];

const GRUENDE = [
  {
    title: "Gemeinsam Musik machen",
    text: "Erlebe die Freude am gemeinsamen Musizieren in einer starken Gemeinschaft von über 2.000 Bläserinnen und Bläsern im Rheinland.",
  },
  {
    title: "Glauben leben",
    text: "Verbinde deine Musikalität mit deinem Glauben und gestalte Gottesdienste und kirchliche Feste aktiv mit.",
  },
  {
    title: "Persönlich wachsen",
    text: "Entwickle deine musikalischen Fähigkeiten durch regelmäßiges Üben, Workshops und die Begleitung erfahrener Chorleiter.",
  },
  {
    title: "Teil einer Bewegung",
    text: "Werde Teil einer über 140 Jahre alten Tradition mit annähernd 200 Posaunenchören im Rheinland.",
  },
];

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

/** Linke Spalte ab 64rem: Kopf und Einleitung; rechts der Inhalt. */
const SPLIT = "lg:grid lg:grid-cols-12 lg:gap-10";

export default function MitmachenPage() {
  return (
    <PublicPage
      title="Mitmachen im Posaunenwerk"
      breadcrumbs={[{ label: "Start", href: "/" }, { label: "Mitmachen" }]}
      description={
        <p>
          Ob als Bläserin oder Bläser, ehrenamtlich Engagierte oder Fördernde –
          es gibt viele Wege, Teil des Posaunenwerks Rheinland zu werden.
          Entdecke die Möglichkeiten, die zu dir passen!
        </p>
      }
    >
      <PageSection labelledBy="einstieg-heading" sheetClassName={SPLIT}>
        <div className="lg:col-span-4">
          <Heading id="einstieg-heading" className="hyphens-auto text-balance">
            Deine Einstiegsmöglichkeiten
          </Heading>
        </div>
        <WayList
          labelledBy="einstieg-heading"
          className="mt-8 lg:col-span-8 lg:mt-0"
        >
          {EINSTIEGE.map((weg) => (
            <WayRow
              key={weg.href}
              href={weg.href}
              title={weg.title}
              description={weg.description}
              tone={weg.tone}
            />
          ))}
        </WayList>
      </PageSection>

      <PageSection labelledBy="foerderverein-heading" rule sheetClassName={SPLIT}>
        <div className="lg:col-span-4">
          <Heading id="foerderverein-heading" className="text-balance">
            Förderverein – Bläser für Bläser
          </Heading>
          <span aria-hidden className="bg-foerderverein mt-6 block h-1.5 w-24" />
          <p className="text-dark dark:text-night-muted mt-6 max-w-[40ch] text-lg">
            Unterstützen Sie die Arbeit des Posaunenwerks nachhaltig! Werden
            Sie Mitglied im Förderverein und profitieren Sie von exklusiven
            Vorteilen.
          </p>
        </div>
        <div className="mt-10 lg:col-span-8 lg:mt-0">
          <PointList items={FOERDERVEREIN_FAKTEN} columns={3} titleAs="p" />
          <WayList className="mt-10">
            <WayRow
              href="/foerderverein"
              title="Mehr zum Förderverein"
              tone="foerderverein"
            />
            <WayRow
              href="mailto:foerderverein@posaunenwerk-rheinland.de?subject=Mitgliedschaft im Förderverein"
              title="Mitglied werden"
              tone="foerderverein"
            />
          </WayList>
        </div>
      </PageSection>

      <PageSection labelledBy="warum-heading" sheetClassName={SPLIT}>
        <div className="lg:col-span-4">
          <Heading id="warum-heading">Warum Posaunenchor?</Heading>
        </div>
        <PointList items={GRUENDE} className="mt-8 lg:col-span-8 lg:mt-0" />
      </PageSection>

      <PageSection
        id="mitgliedschaft"
        labelledBy="mitgliedschaft-heading"
        rule
        className="scroll-mt-24"
        sheetClassName={SPLIT}
      >
        <div className="lg:col-span-4">
          <SectionHead
            id="mitgliedschaft-heading"
            title="Mitgliedschaft im Posaunenwerk"
            className="text-balance"
            intro="Über Ihr Interesse an einer Mitgliedschaft im Posaunenwerk Rheinland freuen wir uns sehr."
          />
        </div>

        <div className="mt-12 space-y-16 lg:col-span-8 lg:mt-0">
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
                Kirche im Rheinland e.V. kann schriftlich bei der Geschäftsstelle
                beantragt werden.
              </p>
            </div>

            <h4 className={`${LABEL_HEAD} mt-8`}>Jährliche Mitgliedsbeiträge:</h4>
            <ValueTable rows={BEITRAEGE} className="mt-3 max-w-2xl" />

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

          <Note title="Ehrungen" titleAs="h3">
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
          </Note>
        </div>
      </PageSection>

      <PageSection labelledBy="versicherung-heading" rule sheetClassName={SPLIT}>
        <div className="lg:col-span-4">
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
        </div>

        <div className="mt-12 space-y-16 lg:col-span-8 lg:mt-0">
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
            </div>
            <Note tone="important" className="mt-8 max-w-[65ch]">
              <p className="text-lg">
                <strong className="font-semibold">Hinweis:</strong> Die
                Versicherung verlängert sich automatisch zu den gleichen
                Bedingungen um ein weiteres Jahr, wenn uns bis zum{" "}
                <strong className="font-semibold whitespace-nowrap">
                  30. November
                </strong>{" "}
                keine Änderungs&shy;meldung bzw. Kündigung zugeht.
              </p>
            </Note>
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
        </div>
      </PageSection>

      <PageSection labelledBy="newsletter-heading" rule sheetClassName={SPLIT}>
        <div className="lg:col-span-4">
          <Heading id="newsletter-heading" className="text-balance">
            Bleib auf dem Laufenden
          </Heading>
        </div>
        <div className="mt-6 lg:col-span-8 lg:mt-0">
          <p className="text-ink dark:text-night-text max-w-[46ch] text-xl leading-relaxed">
            Abonniere unseren Newsletter und verpasse keine Neuigkeiten, Termine
            und Angebote.
          </p>
          <WayList className="mt-8">
            <WayRow href="/newsletter" title="Newsletter abonnieren" />
          </WayList>
        </div>
      </PageSection>

      <ClosingCall
        id="fragen-heading"
        title="Noch Fragen?"
        text="Wir beraten dich gerne persönlich zu allen Möglichkeiten des Mitmachens. Nimm einfach Kontakt mit uns auf!"
        actions={[
          { href: "/kontakt", label: "Kontakt aufnehmen" },
          { href: "/ueber-uns", label: "Mehr über uns" },
        ]}
      />
    </PublicPage>
  );
}
