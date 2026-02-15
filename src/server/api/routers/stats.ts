import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

/**
 * Hardcoded list of usernames or emails allowed to view the stats page.
 * Add usernames (e.g. "admin") or emails (e.g. "admin@example.com") here.
 */
const ALLOWED_STATS_VIEWERS: string[] = [
  // "admin",
  // "admin@example.com",
  "lars.lehmann",
];

function canViewStats(identifier: string): boolean {
  if (!identifier) return false;
  const normalized = identifier.trim().toLowerCase();
  return ALLOWED_STATS_VIEWERS.some(
    (allowed) => allowed.trim().toLowerCase() === normalized,
  );
}

export const statsRouter = createTRPCRouter({
  /**
   * Record an anonymous page or section view (public, no auth).
   */
  recordView: publicProcedure
    .input(
      z.object({
        path: z.string().min(1).max(500),
        section: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.pageView.create({
        data: {
          path: input.path,
          section: input.section ?? null,
        },
      });
      return { ok: true };
    }),

  /**
   * Get aggregated stats. Only allowed usernames/emails can call this.
   */
  getStats: protectedProcedure
    .input(
      z
        .object({
          from: z.string().datetime().optional(),
          to: z.string().datetime().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true, username: true },
      });
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const allowed =
        canViewStats(user.email) ||
        (user.username ? canViewStats(user.username) : false);
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not allowed to view statistics",
        });
      }

      const from = input?.from ? new Date(input.from) : undefined;
      const to = input?.to ? new Date(input.to) : undefined;
      const where =
        from || to
          ? {
              createdAt: {
                ...(from && { gte: from }),
                ...(to && { lte: to }),
              },
            }
          : {};

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const [totalViews, byPath, bySection, recentViews] = await Promise.all([
        ctx.db.pageView.count({ where }),
        ctx.db.pageView.groupBy({
          by: ["path"],
          where,
          _count: { id: true },
          orderBy: { _count: { path: "desc" } },
        }),
        ctx.db.pageView.groupBy({
          by: ["section"],
          where: { ...where, section: { not: null } },
          _count: { id: true },
          orderBy: { _count: { section: "desc" } },
        }),
        ctx.db.pageView.findMany({
          where: { createdAt: { gte: thirtyDaysAgo } },
          select: { createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
      ]);

      const byDay: Record<string, number> = {};
      for (const v of recentViews) {
        const key = v.createdAt.toISOString().slice(0, 10);
        byDay[key] = (byDay[key] ?? 0) + 1;
      }
      const recentDays = Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

      return {
        totalViews,
        byPath: byPath.map((p) => ({ path: p.path, count: p._count.id })),
        bySection: bySection.map((s) => ({
          section: s.section,
          count: s._count.id,
        })),
        recentDays,
      };
    }),

  /**
   * Check whether the current user is allowed to view stats (for UI redirect).
   */
  canViewStats: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { email: true, username: true },
    });
    if (!user) return false;
    return (
      canViewStats(user.email) ||
      (user.username ? canViewStats(user.username) : false)
    );
  }),
});
