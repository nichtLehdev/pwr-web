/**
 * Fills missing slugs on Posts, Ensembles, Events and Courses (safe to rerun). Duplicates and
 * imports deliberately leave `slug` null. Ensembles get the town (chor names repeat), events
 * and courses the year ("Adventskonzert" every December).
 * Usage: npx tsx prisma/backfill-slugs.ts
 */
import "dotenv/config";
import { db } from "@/server/db";
import {
  datedSlugBase,
  ensembleSlugBase,
  slugify,
  uniqueSlug,
} from "@/lib/slug";

async function backfillPosts() {
  const posts = await db.post.findMany({
    where: { slug: null },
    select: { id: true, title: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Posts without a slug: ${posts.length}`);

  for (const post of posts) {
    const slug = await uniqueSlug(
      slugify(post.title),
      async (candidate) =>
        (await db.post.count({ where: { slug: candidate } })) > 0,
      `beitrag-${post.id.slice(0, 8)}`,
    );

    await db.post.update({ where: { id: post.id }, data: { slug } });
    console.log(`  ${post.title} -> ${slug}`);
  }
}

async function backfillEnsembles() {
  const ensembles = await db.ensemble.findMany({
    where: { slug: null },
    select: { id: true, name: true, location: { select: { city: true } } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Ensembles without a slug: ${ensembles.length}`);

  for (const ensemble of ensembles) {
    const slug = await uniqueSlug(
      ensembleSlugBase(ensemble.name, ensemble.location?.city),
      async (candidate) =>
        (await db.ensemble.count({ where: { slug: candidate } })) > 0,
      `chor-${ensemble.id.slice(0, 8)}`,
    );

    await db.ensemble.update({ where: { id: ensemble.id }, data: { slug } });
    console.log(`  ${ensemble.name} -> ${slug}`);
  }
}

async function backfillEvents() {
  const events = await db.event.findMany({
    where: { slug: null },
    select: { id: true, title: true, eventDate: true },
    orderBy: { eventDate: "asc" },
  });

  console.log(`Events without a slug: ${events.length}`);

  for (const event of events) {
    const slug = await uniqueSlug(
      datedSlugBase(event.title, event.eventDate),
      async (candidate) =>
        (await db.event.count({ where: { slug: candidate } })) > 0,
      `termin-${event.id.slice(0, 8)}`,
    );

    await db.event.update({ where: { id: event.id }, data: { slug } });
    console.log(`  ${event.title} -> ${slug}`);
  }
}

async function backfillCourses() {
  const courses = await db.course.findMany({
    where: { slug: null },
    select: { id: true, title: true, startDate: true },
    orderBy: { startDate: "asc" },
  });

  console.log(`Courses without a slug: ${courses.length}`);

  for (const course of courses) {
    const slug = await uniqueSlug(
      datedSlugBase(course.title, course.startDate),
      async (candidate) =>
        (await db.course.count({ where: { slug: candidate } })) > 0,
      `kurs-${course.id.slice(0, 8)}`,
    );

    await db.course.update({ where: { id: course.id }, data: { slug } });
    console.log(`  ${course.title} -> ${slug}`);
  }
}

async function main() {
  await backfillPosts();
  await backfillEnsembles();
  await backfillEvents();
  await backfillCourses();
  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
