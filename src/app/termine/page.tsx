import { Suspense } from "react";
import { api } from "@/trpc/server";
import EventsClient from "../_components/events/events-client";

export default async function TerminePage() {
  const now = new Date();

  const [eventsData, coursesData, bezirkeData] = await Promise.all([
    api.events.getAll({
      page: 1,
      limit: 100,
      startDate: new Date(now.getFullYear() - 1, 0, 1),
    }),
    api.courses.getAll({
      page: 1,
      limit: 100,
    }),
    api.bezirke.getAll(),
  ]);

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
      <EventsClient
        initialCourses={coursesData.courses}
        initialEvents={eventsData.events}
        bezirke={bezirkeData}
      />
    </Suspense>
  );
}
