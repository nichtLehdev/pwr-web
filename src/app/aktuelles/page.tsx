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
 * Server wrapper: the list itself is client-side (filters, RSS modal), but the
 * posts are prefetched and awaited so the article headlines are in the initial
 * HTML rather than behind a spinner. Inputs mirror the client's queries
 * exactly — a differing input is a differing query key, and the prefetch would
 * be dead weight.
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
