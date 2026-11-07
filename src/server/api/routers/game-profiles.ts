import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  MAX_PROFILES,
  PROFILE_COLOR_IDS,
  PROFILE_INSTRUMENT_IDS,
} from "@/app/spiele/_lib/profiles/options";
import { profileName, randomName } from "@/app/spiele/_lib/profiles/names";
import {
  mergeProgress,
  type ProgressValue,
} from "@/app/spiele/_lib/profiles/progress-merge";
import type { Prisma } from "~/generated/prisma/client";

/** Fortschritt aller Spiele eines Kindes passt locker hinein. */
const MAX_PROGRESS_BYTES = 128 * 1024;

const instrumentsSchema = z
  .array(z.enum(PROFILE_INSTRUMENT_IDS))
  .min(1)
  .max(PROFILE_INSTRUMENT_IDS.length)
  .transform((list) => [...new Set(list)]);

const select = {
  id: true,
  nameAdjective: true,
  nameNoun: true,
  color: true,
  instruments: true,
  createdAt: true,
} as const;

type Row = {
  id: string;
  nameAdjective: string;
  nameNoun: string;
  color: string;
  instruments: string[];
  createdAt: Date;
};

function present(row: Row) {
  return {
    id: row.id,
    name: profileName(row.nameAdjective, row.nameNoun),
    color: row.color,
    instruments: row.instruments,
  };
}

export const gameProfilesRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.gameProfile.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "asc" },
      select,
    });
    return rows.map(present);
  }),

  create: protectedProcedure
    .input(
      z.object({
        instruments: instrumentsSchema,
        color: z.enum(PROFILE_COLOR_IDS),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const count = await ctx.db.gameProfile.count({ where: { userId } });
      if (count >= MAX_PROFILES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Mehr als ${MAX_PROFILES} Profile gehen nicht.`,
        });
      }
      const name = randomName();
      const row = await ctx.db.gameProfile.create({
        data: {
          userId,
          nameAdjective: name.adjective,
          nameNoun: name.noun,
          color: input.color,
          instruments: input.instruments,
        },
        select,
      });
      return present(row);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        instruments: instrumentsSchema.optional(),
        color: z.enum(PROFILE_COLOR_IDS).optional(),
        rerollName: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.gameProfile.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        select,
      });
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });
      const name = input.rerollName
        ? randomName(Math.random, {
            adjective: current.nameAdjective,
            noun: current.nameNoun,
          })
        : null;
      const row = await ctx.db.gameProfile.update({
        where: { id: current.id },
        data: {
          instruments: input.instruments,
          color: input.color,
          ...(name && { nameAdjective: name.adjective, nameNoun: name.noun }),
        },
        select,
      });
      return present(row);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.gameProfile.deleteMany({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { deleted: true };
    }),

  /** Gleicht in beide Richtungen ab: Der Server führt zusammen und schickt das Ergebnis zurück. */
  syncProgress: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        progress: z.record(z.string().max(80), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (JSON.stringify(input.progress).length > MAX_PROGRESS_BYTES) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE" });
      }
      return ctx.db.$transaction(async (tx) => {
        const current = await tx.gameProfile.findFirst({
          where: { id: input.id, userId: ctx.session.user.id },
          select: { progress: true },
        });
        if (!current) throw new TRPCError({ code: "NOT_FOUND" });
        const merged = mergeProgress(
          current.progress as ProgressValue,
          input.progress as ProgressValue,
        );
        await tx.gameProfile.update({
          where: { id: input.id },
          data: { progress: merged as Prisma.InputJsonValue },
        });
        return { progress: merged as Record<string, unknown> };
      });
    }),
});
