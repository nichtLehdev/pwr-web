import HomepageClient from "./_components/homepage/homepage-client";
import { api, HydrateClient } from "@/trpc/server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Posaunenwerk Rheinland — Evangelische Bläserarbeit im Rheinland",
  titleAbsolute: true,
  description:
    "Posaunenwerk der Evangelischen Kirche im Rheinland — Termine, Lehrgänge, Nachrichten und Posaunenchöre in 13 Bezirken.",
  path: "/",
});

/**
 * Server wrapper so the homepage can export metadata (canonical "/" can't live in
 * the root layout). Prefetches are awaited so events and posts land in the initial
 * HTML; `prefetch` swallows errors, falling back to the client-side fetch.
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
