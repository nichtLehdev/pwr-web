import PublicPage from "../_components/general/public-page";
import { ClosingCall } from "../_components/programmheft/closing-call";
import { PageSection, Split } from "../_components/programmheft/page-section";
import { PointList } from "../_components/programmheft/point-list";
import { Heading } from "../_components/programmheft/section-head";
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
    href: "/mitmachen/jungblaeser",
    title: "Jungbläserarbeit",
    description:
      "Musik von Anfang an – Angebote für Kinder und Jugendliche im Posaunenchor.",
  },
  {
    href: "/mitmachen/bildung",
    title: "Aus- und Weiterbildung",
    description:
      "Von Anfängerkursen bis zu Fortbildungen – entdecke unsere vielfältigen Bildungsangebote.",
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

const FOERDERVEREIN_FAKTEN = [
  { title: "Nur 36 € / Jahr" },
  { title: "Geschenk-CD", text: "für alle Neumitglieder" },
  {
    title: "20 % Geschwister-Ermäßigung",
    text: "auf die Lehrgangskosten ab dem zweiten Kind",
  },
  { title: "Direkte Förderung", text: "Lehrgänge & Projekte" },
];

/**
 * Einstiegsseite für Neue, durchgehend mit „du“. Abschnittsköpfe stehen links
 * vor dem Inhalt; nur die blaue Förderverein-Fläche setzt ihren Kopf rechts.
 * Mitgliedschaft und Versicherung für Chöre stehen auf eigener Seite.
 */
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
      <PageSection labelledBy="einstieg-heading">
        <Split
          head={
            // Nur ein bewusster Umbruch, wo die Spalte zu schmal ist.
            <Heading id="einstieg-heading" className="hyphens-manual">
              Deine Einstiegs&shy;möglichkeiten
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <WayList labelledBy="einstieg-heading">
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
        </Split>
      </PageSection>

      <PageSection labelledBy="warum-heading">
        <Split
          head={<Heading id="warum-heading">Warum Posaunenchor?</Heading>}
          bodyClassName="mt-8"
        >
          <PointList items={GRUENDE} />
        </Split>
      </PageSection>

      {/* Hier spricht der Förderverein: volle blaue Druckfläche. */}
      <PageSection labelledBy="foerderverein-heading" surface="foerderverein">
        <Split
          side="right"
          head={
            <>
              <Heading id="foerderverein-heading" className="text-balance">
                Förderverein – Bläser für Bläser
              </Heading>
              <span aria-hidden className="bg-ink mt-6 block h-1.5 w-24" />
              <p className="mt-6 max-w-[40ch] text-xl leading-relaxed">
                Unterstütze die Arbeit des Posaunenwerks nachhaltig! Werde
                Mitglied im Förderverein – dein Beitrag fördert Lehrgänge und
                Projekte.
              </p>
            </>
          }
          bodyClassName="mt-10"
        >
          <PointList items={FOERDERVEREIN_FAKTEN} columns={2} titleAs="p" />
          <WayList className="mt-10">
            <WayRow href="/foerderverein" title="Mehr zum Förderverein" />
            <WayRow
              href="mailto:foerderverein@posaunenwerk-rheinland.de?subject=Mitgliedschaft im Förderverein"
              title="Mitglied werden"
            />
          </WayList>
        </Split>
      </PageSection>

      <PageSection labelledBy="choere-heading" rule>
        <Split
          head={<Heading id="choere-heading">Für Posaunenchöre</Heading>}
          bodyClassName="mt-8"
        >
          <WayList labelledBy="choere-heading">
            <WayRow
              href="/mitmachen/mitgliedschaft"
              title="Mitgliedschaft & Versicherung"
              description="Mitgliedsbeiträge, Satzung und Aufnahmeantrag, Ehrungen und die Instrumentenversicherung."
            />
          </WayList>
        </Split>
      </PageSection>

      <PageSection labelledBy="newsletter-heading" rule>
        <Split
          head={
            <Heading id="newsletter-heading" className="text-balance">
              Bleib auf dem Laufenden
            </Heading>
          }
          bodyClassName="mt-6"
        >
          <p className="text-ink dark:text-night-text max-w-[46ch] text-xl leading-relaxed">
            Abonniere unseren Newsletter und verpasse keine Neuigkeiten, Termine
            und Angebote.
          </p>
          <WayList className="mt-8">
            <WayRow href="/newsletter" title="Newsletter abonnieren" />
          </WayList>
        </Split>
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
