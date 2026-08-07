import type { db as database } from "@/server/db";
import { ensembleSlugBase, slugify, uniqueSlug } from "@/lib/slug";

type Db = typeof database;

/**
 * Slugs are minted once, at creation, and never regenerated on edit.
 *
 * A slug is part of a published URL: rewriting it when someone fixes a typo in
 * a headline would break every link already shared and every result Google has
 * indexed. Renaming is a deliberate act, not a side effect of editing.
 */
export async function createPostSlug(db: Db, title: string): Promise<string> {
  return uniqueSlug(
    slugify(title),
    async (candidate) =>
      (await db.post.count({ where: { slug: candidate } })) > 0,
    "beitrag",
  );
}

export async function createEnsembleSlug(
  db: Db,
  name: string,
  city: string | null | undefined,
): Promise<string> {
  return uniqueSlug(
    ensembleSlugBase(name, city),
    async (candidate) =>
      (await db.ensemble.count({ where: { slug: candidate } })) > 0,
    "chor",
  );
}
