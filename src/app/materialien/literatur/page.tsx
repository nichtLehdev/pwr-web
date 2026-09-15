import PublicPage from "@/app/_components/general/public-page";
import { ClosingCall } from "@/app/_components/programmheft/closing-call";
import {
  PageSection,
  Split,
} from "@/app/_components/programmheft/page-section";
import { Heading } from "@/app/_components/programmheft/section-head";
import { api } from "@/trpc/server";
import { buildPageMetadata } from "@/lib/seo";
import { BlaeserheftItem } from "./_components/blaeserheft-item";

export const metadata = buildPageMetadata({
  title: "Literatur & CDs",
  description:
    "Noten, Bläserhefte, Literaturempfehlungen und CDs des Posaunenwerks Rheinland für Posaunenchöre und Jungbläser.",
  path: "/materialien/literatur",
});

/** Fließtext der Seite: Tinte, ruhige Zeilenlänge. */
const PROSE =
  "text-ink dark:text-night-text max-w-[65ch] space-y-4 text-lg leading-relaxed";

const KAPITEL_SCHWERPUNKTE = [
  "Bearbeitungen von Werken großer Komponisten",
  "Neue Vorspiele und Begleitsätze zu Gesangbuchliedern",
  "Exklusive Auftragskompositionen renommierter Komponisten",
  "Populäre Melodien aus Film, Musical und Popmusik",
];

export default async function LiteraturPage() {
  const blaesherhefte = await api.materials.getBlaserhefte();

  return (
    <PublicPage
      title="Literatur & CDs"
      heroTitle="Bläserliteratur und CDs"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Materialien", href: "/materialien" },
        { label: "Literatur & CDs" },
      ]}
      description={
        <p>
          Entdecken Sie unsere Reihe &quot;Musik aus ...&quot; mit hochwertiger
          Bläserliteratur aus verschiedenen Ländern und Regionen. Jede Ausgabe
          bietet eine Mischung aus klassischen Meisterwerken,
          Choralbearbeitungen und zeitgenössischen Auftragskompositionen.
        </p>
      }
    >
      <PageSection labelledBy="hefte-info-heading">
        <Split
          head={
            <Heading id="hefte-info-heading">Rheinische Bläserhefte</Heading>
          }
          bodyClassName="mt-8 space-y-8"
        >
          <div className={PROSE}>
            <p>
              Die Rheinischen Bläserhefte erscheinen regelmäßig und bieten
              jeweils eine umfangreiche Sammlung von Musik aus einem bestimmten
              Land oder einer Region. Jedes Heft umfasst mehrere Kapitel mit
              verschiedenen musikalischen Schwerpunkten:
            </p>
          </div>

          <ul className="border-ink dark:border-night-text border-t-2">
            {KAPITEL_SCHWERPUNKTE.map((punkt) => (
              <li
                key={punkt}
                className="border-rule dark:border-night-rule text-ink dark:text-night-text flex gap-3 border-b px-1 py-3 text-lg leading-snug"
              >
                <span
                  aria-hidden
                  className="bg-ink dark:bg-night-text mt-2 h-2 w-2 shrink-0"
                />
                {punkt}
              </li>
            ))}
          </ul>

          <div className={PROSE}>
            <p>
              Ergänzend zu jedem Bläserheft erscheinen Beihefte mit
              Kurzandachten, ausgearbeiteten Gottesdiensten und
              Konzertbausteinen sowie CDs mit Einspielungen durch unser
              Auswahlensemble Con Spirito.
            </p>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="hefte-heading" rule>
        <Split
          head={<Heading id="hefte-heading">Unsere Bläserhefte</Heading>}
          bodyClassName="mt-10"
        >
          {blaesherhefte.map((heft, index) => (
            <BlaeserheftItem
              key={heft.id}
              heft={heft}
              reverse={index % 2 !== 0}
              divider={index > 0}
            />
          ))}
        </Split>
      </PageSection>

      <ClosingCall
        id="bestellung-heading"
        title="Bestellung"
        text="Die Bläserhefte sowie dazu erschienene CDs mit jeweils einer Auswahl von Stücken aus dem Heft sowie Begleitmaterial für Konzerte und Gottesdienste können über die Geschäftsstelle oder den einschlägigen Musikalienhandel bezogen werden."
        actions={[
          { href: "/kontakt", label: "Geschäftsstelle kontaktieren" },
          { href: "/materialien", label: "Zurück zu Materialien" },
        ]}
      />
    </PublicPage>
  );
}
