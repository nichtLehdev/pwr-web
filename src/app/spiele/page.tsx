import PublicPage from "@/app/_components/general/public-page";
import {
  PageSection,
  Split,
} from "@/app/_components/programmheft/page-section";
import { Heading } from "@/app/_components/programmheft/section-head";
import { GameHub, GameRows } from "./_components/game-hub";
import { OfflineMenu } from "./_components/offline-menu";
import { StatsSyncRunner } from "./_components/stats-sync-runner";
import { ProfilesProvider } from "./_components/profiles";
import { LeagueCard, WeeklyTasksCard } from "./_components/league";
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
          Lerne Noten, Griffe und Rhythmen mit Toni – auf spielerische Art,
          direkt im Browser.
        </p>
      }
    >
      <PageSection>
        <ProfilesProvider>
          <GameHub />
          {/* Nebeneinander, sobald Platz ist; eine einzelne Karte nimmt die volle Breite. */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] items-start gap-x-10">
            <LeagueCard />
            <WeeklyTasksCard />
          </div>
          <OfflineMenu />
          <StatsSyncRunner />

          <div className="mt-10">
            <Split
              head={<Heading id="angebote-heading">Angebote</Heading>}
              bodyClassName="mt-8"
            >
              <GameRows labelledBy="angebote-heading" />
            </Split>
          </div>
        </ProfilesProvider>
      </PageSection>
    </PublicPage>
  );
}
