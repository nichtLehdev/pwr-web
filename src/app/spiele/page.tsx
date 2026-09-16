import PublicPage from "@/app/_components/general/public-page";
import { Note } from "@/app/_components/programmheft/note";
import {
  PageSection,
  Split,
} from "@/app/_components/programmheft/page-section";
import { Heading } from "@/app/_components/programmheft/section-head";
import { Tag } from "@/app/_components/programmheft/tag";
import { WayList, WayRow } from "@/app/_components/programmheft/way-list";
import { GAMES, UPCOMING_GAMES } from "./_lib/games";
import { InstallHintCard } from "./_components/install-hint-card";
import { OfflineReadyCard } from "./_components/offline-ready-card";
import { StatsSyncRunner } from "./_components/stats-sync-runner";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Spiele & Übungen",
  description:
    "Interaktive Übungen des Posaunenwerks Rheinland: Noten lesen, Griffe, Rhythmus und Notenwaage — kostenlos im Browser trainieren.",
  path: "/spiele",
});

export default function SpielePage() {
  return (
    <PublicPage
      title="Spiele"
      heroTitle="Spiele & Übungen"
      breadcrumbs={[{ label: "Start", href: "/" }, { label: "Spiele" }]}
      description={
        <p>
          Kleine interaktive Übungen zum Mitmachen — ohne Anmeldung, direkt im
          Browser.
        </p>
      }
    >
      <PageSection>
        <Note tone="info" className="mb-8">
          Alle Spiele befinden sich derzeit in einer frühen Entwicklungsphase
          und können sich noch ändern. Schwierigkeitsstufen werden später
          angepasst.
        </Note>
        <InstallHintCard />
        <OfflineReadyCard />
        <StatsSyncRunner />

        <div className="mt-10">
          <Split
            head={<Heading id="angebote-heading">Angebote</Heading>}
            bodyClassName="mt-8"
          >
            <WayList labelledBy="angebote-heading" columns={2}>
              {GAMES.map((game) => (
                <WayRow
                  key={game.slug}
                  href={`/spiele/${game.slug}`}
                  title={game.cardTitle}
                  description={game.cardDescription}
                />
              ))}
              {UPCOMING_GAMES.map((game) => (
                <WayRow
                  key={game.cardTitle}
                  title={game.cardTitle}
                  description={game.cardDescription}
                  status={<Tag>Demnächst</Tag>}
                />
              ))}
            </WayList>
          </Split>
        </div>
      </PageSection>
    </PublicPage>
  );
}
