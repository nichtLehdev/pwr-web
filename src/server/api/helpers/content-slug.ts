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
 * A typed slug is taken literally, not de-duplicated: a clash is reported rather
 * than publishing a URL the author did not choose.
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
 * Derived at creation, never regenerated on edit: that would break shared links and
 * indexed results. Renaming is a deliberate act in the form.
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

/**
 * Ein besetzter Slug darf den Import nicht abbrechen: Der exportierte Slug wird übernommen,
 * wenn er frei und gültig ist, sonst entsteht ein neuer wie beim Anlegen.
 */
async function importedSlug(
  requested: unknown,
  base: string,
  fallback: string,
  isTaken: IsTaken,
): Promise<string> {
  const candidate = typeof requested === "string" ? requested.trim() : "";
  if (candidate && !slugProblem(candidate) && !(await isTaken(candidate))) {
    return candidate;
  }
  return uniqueSlug(base, isTaken, fallback);
}

export async function importPostSlug(
  db: Db,
  title: string,
  requested: unknown,
): Promise<string> {
  const isTaken: IsTaken = async (candidate) =>
    (await db.post.count({ where: { slug: candidate } })) > 0;

  return importedSlug(requested, slugify(title), "beitrag", isTaken);
}

export async function importEventSlug(
  db: Db,
  title: string,
  eventDate: Date,
  requested: unknown,
): Promise<string> {
  const isTaken: IsTaken = async (candidate) =>
    (await db.event.count({ where: { slug: candidate } })) > 0;

  return importedSlug(
    requested,
    datedSlugBase(title, eventDate),
    "termin",
    isTaken,
  );
}

export async function importCourseSlug(
  db: Db,
  title: string,
  startDate: Date,
  requested: unknown,
): Promise<string> {
  const isTaken: IsTaken = async (candidate) =>
    (await db.course.count({ where: { slug: candidate } })) > 0;

  return importedSlug(
    requested,
    datedSlugBase(title, startDate),
    "kurs",
    isTaken,
  );
}
