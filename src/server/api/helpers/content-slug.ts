import { TRPCError } from "@trpc/server";
import type { db as database } from "@/server/db";
import {
  datedSlugBase,
  ensembleSlugBase,
  SLUG_PROBLEM_MESSAGES,
  slugify,
  slugProblem,
  uniqueSlug,
} from "@/lib/slug";

type Db = typeof database;

/** Whether some other row already holds this slug. */
type IsTaken = (candidate: string) => Promise<boolean>;

/**
 * Validates a slug an author typed and confirms it is still free.
 *
 * A typed slug is taken literally rather than de-duplicated: silently turning
 * "adventskonzert" into "adventskonzert-2" would publish a URL they did not
 * choose. The clash is reported instead, so they can pick another.
 */
async function checkedSlug(requested: string, isTaken: IsTaken) {
  const slug = requested.trim();

  const problem = slugProblem(slug);
  if (problem) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: SLUG_PROBLEM_MESSAGES[problem],
    });
  }

  if (await isTaken(slug)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `Der Slug „${slug}" ist bereits vergeben.`,
    });
  }

  return slug;
}

/**
 * Slugs are derived from the title at creation and never regenerated on edit.
 *
 * A slug is part of a published URL: rewriting it when someone fixes a typo in
 * a headline would break every link already shared and every result Google has
 * indexed. Renaming stays possible, but only as a deliberate act — the author
 * types the new slug into the form, which warns them what it costs.
 */
export async function createPostSlug(
  db: Db,
  title: string,
  requested?: string | null,
): Promise<string> {
  const isTaken: IsTaken = async (candidate) =>
    (await db.post.count({ where: { slug: candidate } })) > 0;

  return requested?.trim()
    ? checkedSlug(requested, isTaken)
    : uniqueSlug(slugify(title), isTaken, "beitrag");
}

export async function updatePostSlug(
  db: Db,
  postId: string,
  requested: string,
): Promise<string> {
  return checkedSlug(
    requested,
    async (candidate) =>
      (await db.post.count({
        where: { slug: candidate, NOT: { id: postId } },
      })) > 0,
  );
}

export async function createEnsembleSlug(
  db: Db,
  name: string,
  city: string | null | undefined,
  requested?: string | null,
): Promise<string> {
  const isTaken: IsTaken = async (candidate) =>
    (await db.ensemble.count({ where: { slug: candidate } })) > 0;

  return requested?.trim()
    ? checkedSlug(requested, isTaken)
    : uniqueSlug(ensembleSlugBase(name, city), isTaken, "chor");
}

export async function updateEnsembleSlug(
  db: Db,
  ensembleId: string,
  requested: string,
): Promise<string> {
  return checkedSlug(
    requested,
    async (candidate) =>
      (await db.ensemble.count({
        where: { slug: candidate, NOT: { id: ensembleId } },
      })) > 0,
  );
}

/**
 * Events and courses carry the year of the Termin, so the annual repeats of
 * "Adventskonzert" stay tellable apart; see `datedSlugBase`.
 */
export async function createEventSlug(
  db: Db,
  title: string,
  eventDate: Date,
  requested?: string | null,
): Promise<string> {
  const isTaken: IsTaken = async (candidate) =>
    (await db.event.count({ where: { slug: candidate } })) > 0;

  return requested?.trim()
    ? checkedSlug(requested, isTaken)
    : uniqueSlug(datedSlugBase(title, eventDate), isTaken, "termin");
}

export async function updateEventSlug(
  db: Db,
  eventId: string,
  requested: string,
): Promise<string> {
  return checkedSlug(
    requested,
    async (candidate) =>
      (await db.event.count({
        where: { slug: candidate, NOT: { id: eventId } },
      })) > 0,
  );
}

export async function createCourseSlug(
  db: Db,
  title: string,
  startDate: Date,
  requested?: string | null,
): Promise<string> {
  const isTaken: IsTaken = async (candidate) =>
    (await db.course.count({ where: { slug: candidate } })) > 0;

  return requested?.trim()
    ? checkedSlug(requested, isTaken)
    : uniqueSlug(datedSlugBase(title, startDate), isTaken, "kurs");
}

export async function updateCourseSlug(
  db: Db,
  courseId: string,
  requested: string,
): Promise<string> {
  return checkedSlug(
    requested,
    async (candidate) =>
      (await db.course.count({
        where: { slug: candidate, NOT: { id: courseId } },
      })) > 0,
  );
}
