import { Resolver } from "node:dns/promises";

import { createLogger } from "./logger";

const log = createLogger("Email Domain");

const POSITIVE_TTL_MS = 24 * 60 * 60 * 1000;
const NEGATIVE_TTL_MS = 60 * 60 * 1000;

/** Eigener Resolver: `resolveMx` kennt sonst kein Zeitlimit. */
const resolver = new Resolver({ timeout: 3000, tries: 2 });

/** Die Domain existiert nicht — alles andere ist eine Störung der Auflösung. */
const NOT_FOUND_CODES = new Set(["ENOTFOUND", "ENODATA", "NXDOMAIN"]);

const cache = new Map<string, { deliverable: boolean; until: number }>();

// unref: Aufräumen darf den Prozess nicht am Leben halten.
setInterval(
  () => {
    const now = Date.now();
    for (const [domain, entry] of cache) {
      if (entry.until < now) cache.delete(domain);
    }
  },
  60 * 60 * 1000,
).unref();

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    NOT_FOUND_CODES.has(error.code)
  );
}

async function lookup(domain: string): Promise<boolean> {
  try {
    const records = await resolver.resolveMx(domain);
    if (records.length > 0) return true;
  } catch (error) {
    // Zeitüberschreitung, SERVFAIL, kein Netz: im Zweifel durchlassen. Eine
    // hakelige Auflösung darf keine echte Anmeldung abweisen.
    if (!isNotFound(error)) {
      log.warn(`MX lookup for ${domain} failed, letting it pass:`, error);
      return true;
    }
  }

  // RFC 5321 Abschnitt 5.1: ohne MX gilt die Adresse des Hosts selbst.
  for (const resolve of [
    () => resolver.resolve4(domain),
    () => resolver.resolve6(domain),
  ]) {
    try {
      const records = await resolve();
      if (records.length > 0) return true;
    } catch (error) {
      if (!isNotFound(error)) return true;
    }
  }

  return false;
}

/**
 * Nimmt die Domain einer Adresse Post an? Erfundene Domains fallen hier durch,
 * bevor eine Bestätigungsmail sie zu einem Bounce macht.
 */
export async function isDeliverableDomain(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) return false;

  // Lokal und in Tests wird absichtlich mit Adressen gearbeitet, die es nicht
  // gibt (@claude.test). Die Prüfung schützt den Absender in Produktion.
  if (process.env.NODE_ENV !== "production") return true;

  const cached = cache.get(domain);
  if (cached && cached.until > Date.now()) return cached.deliverable;

  const deliverable = await lookup(domain);

  cache.set(domain, {
    deliverable,
    until: Date.now() + (deliverable ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS),
  });

  return deliverable;
}
