import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions";
import { leagueStanding } from "@/server/games/leagues";
import { evaluateTasks } from "@/server/games/tasks";
import { permissionProcedure } from "../middleware/permissions";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const gameLeaguesRouter = createTRPCRouter({
  standing: protectedProcedure
    .input(z.object({ profileId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const owned = await ctx.db.gameProfile.findFirst({
        where: { id: input.profileId, userId: ctx.session.user.id },
        select: { id: true },
      });
      if (!owned) throw new TRPCError({ code: "NOT_FOUND" });
      return leagueStanding(ctx.db, input.profileId);
    }),

  tasks: protectedProcedure
    .input(z.object({ profileId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const owned = await ctx.db.gameProfile.findFirst({
        where: { id: input.profileId, userId: ctx.session.user.id },
        select: { id: true },
      });
      if (!owned) throw new TRPCError({ code: "NOT_FOUND" });
      return evaluateTasks(ctx.db, input.profileId);
    }),

  /** Moderation: Ein Eintrag verschwindet aus der Liga und zählt nicht mit. */
  hide: permissionProcedure(PERMISSIONS.USERS_MANAGE)
    .input(z.object({ memberId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.gameLeagueMember.update({
        where: { id: input.memberId },
        data: { hidden: true },
      });
      return { hidden: true };
    }),
});
