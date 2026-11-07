import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions";
import {
  ENDLESS_GAMES,
  endlessBoard,
  reportEndless,
  startEndlessRun,
} from "@/server/games/endless";
import { permissionProcedure } from "../middleware/permissions";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const gameSchema = z.enum(ENDLESS_GAMES);

async function assertOwned(
  db: { gameProfile: { findFirst: (args: object) => Promise<unknown> } },
  userId: string,
  profileId: string,
) {
  const owned = await db.gameProfile.findFirst({
    where: { id: profileId, userId },
    select: { id: true },
  });
  if (!owned) throw new TRPCError({ code: "NOT_FOUND" });
}

export const gameEndlessRouter = createTRPCRouter({
  start: protectedProcedure
    .input(
      z.object({
        profileId: z.string().uuid(),
        game: gameSchema,
        variant: z.string().max(40),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwned(ctx.db, ctx.session.user.id, input.profileId);
      return startEndlessRun(
        ctx.db,
        input.profileId,
        input.game,
        input.variant,
      );
    }),

  report: protectedProcedure
    .input(
      z.object({
        profileId: z.string().uuid(),
        runId: z.string().uuid(),
        fromIndex: z.number().int().min(0),
        answers: z
          .array(
            z.object({
              label: z.string().max(8).nullable(),
              ms: z.number().int().min(0).max(60000),
            }),
          )
          .max(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwned(ctx.db, ctx.session.user.id, input.profileId);
      return reportEndless(
        ctx.db,
        input.profileId,
        input.runId,
        input.fromIndex,
        input.answers,
      );
    }),

  /** Ansehen darf jede:r; den eigenen Platz gibt es mit Profil. */
  board: publicProcedure
    .input(
      z.object({
        game: gameSchema,
        variant: z.string().max(40),
        profileId: z.string().uuid().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      let profileId: string | null = null;
      if (input.profileId && ctx.session?.user) {
        const owned = await ctx.db.gameProfile.findFirst({
          where: { id: input.profileId, userId: ctx.session.user.id },
          select: { id: true },
        });
        profileId = owned ? input.profileId : null;
      }
      return endlessBoard(ctx.db, profileId, input.game, input.variant);
    }),

  /** Moderation: Ein Bestwert verschwindet aus der Liste. */
  hide: permissionProcedure(PERMISSIONS.USERS_MANAGE)
    .input(z.object({ entryId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.gameEndlessBest.update({
        where: { id: input.entryId },
        data: { hidden: true },
      });
      return { hidden: true };
    }),
});
