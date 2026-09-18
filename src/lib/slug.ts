/** Slug length cap — long enough to stay readable, short enough for a URL bar. */
export const MAX_SLUG_LENGTH = 80;

/** Transliterated, not stripped: NFD alone turns "Jungbläser" into "jungblaser". */
const TRANSLITERATIONS: Array<[RegExp, string]> = [
  [/ä/g, "ae"],
  [/ö/g, "oe"],
  [/ü/g, "ue"],
  [/ß/g, "ss"],
  [/&/g, "-und-"],
];

/** Empty string when nothing usable survives — callers decide on the fallback. */
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
 * Appends `-2`, `-3` … until free. `isTaken` is injected so the caller picks the
 * table and can exclude the row being updated.
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
 * Appends the town only if the name lacks it ("posaunenchor-voerde-voerde"). Checked
 * per token, since "Posaunenchor Orsoy" sits in "Rheinberg-Orsoy".
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
 * Not `getFullYear()`: the server runs in UTC, where a Neujahrsblasen at 00:30
 * on 1.1. still falls in the previous year.
 */
function berlinYear(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(date);
}

/**
 * Appends the year unless the title has it: recurring Termine become
 * `adventskonzert-2026` instead of an uninformative `adventskonzert-2`.
 */
export function datedSlugBase(title: string, date: Date): string {
  const titleSlug = slugify(title);
  // No title to build on — the caller's fallback is better than a bare year.
  if (!titleSlug) return "";

  const year = berlinYear(date);
  if (titleSlug.split("-").includes(year)) return titleSlug;

  return `${titleSlug}-${year}`;
}

/** Falls back to the UUID for rows without a slug; the detail routes accept both. */
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

/** Shared by dashboard form and tRPC, so browser and server agree on valid slugs. */
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
 * For typing; gentler than `slugify`: a trailing dash survives, or "advents-"
 * could never be extended to "advents-konzert".
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
