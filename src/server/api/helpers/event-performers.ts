import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "~/generated/prisma/client";
import {
  normalizePerformers,
  type PerformerInput,
} from "@/lib/event-performers";

/** Eine Zeile, fertig zum `createMany` (ohne eventId). */
export type PerformerRow = {
  type: "ENSEMBLE" | "AUSWAHLCHOR" | "CUSTOM";
  ensembleId: string | null;
  auswahlChorId: string | null;
  name: string;
  sortOrder: number;
};

/**
 * Bereinigt die eingereichten Mitwirkenden und füllt den Namen verknüpfter
 * Zeilen aus dem Ensemble bzw. Auswahlchor. Unbekannte IDs sind ein Fehler.
 */
export async function performerRowsFor(
  db: Pick<PrismaClient, "ensemble" | "auswahlChor">,
  inputs: readonly PerformerInput[],
): Promise<PerformerRow[]> {
  const performers = normalizePerformers(inputs);

  const ensembleIds = performers.flatMap((p) =>
    p.type === "ENSEMBLE" ? [p.ensembleId] : [],
  );
  const chorIds = performers.flatMap((p) =>
    p.type === "AUSWAHLCHOR" ? [p.auswahlChorId] : [],
  );

  const [ensembles, choere] = await Promise.all([
    ensembleIds.length
      ? db.ensemble.findMany({
          where: { id: { in: ensembleIds } },
          select: { id: true, name: true },
        })
      : [],
    chorIds.length
      ? db.auswahlChor.findMany({
          where: { id: { in: chorIds } },
          select: { id: true, name: true },
        })
      : [],
  ]);
  const ensembleNames = new Map(ensembles.map((e) => [e.id, e.name]));
  const chorNames = new Map(choere.map((c) => [c.id, c.name]));

  return performers.map((p, sortOrder) => {
    switch (p.type) {
      case "ENSEMBLE": {
        const name = ensembleNames.get(p.ensembleId);
        if (!name) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Ensemble nicht gefunden",
          });
        }
        return {
          type: p.type,
          ensembleId: p.ensembleId,
          auswahlChorId: null,
          name,
          sortOrder,
        };
      }
      case "AUSWAHLCHOR": {
        const name = chorNames.get(p.auswahlChorId);
        if (!name) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Auswahlchor nicht gefunden",
          });
        }
        return {
          type: p.type,
          ensembleId: null,
          auswahlChorId: p.auswahlChorId,
          name,
          sortOrder,
        };
      }
      case "CUSTOM":
        return {
          type: p.type,
          ensembleId: null,
          auswahlChorId: null,
          name: p.name,
          sortOrder,
        };
    }
  });
}

/** Mitwirkende mit Namen und Slug der Ziele, für Listen und Karten. */
export const performersInclude = {
  orderBy: { sortOrder: "asc" },
  include: {
    ensemble: { select: { id: true, name: true, slug: true } },
    auswahlChor: {
      select: { id: true, name: true, slug: true, image: true },
    },
  },
} satisfies Prisma.Event$performersArgs;

/** Wie oben, plus Leitung, Bild und Beschreibung für die Detailseite. */
export const performersDetailInclude = {
  orderBy: { sortOrder: "asc" },
  include: {
    ensemble: {
      include: {
        conductor: { select: { id: true, displayName: true } },
        image: true,
      },
    },
    auswahlChor: {
      include: {
        conductor: { select: { id: true, displayName: true } },
        image: true,
      },
    },
  },
} satisfies Prisma.Event$performersArgs;
