import type { Prisma } from "~/generated/prisma/client";

/**
 * Pure readers for the ensemble import payload. Nothing here touches the
 * database or the network, so the parsing rules stay unit-testable; the
 * Location lookup that needs both lives in the import route.
 */

/**
 * The address block an ensemble may carry instead of a `locationId`, so a
 * sheet of chors can be imported without creating every Probenort by hand.
 */
export type ImportLocation = {
  name?: string | null;
  street?: string | null;
  zipCode?: string | null;
  city?: string | null;
  country?: string | null;
  additionalInfo?: string | null;
};

export function trimmed(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Matches an existing row on the address only; the name is decoration. A part
 * the import left out has to match SQL NULL, so it cannot carry `mode`.
 */
export function addressFilter(value: string | null) {
  return value ? { equals: value, mode: "insensitive" as const } : null;
}

/** Same address written two ways still resolves to one Location per run. */
export function locationCacheKey(location: {
  street: string | null;
  zipCode: string | null;
  city: string;
  country: string | null;
}): string {
  return [location.street, location.zipCode, location.city, location.country]
    .map((part) => part?.toLowerCase() ?? "")
    .join("|");
}

/** Drops entries the SocialIcon switch could not render anyway. */
export function readSocials(raw: unknown): Prisma.InputJsonValue | undefined {
  if (!Array.isArray(raw)) return undefined;

  const links = raw.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const { type, url, label } = entry as Record<string, unknown>;
    const cleanUrl = trimmed(url);
    if (!cleanUrl) return [];
    const cleanLabel = trimmed(label);
    return [
      {
        type: trimmed(type) ?? "website",
        url: cleanUrl,
        ...(cleanLabel ? { label: cleanLabel } : {}),
      },
    ];
  });

  return links.length > 0 ? links : undefined;
}

/** A schedule needs both halves to say anything, so half-filled rows go. */
export function readRehearsalSchedules(
  raw: unknown,
): Array<{ day: string; time: string }> {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const { day, time } = entry as Record<string, unknown>;
    const cleanDay = trimmed(day);
    const cleanTime = trimmed(time);
    return cleanDay && cleanTime ? [{ day: cleanDay, time: cleanTime }] : [];
  });
}
