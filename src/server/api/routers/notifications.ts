import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const notificationsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(15),
        unreadOnly: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        userId: ctx.session.user.id,
        ...(input.unreadOnly ? { readAt: null } : {}),
      };

      const [notifications, unreadCount] = await Promise.all([
        ctx.db.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: input.limit,
        }),
        ctx.db.notification.count({
          where: { userId: ctx.session.user.id, readAt: null },
        }),
      ]);

      return { notifications, unreadCount };
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.notification.count({
      where: { userId: ctx.session.user.id, readAt: null },
    });
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // updateMany scoped to the session user: no cross-user marking, and no
      // error when the notification is already gone.
      await ctx.db.notification.updateMany({
        where: { id: input.id, userId: ctx.session.user.id, readAt: null },
        data: { readAt: new Date() },
      });
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.notification.updateMany({
      where: { userId: ctx.session.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }),
});
