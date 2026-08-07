/** Slug length cap — long enough to stay readable, short enough for a URL bar. */
const MAX_SLUG_LENGTH = 80;

/**
 * German umlauts are transliterated rather than stripped: NFD normalisation
 * alone turns "Jungbläser" into "jungblaser", which reads wrong and loses the
 * keyword people actually search for ("jungblaeser").
 */
const TRANSLITERATIONS: Array<[RegExp, string]> = [
  [/ä/g, "ae"],
  [/ö/g, "oe"],
  [/ü/g, "ue"],
  [/ß/g, "ss"],
  [/&/g, "-und-"],
];

/**
 * Turns a title into a URL-safe slug.
 *
 * Returns an empty string when nothing usable survives (a title of only
 * punctuation or non-Latin script) — callers decide what to fall back to.
 */
export function slugify(input: string): string {
  let text = input.toLowerCase();

  for (const [pattern, replacement] of TRANSLITERATIONS) {
    text = text.replace(pattern, replacement);
  }

  text = text
    // Strips the diacritics left after transliteration (é, ç, å …).
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (text.length <= MAX_SLUG_LENGTH) return text;

  // Cut on a separator so the slug never ends mid-word.
  const cut = text.slice(0, MAX_SLUG_LENGTH);
  const lastDash = cut.lastIndexOf("-");
  return (
    lastDash > MAX_SLUG_LENGTH / 2 ? cut.slice(0, lastDash) : cut
  ).replace(/-+$/, "");
}

/**
 * Appends `-2`, `-3` … until the slug is free.
 *
 * `isTaken` is passed in rather than queried here so the caller controls which
 * table is checked and can exclude the row being updated from the check.
 */
export async function uniqueSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
  fallback: string,
): Promise<string> {
  const root = base || fallback;

  if (!(await isTaken(root))) return root;

  for (let suffix = 2; suffix < 1000; suffix++) {
    const candidate = `${root}-${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }

  throw new Error(`Could not find a free slug for "${root}"`);
}

/**
 * Tokens too short or too generic to prove a town is already named.
 * "an", "der", "am" appear in half the Ortsnamen in the Rheinland.
 */
const MIN_PLACE_TOKEN_LENGTH = 4;

/**
 * Slug base for an ensemble, appending the town only when the name does not
 * already carry it.
 *
 * Most chöre are named after their town, so appending blindly yields
 * "posaunenchor-voerde-voerde". Overlap is checked per token rather than as a
 * substring because the town in the name is often only part of the location's
 * city: "Posaunenchor Orsoy" sits in "Rheinberg-Orsoy".
 */
export function ensembleSlugBase(
  name: string,
  city: string | null | undefined,
): string {
  const nameSlug = slugify(name);
  if (!city) return nameSlug;

  const citySlug = slugify(city);
  if (!citySlug) return nameSlug;

  const nameTokens = new Set(nameSlug.split("-"));
  const alreadyNamed = citySlug
    .split("-")
    .filter((token) => token.length >= MIN_PLACE_TOKEN_LENGTH)
    .some((token) => nameTokens.has(token));

  return alreadyNamed ? nameSlug : `${nameSlug}-${citySlug}`;
}

/**
 * Public path for a post or ensemble, preferring the slug.
 *
 * Falls back to the UUID so a row created before `pnpm backfill:slugs` ran —
 * or imported straight into the database — still links somewhere valid; the
 * detail routes accept both.
 */
export function postPath(post: { id: string; slug?: string | null }): string {
  return `/aktuelles/${post.slug ?? post.id}`;
}

export function ensemblePath(ensemble: {
  id: string;
  slug?: string | null;
}): string {
  return `/ensembles/${ensemble.slug ?? ensemble.id}`;
}

/** UUIDs are the legacy identifier; both forms resolve on the detail routes. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
