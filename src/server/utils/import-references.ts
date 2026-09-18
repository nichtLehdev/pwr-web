import type { PrismaClient } from "~/generated/prisma/client";

/**
 * Foreign keys differ between environments. Each reference: keep the id if the
 * target knows it, else match on an environment-independent key, else drop and
 * record it.
 */
type Db = Pick<
  PrismaClient,
  "bezirk" | "ensemble" | "auswahlChor" | "location" | "user" | "download"
>;

export type UnresolvedReference = {
  /** The record the reference was on, for the report. */
  subject: string;
  field: string;
  /** What the export said, so the value can be traced back. */
  value: string;
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function createReferenceResolver(db: Db) {
  const unresolved: UnresolvedReference[] = [];
  const cache = new Map<string, string | null>();

  async function memo(
    key: string,
    lookup: () => Promise<string | null>,
  ): Promise<string | null> {
    if (cache.has(key)) return cache.get(key) ?? null;
    const id = await lookup();
    cache.set(key, id);
    return id;
  }

  function record(subject: string, field: string, value: string) {
    unresolved.push({ subject, field, value });
  }

  return {
    /** Bezirke are seeded from a fixed list, so the number is stable across environments. */
    async bezirkId(
      rawId: unknown,
      bezirk: unknown,
      subject: string,
    ): Promise<string | null> {
      const id = text(rawId);
      if (!id) return null;

      return memo(`bezirk:${id}`, async () => {
        const byId = await db.bezirk.findUnique({
          where: { id },
          select: { id: true },
        });
        if (byId) return byId.id;

        const number = (bezirk as { number?: unknown } | null)?.number;
        if (typeof number === "number") {
          const byNumber = await db.bezirk.findUnique({
            where: { number },
            select: { id: true },
          });
          if (byNumber) return byNumber.id;
        }

        record(subject, "bezirkId", id);
        return null;
      });
    },

    /** Chors are matched on their Chor-Nr first, then the slug, then the name. */
    async ensembleId(
      rawId: unknown,
      ensemble: unknown,
      ensembleName: unknown,
      subject: string,
    ): Promise<string | null> {
      const id = text(rawId);
      if (!id) return null;

      return memo(`ensemble:${id}`, async () => {
        const byId = await db.ensemble.findUnique({
          where: { id },
          select: { id: true },
        });
        if (byId) return byId.id;

        const source = (ensemble ?? {}) as Record<string, unknown>;
        const internalId = text(source.internalId);
        const slug = text(source.slug);
        const name = text(source.name) ?? text(ensembleName);

        const match = await db.ensemble.findFirst({
          where: {
            OR: [
              ...(internalId ? [{ internalId }] : []),
              ...(slug ? [{ slug }] : []),
              ...(name ? [{ name }] : []),
            ],
          },
          select: { id: true },
        });
        if (match) return match.id;

        record(subject, "ensembleId", name ?? id);
        return null;
      });
    },

    /** Auswahlchöre carry a required unique slug. */
    async auswahlChorId(
      rawId: unknown,
      auswahlChor: unknown,
      subject: string,
    ): Promise<string | null> {
      const id = text(rawId);
      if (!id) return null;

      return memo(`auswahlchor:${id}`, async () => {
        const byId = await db.auswahlChor.findUnique({
          where: { id },
          select: { id: true },
        });
        if (byId) return byId.id;

        const slug = text((auswahlChor as { slug?: unknown } | null)?.slug);
        if (slug) {
          const bySlug = await db.auswahlChor.findUnique({
            where: { slug },
            select: { id: true },
          });
          if (bySlug) return bySlug.id;
        }

        record(subject, "auswahlChorId", slug ?? id);
        return null;
      });
    },

    /**
     * Accounts are not exported: match by e-mail, otherwise drop (the free-text
     * name on the record keeps the information).
     */
    async userId(
      rawId: unknown,
      email: unknown,
      subject: string,
      field: string,
    ): Promise<string | null> {
      const id = text(rawId);
      if (!id) return null;

      return memo(`user:${id}:${field}`, async () => {
        const byId = await db.user.findUnique({
          where: { id },
          select: { id: true },
        });
        if (byId) return byId.id;

        const mail = text(email);
        if (mail) {
          const byEmail = await db.user.findUnique({
            where: { email: mail },
            select: { id: true },
          });
          if (byEmail) return byEmail.id;
        }

        record(subject, field, mail ?? id);
        return null;
      });
    },

    /**
     * Dateien haben einen eigenen Export: vorhandene Datei über id, Ablageort
     * oder Titel suchen; sonst Verknüpfung weglassen, nie leer anlegen.
     */
    async downloadId(
      rawId: unknown,
      fileUrl: unknown,
      title: unknown,
      subject: string,
    ): Promise<string | null> {
      const id = text(rawId);
      const url = text(fileUrl);
      const name = text(title);
      if (!id && !url && !name) return null;

      return memo(`download:${id ?? url ?? name}`, async () => {
        if (id) {
          const byId = await db.download.findUnique({
            where: { id },
            select: { id: true },
          });
          if (byId) return byId.id;
        }

        const match = await db.download.findFirst({
          where: {
            OR: [
              ...(url ? [{ fileUrl: url }] : []),
              ...(name ? [{ title: name }] : []),
            ],
          },
          select: { id: true },
        });
        if (match) return match.id;

        record(subject, "downloadId", name ?? url ?? id ?? "");
        return null;
      });
    },

    /** True when the target database already knows this Standort id. */
    async knownLocationId(rawId: unknown): Promise<string | null> {
      const id = text(rawId);
      if (!id) return null;

      return memo(`location:${id}`, async () => {
        const row = await db.location.findUnique({
          where: { id },
          select: { id: true },
        });
        return row?.id ?? null;
      });
    },

    /** Sonstiges, das nicht übernommen wurde, für denselben Bericht (z.B. eine verworfene Anzahlung). */
    note(subject: string, field: string, value: string) {
      record(subject, field, value);
    },

    unresolved,
  };
}
