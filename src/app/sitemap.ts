import type { MetadataRoute } from "next";
import { db } from "@/server/db";
import { ContentStatus } from "~/generated/prisma/client";
import { siteUrl } from "@/lib/seo";

/**
 * Regenerated hourly rather than pinned at build time — posts and events are
 * published from the dashboard, not by a deploy.
 */
export const revalidate = 3600;

/** Public routes that exist as files; everything else is content-driven. */
const STATIC_ROUTES: Array<{ path: string; priority: number }> = [
  { path: "/", priority: 1 },
  { path: "/aktuelles", priority: 0.9 },
  { path: "/termine", priority: 0.9 },
  { path: "/ueber-uns", priority: 0.7 },
  { path: "/ueber-uns/struktur", priority: 0.6 },
  { path: "/ueber-uns/bezirke", priority: 0.6 },
  { path: "/ueber-uns/vorstand", priority: 0.5 },
  { path: "/ueber-uns/posaunenrat", priority: 0.5 },
  { path: "/ueber-uns/posaunenwarte", priority: 0.5 },
  { path: "/ueber-uns/auswahlchoere", priority: 0.6 },
  { path: "/mitmachen", priority: 0.8 },
  { path: "/mitmachen/chor-finden", priority: 0.8 },
  { path: "/mitmachen/jungblaeser", priority: 0.7 },
  { path: "/mitmachen/bildung", priority: 0.7 },
  { path: "/mitmachen/ehrenamt", priority: 0.6 },
  { path: "/materialien", priority: 0.7 },
  { path: "/materialien/literatur", priority: 0.6 },
  { path: "/materialien/blechblatt", priority: 0.6 },
  { path: "/foerderverein", priority: 0.6 },
  { path: "/newsletter", priority: 0.5 },
  { path: "/kontakt", priority: 0.7 },
  { path: "/spiele", priority: 0.6 },
  { path: "/spiele/griffe", priority: 0.5 },
  { path: "/spiele/noten-lesen", priority: 0.5 },
  { path: "/spiele/notenwaage", priority: 0.5 },
  { path: "/spiele/rhythmus", priority: 0.5 },
  { path: "/impressum", priority: 0.3 },
  { path: "/datenschutz", priority: 0.3 },
];

/**
 * Events and courses older than this are dropped: the pages stay reachable,
 * but a sitemap that grows without bound spends the site's crawl budget on
 * Rüstzeiten from a decade ago.
 */
function archiveCutoff(): Date {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 2);
  return cutoff;
}

async function contentEntries(): Promise<MetadataRoute.Sitemap> {
  const cutoff = archiveCutoff();

  const [posts, events, courses, ensembles] = await Promise.all([
    db.post.findMany({
      where: { status: ContentStatus.APPROVED },
      select: { id: true, updatedAt: true },
    }),
    db.event.findMany({
      where: { status: ContentStatus.APPROVED, eventDate: { gte: cutoff } },
      select: { id: true, updatedAt: true },
    }),
    db.course.findMany({
      where: { status: ContentStatus.APPROVED, endDate: { gte: cutoff } },
      select: { id: true, updatedAt: true },
    }),
    db.ensemble.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true },
    }),
  ]);

  return [
    ...posts.map((post) => ({
      url: siteUrl(`/aktuelles/${post.id}`),
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...events.map((event) => ({
      url: siteUrl(`/termine/event/${event.id}`),
      lastModified: event.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...courses.map((course) => ({
      url: siteUrl(`/termine/course/${course.id}`),
      lastModified: course.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...ensembles.map((ensemble) => ({
      url: siteUrl(`/ensembles/${ensemble.id}`),
      lastModified: ensemble.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: siteUrl(route.path),
    changeFrequency: "weekly",
    priority: route.priority,
  }));

  try {
    return [...staticEntries, ...(await contentEntries())];
  } catch (error) {
    // A sitemap listing the static routes beats a 500 during a build that
    // cannot reach the database.
    console.error("[sitemap] Could not load content entries:", error);
    return staticEntries;
  }
}
