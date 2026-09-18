import PublicPage from "@/app/_components/general/public-page";
import HistoryTimeline from "@/app/_components/history-timeline";
import { api } from "@/trpc/server";
import { ClosingCall } from "@/app/_components/programmheft/closing-call";
import {
  PageSection,
  Split,
} from "@/app/_components/programmheft/page-section";
import { PointList } from "@/app/_components/programmheft/point-list";
import { Heading } from "@/app/_components/programmheft/section-head";
import { ValueTable } from "@/app/_components/programmheft/value-table";
import { WayList, WayRow } from "@/app/_components/programmheft/way-list";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Struktur & Geschichte",
  description:
    "Aufbau, Bezirke und Geschichte des Posaunenwerks der Evangelischen Kirche im Rheinland.",
  path: "/ueber-uns/struktur",
});

const KERNZAHLEN = [
  { label: "Posaunenchöre", value: "ca. 200" },
  { label: "Aktive Bläser", value: "2.000+" },
  { label: "Bezirke", value: "13" },
  { label: "Auswahlchöre", value: "3" },
];

const FOERDERVEREIN_FAKTEN = [
  { title: "36 €", text: "Jahresbeitrag" },
  { title: "2008", text: "Gründungsjahr" },
  { title: "1.000 €", text: "p.a. für Lehrgangsförderung" },
  { title: "100 %", text: "Ehrenamtlich" },
];

const FOERDERVEREIN_LEISTUNGEN = [
  {
    title: "Auswahlchöre",
    text: "Förderung talentierter Bläser in unseren Ensembles",
  },
  {
    title: "Ausbildung",
    text: "Unterstützung von Lehrgängen und Weiterbildungen",
  },
  {
    title: "Projekte",
    text: "CD-Produktionen und besondere Initiativen",
  },
];

const VISION_MISSION = [
  {
    title: "Unsere Vision",
    text: "Wir möchten durch Musik Menschen bewegen, Gemeinschaft stiften und den christlichen Glauben verkündigen. Unsere Vision ist eine lebendige Posaunenchorarbeit in jeder Gemeinde des Rheinlands.",
  },
  {
    title: "Unsere Mission",
    text: "Wir fördern musikalische Exzellenz, bieten qualifizierte Ausbildung und schaffen Räume für Begegnung. Dabei verbinden wir Tradition mit Innovation und leben eine offene, wertschätzende Gemeinschaft.",
  },
];

export default async function StrukturGeschichtePage() {
  const historyTimeline = await api.organization.getHistory({});

  return (
    <PublicPage
      title="Struktur & Geschichte"
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
      <PageSection labelledBy="struktur-heading">
        <Split
          head={
            <Heading id="struktur-heading">Organisatorische Struktur</Heading>
          }
          bodyClassName="mt-8"
        >
          <div className="text-ink dark:text-night-text max-w-[65ch] space-y-4 text-lg leading-relaxed">
            <p>
              Das Posaunenwerk der Evangelischen Kirche im Rheinland e.V. ist
              die Dachorganisation für annähernd 200 Posaunenchöre mit über
              2.000 aktiven Bläserinnen und Bläsern. Die Arbeit ist strukturiert
              in 13 Bezirken, die das gesamte Gebiet der Evangelischen Kirche im
              Rheinland abdecken.
            </p>
            <p>
              Geleitet wird das Posaunenwerk vom Posaunenrat, der die
              strategischen Entscheidungen trifft und den Vorstand wählt. Die
              operative Arbeit wird von den Posaunenwarten koordiniert,
              unterstützt durch die Bezirksobleute in den einzelnen Regionen.
            </p>
          </div>

          <Heading as="h3" size="list" className="mt-12" rule>
            Kernzahlen im Überblick
          </Heading>
          <ValueTable rows={KERNZAHLEN} className="mt-3 max-w-md" />
        </Split>
      </PageSection>

      <PageSection labelledBy="foerderverein-heading" surface="foerderverein">
        <Split
          side="right"
          head={
            <>
              <Heading id="foerderverein-heading" className="text-balance">
                Förderverein – Gemeinsam stark
              </Heading>
              <span aria-hidden className="bg-ink mt-6 block h-1.5 w-24" />
              <p className="mt-6 max-w-[40ch] text-xl leading-relaxed">
                Seit 2008 unterstützt unser Förderverein die Arbeit des
                Posaunenwerks: von Auswahlchören über Lehrgänge bis zu
                CD-Produktionen. Werden Sie Teil unserer Gemeinschaft!
              </p>
            </>
          }
          bodyClassName="mt-10"
        >
          <PointList items={FOERDERVEREIN_FAKTEN} columns={2} titleAs="p" />
          <PointList
            items={FOERDERVEREIN_LEISTUNGEN}
            columns={3}
            className="mt-10"
          />
          <WayList className="mt-10">
            <WayRow href="/foerderverein" title="Mehr erfahren" />
            <WayRow
              href="mailto:foerderverein@posaunenwerk-rheinland.de?subject=Mitgliedschaft im Förderverein"
              title="Mitglied werden"
            />
          </WayList>
        </Split>
      </PageSection>

      <PageSection id="geschichte" labelledBy="geschichte-heading" rule>
        <Split
          head={<Heading id="geschichte-heading">Unsere Geschichte</Heading>}
          bodyClassName="mt-8"
        >
          <p className="text-ink dark:text-night-text max-w-[65ch] text-lg leading-relaxed">
            Über 140 Jahre Posaunenchorarbeit im Rheinland – eine Geschichte von
            Tradition, Innovation und gelebter Gemeinschaft. Erleben Sie die
            wichtigsten Meilensteine unserer Entwicklung.
          </p>
          <div className="mt-8">
            <HistoryTimeline events={historyTimeline} />
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="vision-heading" rule>
        <Split
          side="right"
          head={<Heading id="vision-heading">Vision & Mission</Heading>}
          bodyClassName="mt-8"
        >
          <PointList items={VISION_MISSION} columns={2} />
        </Split>
      </PageSection>

      <ClosingCall
        id="chorfinden-heading"
        title="Teil unserer Geschichte werden?"
        text="Finden Sie einen Posaunenchor in Ihrer Nähe und werden Sie Teil dieser lebendigen Tradition."
        actions={[{ href: "/mitmachen/chor-finden", label: "Chor finden" }]}
      />
    </PublicPage>
  );
}
