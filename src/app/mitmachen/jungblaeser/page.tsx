import PublicPage from "@/app/_components/general/public-page";
import { ClosingCall } from "@/app/_components/programmheft/closing-call";
import {
  PageSection,
  Split,
} from "@/app/_components/programmheft/page-section";
import { PointList } from "@/app/_components/programmheft/point-list";
import {
  Heading,
  SectionHead,
} from "@/app/_components/programmheft/section-head";
import { WayList, WayRow } from "@/app/_components/programmheft/way-list";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Jungbläserarbeit",
  description:
    "Jungbläserarbeit im Posaunenwerk Rheinland: Ausbildung, Lehrgänge und Angebote für Kinder und Jugendliche am Blechblasinstrument.",
  path: "/mitmachen/jungblaeser",
});

/** Fließtext der Seite: Tinte, ruhige Zeilenlänge (65ch). */
const PROSE =
  "text-ink dark:text-night-text max-w-[65ch] space-y-4 text-lg leading-relaxed";

const ANGEBOTE = [
  {
    title: "Bläserkurse für Kinder & Jugendliche",
    text: "Spielerisch ein Blechblasinstrument erlernen – von den ersten Tönen bis zum gemeinsamen Musizieren.",
  },
  {
    title: "Jungbläserfreizeiten",
    text: "Gemeinsam Musik machen, neue Freunde finden und unvergessliche Erlebnisse teilen.",
  },
  {
    title: "Jungbläserensembles",
    text: "In kleinen Gruppen gemeinsam musizieren und von erfahrenen Dozenten lernen.",
  },
  {
    title: "Workshops & Projekte",
    text: "Spannende Themen wie Improvisation, Rhythmik oder Musik und Bewegung für junge Bläser.",
  },
];

const WARUM = [
  {
    title: "Musikalische Grundlagen",
    text: "Kinder und Jugendliche lernen Notenlesen, Rhythmus und erwerben ein fundiertes musikalisches Verständnis.",
  },
  {
    title: "Gemeinschaft erleben",
    text: "Im Chor entstehen Freundschaften, Teamgeist und ein starkes Zusammengehörigkeitsgefühl.",
  },
  {
    title: "Persönliche Entwicklung",
    text: "Musik fördert Konzentration, Disziplin, Selbstbewusstsein und Kreativität.",
  },
  {
    title: "Glauben leben",
    text: "Junge Menschen erleben, wie Musik und Glaube zusammengehören und Gottesdienste mitgestalten können.",
  },
];

/**
 * Mit „du“ (wie auf /mitmachen). Die zwei „Sie“-Sätze im letzten Abschnitt sind
 * bewusst unverändert aus dem Original übernommen.
 */
export default function JungblaserPage() {
  return (
    <PublicPage
      title="Jungbläserarbeit"
      heroTitle="Jungbläserarbeit – Musik von Anfang an"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Mitmachen", href: "/mitmachen" },
        { label: "Jungbläserarbeit" },
      ]}
      description={
        <>
          <p>
            Kinder und Jugendliche für die Musik zu begeistern ist uns ein
            besonderes Anliegen. In unseren Posaunenchören finden junge Menschen
            einen Ort, an dem sie gemeinsam musizieren, lernen und wachsen
            können.
          </p>
          <p>
            Von den ersten Tönen auf dem Instrument bis zum gemeinsamen Auftritt
            – wir begleiten junge Bläserinnen und Bläser auf ihrem musikalischen
            Weg.
          </p>
        </>
      }
    >
      <PageSection labelledBy="was-ist-heading">
        <Split
          head={
            <Heading id="was-ist-heading" className="hyphens-manual">
              Was ist Jungbläser&shy;arbeit?
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <div className={PROSE}>
            <p>
              Jungbläserarbeit umfasst alle Angebote und Aktivitäten für Kinder
              und Jugendliche, die ein Blechblasinstrument erlernen möchten oder
              bereits spielen. Ob Trompete, Posaune, Horn oder Tuba – bei uns
              können junge Menschen ab etwa 8 Jahren ihr Wunschinstrument
              entdecken.
            </p>
            <p>
              In kleinen Gruppen oder im Einzelunterricht lernen sie die
              Grundlagen, bevor sie dann im Jungbläserchor gemeinsam musizieren.
              Ziel ist es, die jungen Bläserinnen und Bläser Schritt für Schritt
              in die Posaunenchöre zu integrieren.
            </p>
            <p>
              Unsere Jungbläserarbeit verbindet musikalische Ausbildung mit
              christlichen Werten und Gemeinschaftserlebnissen – sei es bei
              Freizeiten, Workshops oder besonderen Projekten.
            </p>
            <p>
              „Jungbläser“ hat bei uns übrigens nichts mit dem Geburtsdatum zu
              tun. Wer neu mit einem Blechblasinstrument anfängt, gehört dazu –
              ganz gleich, ob Kind, Jugendlicher oder längst erwachsen.
            </p>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="angebote-heading" rule>
        <Split
          side="right"
          head={
            <SectionHead
              id="angebote-heading"
              title="Unsere Angebote für Jungbläser"
              intro="Vielfältige Möglichkeiten für Kinder und Jugendliche, die Welt der Blechblasinstrumente zu entdecken."
            />
          }
          bodyClassName="mt-8"
        >
          <PointList items={ANGEBOTE} columns={2} />
        </Split>
      </PageSection>

      <PageSection labelledBy="warum-heading" rule>
        <Split
          head={
            <Heading id="warum-heading" className="hyphens-manual">
              Warum Jungbläser&shy;arbeit?
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <PointList items={WARUM} columns={2} />
        </Split>
      </PageSection>

      <PageSection labelledBy="chorleiter-heading" rule>
        <Split
          side="right"
          head={
            <Heading id="chorleiter-heading" className="hyphens-manual">
              Für Chorleiter &amp; Ausbilder
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <WayList labelledBy="chorleiter-heading">
            <WayRow
              href="/downloads/arbeitshilfe-jungblaeser.pdf"
              kind="download"
              title="Arbeitshilfe Jungbläserausbildung"
              description="Eine umfassende Arbeitshilfe mit praktischen Tipps und Anleitungen für alle, die in der Jungbläserausbildung tätig sind oder es werden wollen."
            />
            <WayRow
              href="/materialien?search=leistungsstempel"
              title="Leistungsstempel-System"
              description="Mit aufeinander aufbauenden Leistungsstufen können Sie den Fortschritt Ihrer Jungbläser dokumentieren und motivieren."
            />
            <WayRow
              href="/ueber-uns/posaunenwarte"
              title="Beratung & Unterstützung"
              description="Unsere Regionalposaunenwarte stehen für Fragen rund um die Jungbläserarbeit gerne zur Verfügung – von der Planung bis zur Umsetzung. Zögern Sie nicht, sich bei Bedarf an sie zu wenden!"
            />
          </WayList>
        </Split>
      </PageSection>

      <ClosingCall
        id="geweckt-heading"
        title="Interesse geweckt?"
        text="Finde einen Chor in deiner Nähe und starte deine musikalische Reise!"
        actions={[
          { href: "/mitmachen/chor-finden", label: "Chor finden" },
          { href: "/termine", label: "Termine ansehen" },
        ]}
      />
    </PublicPage>
  );
}
