import PublicPage from "@/app/_components/general/public-page";
import { ButtonLink } from "@/app/_components/programmheft/button-link";
import { Note } from "@/app/_components/programmheft/note";
import {
  PageSection,
  Split,
} from "@/app/_components/programmheft/page-section";
import {
  Heading,
  SectionHead,
} from "@/app/_components/programmheft/section-head";
import { PointList } from "@/app/_components/programmheft/point-list";
import { WayList, WayRow } from "@/app/_components/programmheft/way-list";
import { ClosingCall } from "@/app/_components/programmheft/closing-call";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Aus- und Weiterbildung",
  description:
    "Lehrgänge, Kurse und Qualifizierung für Bläserinnen, Bläser und Chorleitung im Posaunenwerk Rheinland.",
  path: "/mitmachen/bildung",
});

/** Fließtext der Seite: Tinte, ruhige Zeilenlänge (65ch). */
const PROSE =
  "text-ink dark:text-night-text max-w-[65ch] space-y-4 text-lg leading-relaxed";

const BILDUNGSANGEBOTE = [
  {
    title: "Bläserkurse",
    text: "Von Anfänger bis Fortgeschrittene, von Jung bis Alt – Lehrgänge für alle Leistungsstufen.",
  },
  {
    title: "Chorleitung",
    text: "Ausbildung für Chorleiter und angehende Dirigenten.",
  },
  {
    title: "Workshops",
    text: "Spezialthemen wie Improvisation, Arrangement, Registerarbeit.",
  },
  {
    title: "Komponistenportraits",
    text: "Musikalische Reisen durch Leben und Werk großer Komponisten.",
  },
  {
    title: "Studienfahrten",
    text: "Musikalische Bildungsreisen zu besonderen Orten und Festivals.",
  },
  {
    title: "Bläserfreizeiten",
    text: "Gemeinsames Musizieren, Lernen und Erleben für alle Altersgruppen.",
  },
];

const ARBEITSHILFE_THEMEN = [
  { title: "Wie generiere ich neue BläserInnen?" },
  { title: "Beispielhafter Ablauf einer ersten Kontaktstunde" },
  { title: "Verschiedene Kooperationsmodelle zur Ausbildung" },
  { title: "Wie integriere ich die jungen Menschen in den Posaunenchor?" },
];

/**
 * Aus- und Weiterbildung, durchgehend mit „du“ (wie auf /mitmachen). Ein
 * Förderverein-Abschnitt (Fördermöglichkeiten) nutzt die blaue Druckfläche;
 * das ist die einzige zusätzliche Farbfläche der Seite (One Field Rule).
 */
export default function BildungPage() {
  return (
    <PublicPage
      title="Aus- und Weiterbildung"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Mitmachen", href: "/mitmachen" },
        { label: "Aus- und Weiterbildung" },
      ]}
      description={
        <p>
          Das Posaunenwerk bietet ein umfangreiches Aus- und
          Weiterbildungsprogramm an. Verschiedene Workshops und ein- oder
          mehrtägige Lehrgänge richten sich an die Bläserinnen und Bläser und
          Chorleiter der Chöre im Rheinland. Ebenso gibt es spezielle Lehrgänge
          für junge Bläser und junggebliebene Anfänger jeden Alters.
        </p>
      }
    >
      <PageSection>
        {/* Rahmen statt Füllung: Die Seite trägt bereits das blaue
            Fördervereinsfeld und den orangen Schlussaufruf. Eine dritte
            Farbfläche direkt unter dem Titel wäre lauter als die Überschrift
            und nähme dem Schlussaufruf seine Rolle als einziger Blickfang. */}
        <Note tone="info" title="Wichtig" titleAs="h2">
          <p>
            Unser Angebot richtet sich nicht ausschließlich an Mitglieder des
            Posaunenwerks, sondern steht allen Interessierten offen!
          </p>
        </Note>
      </PageSection>

      <PageSection labelledBy="angebote-heading" rule>
        <Split
          head={
            <SectionHead
              id="angebote-heading"
              title={<>Unsere Bildungs&shy;angebote</>}
              intro="Von Anfängerkursen bis zur Dirigenten-Ausbildung – finde das passende Angebot für dein musikalisches Weiterkommen."
              className="hyphens-manual"
            />
          }
          bodyClassName="mt-8"
        >
          <PointList items={BILDUNGSANGEBOTE} columns={2} />
        </Split>
      </PageSection>

      <PageSection labelledBy="lehrgaenge-heading" rule>
        <Split
          side="right"
          head={
            <Heading id="lehrgaenge-heading" className="hyphens-manual">
              Aktuelle Lehrgänge &amp; Anmeldung
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <WayList labelledBy="lehrgaenge-heading">
            <WayRow
              href="/termine?type=courses&view=list"
              title="Zu den Lehrgängen"
              description="Das aktuelle Angebot und Anmeldemöglichkeiten findest du in unserer Terminübersicht. Dort kannst du dich direkt für die Lehrgänge anmelden."
            />
          </WayList>
        </Split>
      </PageSection>

      <PageSection labelledBy="stempel-heading" rule>
        <Split
          head={
            <Heading id="stempel-heading" className="hyphens-manual">
              Leistungs&shy;stufen &amp; Stempel
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <Heading as="h3" size="list" rule>
            Aufbauende Ausbildung
          </Heading>
          <div className={`${PROSE} mt-5`}>
            <p>
              Begleitend zur Ausbildung eines (Jung-)Bläsers können aufeinander
              aufbauende Leistungsstufen (Stempel) erworben werden. Hierzu
              werden durch den Jungbläserausbilder, Chorleiter oder Posaunenwart
              kleine Prüfungen abgehalten.
            </p>
            <p>
              Die erreichte Leistungsstufe wird auf dem Mitgliedsausweis durch
              einen Stempel dokumentiert.
            </p>
          </div>
          <ButtonLink
            href="/downloads/leistungsstempel.pdf"
            kind="download"
            variant="outline"
            className="mt-6"
          >
            Infos zu Leistungsstempeln herunterladen
          </ButtonLink>
        </Split>
      </PageSection>

      <PageSection labelledBy="jungblaeser-heading" rule>
        <Split
          side="right"
          head={
            <Heading id="jungblaeser-heading" className="hyphens-manual">
              Jungbläser&shy;ausbildung
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <p className="text-ink dark:text-night-text max-w-[65ch] text-lg leading-relaxed">
            Eine vom Landesposaunenwart und den Regionalposaunenwarten
            zusammengestellte Arbeitshilfe zum Thema Jungbläserausbildung
            versucht Antworten auf die vielen Fragen rund um das Thema zu geben:
          </p>
          <PointList
            items={ARBEITSHILFE_THEMEN}
            columns={2}
            titleAs="p"
            className="mt-6"
          />
          <ButtonLink
            href="/downloads/arbeitshilfe-jungblaeser.pdf"
            kind="download"
            variant="outline"
            className="mt-6"
          >
            Arbeitshilfe Jungbläser herunterladen
          </ButtonLink>
        </Split>
      </PageSection>

      {/* Hier spricht der Förderverein: volle blaue Druckfläche. */}
      <PageSection labelledBy="foerderverein-heading" surface="foerderverein">
        <Split
          side="right"
          head={
            <>
              <Heading id="foerderverein-heading" className="hyphens-manual">
                Förder&shy;möglichkeiten durch den Förderverein
              </Heading>
              <span aria-hidden className="bg-ink mt-6 block h-1.5 w-24" />
            </>
          }
          bodyClassName="mt-6"
        >
          <p className="max-w-[60ch] text-xl leading-relaxed">
            Der Förderverein unterstützt die Bildungsarbeit des Posaunenwerks!
            Geschwisterkinder erhalten eine Ermäßigung von 25 € pro weiterem
            Kind bei der Anmeldung für Lehrgänge. Zusätzlich trägt der
            Förderverein weitere Kosten, um die Teilnehmerbeiträge für alle zu
            reduzieren.
          </p>
          <WayList className="mt-8">
            <WayRow
              href="/foerderverein"
              title="Mehr zum Förderverein"
              tone="foerderverein"
            />
          </WayList>
        </Split>
      </PageSection>

      <PageSection labelledBy="minderjaehrige-heading" rule>
        <Split
          head={
            <Heading id="minderjaehrige-heading" className="hyphens-manual">
              Für minderjährige Teilnehmer
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <p className="text-ink dark:text-night-text max-w-[65ch] text-lg leading-relaxed">
            Minderjährige Lehrgangsteilnehmer müssen vorab eine ausgefüllte und
            unterzeichnete Zusatzerklärung einreichen.
          </p>
          <ButtonLink
            href="/downloads/zusatzerklaerung-minderjaehrige.pdf"
            kind="download"
            variant="outline"
            className="mt-6"
          >
            Zusatzerklärung herunterladen
          </ButtonLink>
        </Split>
      </PageSection>

      <ClosingCall
        id="fragen-heading"
        title="Fragen zur Ausbildung?"
        text="Unser Bildungsreferat berät dich gerne zu allen Fragen rund um Aus- und Weiterbildung."
        actions={[{ href: "/kontakt", label: "Kontakt aufnehmen" }]}
      />
    </PublicPage>
  );
}
