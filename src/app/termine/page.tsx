import { Suspense } from "react";
import EventsClient from "../_components/events/events-client";
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
        <div className="bg-background dark:bg-dark-background min-h-screen">
          <div className="bg-primary dark:bg-primary-dark py-6 text-white md:py-12 lg:py-16">
            <div className="container mx-auto px-4">
              <h1 className="mb-2 text-2xl font-bold md:mb-4 md:text-4xl lg:text-5xl">
                Termine
              </h1>
            </div>
          </div>
          <div className="container mx-auto px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            Lade Termine und Filter...
          </div>
        </div>
      }
    >
      <TermineBody />
    </Suspense>
  );
}
