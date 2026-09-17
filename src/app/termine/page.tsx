import { Suspense } from "react";
import EventsClient from "../_components/events/events-client";
import PublicPage from "../_components/general/public-page";
import { getTerminePageData } from "@/lib/termine-page-data";
import { buildPageMetadata } from "@/lib/seo";

async function TermineBody() {
  const data = await getTerminePageData();
  return (
    <EventsClient
      initialCourses={data.initialCourses}
      initialEvents={data.initialEvents}
      bezirke={data.bezirke}
    />
  );
}

export const metadata = buildPageMetadata({
  title: "Termine",
  description:
    "Konzerte, Gottesdienste, Rüstzeiten und Lehrgänge des Posaunenwerks Rheinland — filterbar nach Bezirk, Kategorie und Zeitraum.",
  path: "/termine",
});

export default function TerminePage() {
  return (
    <Suspense
      fallback={
        // Gleicher Seitenkopf wie EventsClient, damit beim Laden nichts springt.
        <PublicPage
          title="Termine"
          breadcrumbs={[{ label: "Start", href: "/" }, { label: "Termine" }]}
          description={<p>Alle Konzerte, Gottesdienste und Lehrgänge</p>}
        >
          <p
            aria-live="polite"
            className="sheet text-dark dark:text-night-muted py-8"
          >
            Lade Termine und Filter...
          </p>
        </PublicPage>
      }
    >
      <TermineBody />
    </Suspense>
  );
}
