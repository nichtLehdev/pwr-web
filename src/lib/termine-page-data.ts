import { cache } from "react";
import { api } from "@/trpc/server";

export const getTerminePageData = cache(async () => {
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

  return {
    initialCourses: coursesData.courses,
    initialEvents: eventsData.events,
    bezirke: bezirkeData,
  };
});
