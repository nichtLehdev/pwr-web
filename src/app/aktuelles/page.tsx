import AktuellesClient from "@/app/_components/posts/aktuelles-client";
import { api, HydrateClient } from "@/trpc/server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Aktuelles",
  description:
    "Nachrichten, Berichte und Ankündigungen aus dem Posaunenwerk Rheinland und seinen 13 Bezirken.",
  path: "/aktuelles",
});

/**
 * Prefetches the posts so headlines are in the initial HTML. Inputs must match
 * the client's queries exactly, or the query key differs and the prefetch is wasted.
 */
export default async function AktuellesPage() {
  await Promise.all([
    api.posts.getAll.prefetch({ page: 1, limit: 100 }),
    api.bezirke.getAll.prefetch(),
  ]);

  return (
    <HydrateClient>
      <AktuellesClient />
    </HydrateClient>
  );
}
