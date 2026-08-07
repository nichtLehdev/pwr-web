import HomepageClient from "./_components/homepage/homepage-client";
import { api, HydrateClient } from "@/trpc/server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Posaunenwerk Rheinland — Evangelische Bläserarbeit im Rheinland",
  titleAbsolute: true,
  description:
    "Evangelisches Posaunenwerk in der Evangelischen Kirche im Rheinland — Termine, Lehrgänge, Nachrichten und Posaunenchöre in 13 Bezirken.",
  path: "/",
});

/**
 * Server wrapper around the client homepage.
 *
 * The page needs hooks, but a client component cannot export metadata — and
 * the canonical cannot live in the root layout either, since every child route
 * would inherit "/" and declare itself a duplicate of the homepage.
 *
 * The prefetches are awaited rather than fired with `void`: only resolved
 * queries are in the cache by the time the client component server-renders, so
 * awaiting is what puts the actual events and posts into the initial HTML
 * instead of a loading spinner. `prefetch` swallows its errors, so a database
 * hiccup degrades to the client-side fetch rather than failing the page.
 */
export default async function Home() {
  const startDate = new Date();

  await Promise.all([
    api.homepage.getCarouselItems.prefetch(),
    api.events.getAll.prefetch({ page: 1, limit: 4, startDate }),
    api.posts.getAll.prefetch({ page: 1, limit: 3 }),
    api.courses.getAll.prefetch({ page: 1, limit: 100, upcoming: true }),
  ]);

  return (
    <HydrateClient>
      <HomepageClient startDate={startDate} />
    </HydrateClient>
  );
}
