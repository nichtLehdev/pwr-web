import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../trpc";

/**
 * Öffentliche Bibliothek von Notensets für die Spiele unter /spiele.
 * Lesen ist öffentlich (Spiele funktionieren ohne Anmeldung), Veröffentlichen
 * erfordert einen Account, damit jedes Set eine verantwortliche Person hat.
 */

const clefSchema = z.enum(["treble", "bass", "alto", "tenor"]);

/** Geschriebene Tonhöhe wie in den Spielen (deutsches H, alter -1|0|1). */
const pitchSchema = z.object({
  letter: z.enum(["C", "D", "E", "F", "G", "A", "H"]),
  alter: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
  octave: z.number().int().min(1).max(7),
});

const pitchesSchema = z
  .array(pitchSchema)
  .min(2, "Ein Set braucht mindestens 2 Noten")
  .max(96)
  .superRefine((pitches, ctx) => {
    const seen = new Set<string>();
    for (const p of pitches) {
      const key = `${p.letter}${p.octave}${p.alter}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Noten dürfen nicht doppelt vorkommen",
        });
        return;
      }
      seen.add(key);
    }
  });

const nameSchema = z.string().trim().min(3).max(60);
const descriptionSchema = z.string().trim().max(300).optional();

/** URL-sicherer Kurzcode für Deep-Links (?set=...). */
function generatePublicId(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // ohne i/l/o/0/1
  const bytes = randomBytes(8);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

const setListSelect = {
  id: true,
  publicId: true,
  name: true,
  description: true,
  clef: true,
  pitches: true,
  timesUsed: true,
  createdAt: true,
  creatorId: true,
  creator: { select: { displayName: true, username: true } },
} as const;

export const noteSetsRouter = createTRPCRouter({
  /** Bibliothek durchsuchen — öffentlich. */
  list: publicProcedure
    .input(
      z
        .object({
          clef: clefSchema.optional(),
          search: z.string().trim().max(60).optional(),
          orderBy: z.enum(["newest", "popular"]).default("newest"),
          limit: z.number().int().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { clef, search, orderBy = "newest", limit = 50 } = input ?? {};
      return ctx.db.gameNoteSet.findMany({
        where: {
          ...(clef ? { clef } : {}),
          ...(search
            ? { name: { contains: search, mode: "insensitive" as const } }
            : {}),
        },
        orderBy:
          orderBy === "popular"
            ? [{ timesUsed: "desc" as const }, { createdAt: "desc" as const }]
            : { createdAt: "desc" as const },
        take: limit,
        select: setListSelect,
      });
    }),

  /** Einzelnes Set per Kurzcode — für Deep-Links und persistierte Auswahl. */
  byPublicId: publicProcedure
    .input(z.object({ publicId: z.string().trim().min(4).max(20) }))
    .query(async ({ ctx, input }) => {
      const set = await ctx.db.gameNoteSet.findUnique({
        where: { publicId: input.publicId },
        select: setListSelect,
      });
      if (!set) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Set nicht gefunden" });
      }
      return set;
    }),

  /** Nutzung zählen (grobes Beliebtheits-Signal) — bewusst öffentlich & idempotenzfrei. */
  recordUse: publicProcedure
    .input(z.object({ publicId: z.string().trim().min(4).max(20) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.gameNoteSet.updateMany({
        where: { publicId: input.publicId },
        data: { timesUsed: { increment: 1 } },
      });
      return { ok: true };
    }),

  /** Set veröffentlichen — nur mit Account. */
  create: protectedProcedure
    .input(
      z.object({
        name: nameSchema,
        description: descriptionSchema,
        clef: clefSchema,
        pitches: pitchesSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Kollisionen beim Kurzcode sind extrem unwahrscheinlich, aber der
      // Unique-Index macht sie möglich — daher wenige Versuche statt Hoffnung.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await ctx.db.gameNoteSet.create({
            data: {
              publicId: generatePublicId(),
              name: input.name,
              description: input.description ?? null,
              clef: input.clef,
              pitches: input.pitches,
              creatorId: ctx.session.user.id,
            },
            select: setListSelect,
          });
        } catch (err) {
          const isUniqueViolation =
            typeof err === "object" &&
            err !== null &&
            "code" in err &&
            (err as { code?: string }).code === "P2002";
          if (!isUniqueViolation || attempt === 2) throw err;
        }
      }
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }),

  /** Eigenes Set aktualisieren. */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: nameSchema,
        description: descriptionSchema,
        clef: clefSchema,
        pitches: pitchesSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.gameNoteSet.findUnique({
        where: { id: input.id },
        select: { creatorId: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.creatorId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.db.gameNoteSet.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description ?? null,
          clef: input.clef,
          pitches: input.pitches,
        },
        select: setListSelect,
      });
    }),

  /** Eigenes Set löschen. */
  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.gameNoteSet.findUnique({
        where: { id: input.id },
        select: { creatorId: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.creatorId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db.gameNoteSet.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  /** Eigene Sets (für „Meine Sets" im Editor). */
  mine: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.gameNoteSet.findMany({
      where: { creatorId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      select: setListSelect,
    });
  }),
});
