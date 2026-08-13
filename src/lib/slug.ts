/** Slug length cap — long enough to stay readable, short enough for a URL bar. */
export const MAX_SLUG_LENGTH = 80;

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
 * The year of a date as it falls in German local time.
 *
 * Pinned to Europe/Berlin rather than read off `getFullYear()`, which follows
 * whatever timezone the server runs in — UTC in the container. A Neujahrsblasen
 * at 00:30 on 1.1. is still 31.12. in UTC, and a slug reading
 * `neujahrsblasen-2026` for a 2027 Termin is worse than no year at all.
 */
function berlinYear(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(date);
}

/**
 * Slug base for a dated entry (event or course), appending the year unless the
 * title already carries it.
 *
 * Termine repeat: "Adventskonzert" and "Jungbläserlehrgang" come round every
 * year. Without the year the second one lands on `adventskonzert-2`, which
 * tells a reader nothing — `adventskonzert-2026` tells them which one it is.
 * Titles like "Landesposaunentag 2026" already state it, so the year is only
 * added when it is not among the slug's tokens.
 */
export function datedSlugBase(title: string, date: Date): string {
  const titleSlug = slugify(title);
  // No title to build on — the caller's fallback is better than a bare year.
  if (!titleSlug) return "";

  const year = berlinYear(date);
  if (titleSlug.split("-").includes(year)) return titleSlug;

  return `${titleSlug}-${year}`;
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

export function eventPath(event: { id: string; slug?: string | null }): string {
  return `/termine/event/${event.slug ?? event.id}`;
}

export function coursePath(course: {
  id: string;
  slug?: string | null;
}): string {
  return `/termine/course/${course.slug ?? course.id}`;
}

/** Registration form for a course; same identifier rules as `coursePath`. */
export function courseRegistrationPath(course: {
  id: string;
  slug?: string | null;
}): string {
  return `${coursePath(course)}/anmelden`;
}

/**
 * What is wrong with a slug someone typed, or `null` when it is usable.
 *
 * Shared by the dashboard form and the tRPC procedures so the browser and the
 * server never disagree about what counts as a valid slug.
 */
export type SlugProblem = "empty" | "tooLong" | "format" | "uuidLike";

export function slugProblem(value: string): SlugProblem | null {
  if (!value) return "empty";
  if (value.length > MAX_SLUG_LENGTH) return "tooLong";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return "format";
  // A UUID passes the pattern above, but the detail routes resolve anything
  // UUID-shaped as an id — such a slug would address nothing.
  if (isUuid(value)) return "uuidLike";
  return null;
}

export const SLUG_PROBLEM_MESSAGES: Record<SlugProblem, string> = {
  empty: "Bitte gib einen Slug ein.",
  tooLong: `Der Slug darf höchstens ${MAX_SLUG_LENGTH} Zeichen lang sein.`,
  format:
    "Erlaubt sind nur Kleinbuchstaben, Ziffern und Bindestriche — keine Umlaute, Leerzeichen oder Sonderzeichen.",
  uuidLike: "Der Slug darf nicht wie eine UUID aussehen.",
};

/**
 * Cleans up a slug as it is being typed.
 *
 * Deliberately gentler than `slugify`: a trailing dash survives, because
 * stripping it would make "advents-" impossible to extend to
 * "advents-konzert" — the dash would vanish on every keystroke.
 */
export function normalizeSlugInput(value: string): string {
  let text = value.toLowerCase();

  for (const [pattern, replacement] of TRANSLITERATIONS) {
    text = text.replace(pattern, replacement);
  }

  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .slice(0, MAX_SLUG_LENGTH);
}

/** UUIDs are the legacy identifier; both forms resolve on the detail routes. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
