import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { permissionProcedure } from "../middleware/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { resolveUserPermissions } from "../helpers/permissions";

const statsProcedure = permissionProcedure(PERMISSIONS.STATS_VIEW);

export const statsRouter = createTRPCRouter({
  /**
   * Record a page or section view. "none" is legacy (no record).
   * "anonymous" = without userId; "anonymous_and_user" = with userId when provided.
   */
  recordView: publicProcedure
    .input(
      z.object({
        path: z.string().min(1).max(500),
        section: z.string().max(100).optional(),
        consent: z.enum(["none", "anonymous", "anonymous_and_user"]),
        userId: z.string().min(1).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.consent === "none") return { ok: true };
      await ctx.db.pageView.create({
        data: {
          path: input.path,
          section: input.section ?? null,
          userId:
            input.consent === "anonymous_and_user" && input.userId
              ? input.userId
              : null,
        },
      });
      return { ok: true };
    }),

  /**
   * Get aggregated stats. Only allowed usernames/emails can call this.
   */
  getStats: statsProcedure
    .input(
      z
        .object({
          from: z.string().datetime().optional(),
          to: z.string().datetime().optional(),
          pathPeriod: z
            .enum(["today", "last30Days", "overall"])
            .default("last30Days"),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const pathPeriod = input?.pathPeriod ?? "last30Days";

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
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const wherePath =
        pathPeriod === "today"
          ? { createdAt: { gte: startOfToday } }
          : pathPeriod === "last30Days"
            ? { createdAt: { gte: thirtyDaysAgo } }
            : {};

      const [
        totalViews,
        viewsWithUser,
        viewsLast30Days,
        viewsLast7Days,
        viewsToday,
        byPath,
        bySection,
        recentViews,
        viewsWithUserId,
      ] = await Promise.all([
        ctx.db.pageView.count({ where }),
        ctx.db.pageView.count({ where: { ...where, userId: { not: null } } }),
        ctx.db.pageView.count({
          where: { ...where, createdAt: { gte: thirtyDaysAgo } },
        }),
        ctx.db.pageView.count({
          where: { ...where, createdAt: { gte: sevenDaysAgo } },
        }),
        ctx.db.pageView.count({
          where: { ...where, createdAt: { gte: startOfToday } },
        }),
        ctx.db.pageView.groupBy({
          by: ["path"],
          where: wherePath,
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
        ctx.db.pageView.findMany({
          where: { ...where, userId: { not: null } },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                firstName: true,
                lastName: true,
                email: true,
                username: true,
              },
            },
          },
        }),
      ]);

      // Use local date (same as startOfToday / viewsToday) so chart "today" matches the summary card
      const toLocalDateString = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };
      const byDay: Record<string, number> = {};
      for (const v of recentViews) {
        const key = toLocalDateString(v.createdAt);
        byDay[key] = (byDay[key] ?? 0) + 1;
      }
      // Last 30 days ending with today (same “today” as viewsToday)
      const recentDays: { date: string; count: number }[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - (29 - i));
        const dateStr = toLocalDateString(d);
        recentDays.push({ date: dateStr, count: byDay[dateStr] ?? 0 });
      }

      const pathVisitorDetails: Record<
        string,
        {
          topVisitors: { userDisplayName: string; count: number }[];
          otherViews: number;
          otherUsers: number;
        }
      > = {};
      const pathUserCounts = new Map<
        string,
        Map<string, { count: number; userDisplayName: string }>
      >();
      const pathPeriodFilter = (v: { createdAt: Date }) => {
        if (pathPeriod === "today") return v.createdAt >= startOfToday;
        if (pathPeriod === "last30Days") return v.createdAt >= thirtyDaysAgo;
        return true;
      };
      for (const v of viewsWithUserId) {
        if (!v.userId || !v.user || !pathPeriodFilter(v)) continue;
        const u = v.user;
        const displayName =
          u.displayName ??
          ([u.firstName, u.lastName].filter(Boolean).join(" ") ||
            u.email ||
            u.username) ??
          u.id;
        let perPath = pathUserCounts.get(v.path);
        if (!perPath) {
          perPath = new Map();
          pathUserCounts.set(v.path, perPath);
        }
        const existing = perPath.get(v.userId);
        if (existing) {
          existing.count += 1;
        } else {
          perPath.set(v.userId, { count: 1, userDisplayName: displayName });
        }
      }
      for (const [path, userMap] of pathUserCounts) {
        const sorted = Array.from(userMap.entries())
          .map(([, data]) => data)
          .sort((a, b) => b.count - a.count);
        const topVisitors = sorted.slice(0, 3);
        const rest = sorted.slice(3);
        const otherViews = rest.reduce((s, r) => s + r.count, 0);
        pathVisitorDetails[path] = {
          topVisitors,
          otherViews,
          otherUsers: rest.length,
        };
      }

      const dayVisitorDetails: Record<
        string,
        {
          topVisitors: { userDisplayName: string; count: number }[];
          otherViews: number;
          otherUsers: number;
        }
      > = {};
      const dayUserCounts = new Map<
        string,
        Map<string, { count: number; userDisplayName: string }>
      >();
      for (const v of viewsWithUserId) {
        if (!v.userId || !v.user || v.createdAt < thirtyDaysAgo) continue;
        const dateKey = toLocalDateString(v.createdAt);
        const u = v.user;
        const displayName =
          u.displayName ??
          ([u.firstName, u.lastName].filter(Boolean).join(" ") ||
            u.email ||
            u.username) ??
          u.id;
        let perDay = dayUserCounts.get(dateKey);
        if (!perDay) {
          perDay = new Map();
          dayUserCounts.set(dateKey, perDay);
        }
        const existing = perDay.get(v.userId);
        if (existing) {
          existing.count += 1;
        } else {
          perDay.set(v.userId, { count: 1, userDisplayName: displayName });
        }
      }
      for (const [dateKey, userMap] of dayUserCounts) {
        const sorted = Array.from(userMap.entries())
          .map(([, data]) => data)
          .sort((a, b) => b.count - a.count);
        const topVisitors = sorted.slice(0, 3);
        const rest = sorted.slice(3);
        const otherViews = rest.reduce((s, r) => s + r.count, 0);
        dayVisitorDetails[dateKey] = {
          topVisitors,
          otherViews,
          otherUsers: rest.length,
        };
      }

      return {
        totalViews,
        viewsWithUser,
        viewsLast30Days,
        viewsLast7Days,
        viewsToday,
        byPath: byPath.map((p) => ({ path: p.path, count: p._count.id })),
        bySection: bySection.map((s) => ({
          section: s.section,
          count: s._count.id,
        })),
        recentDays,
        pathVisitorDetails,
        dayVisitorDetails,
      };
    }),

  /**
   * Site-wide content and user counts (for stats dashboard). Same allowlist as getStats.
   */
  getSiteStats: statsProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      eventsCount,
      coursesCount,
      postsCount,
      registrationsCount,
      newsletterActiveCount,
      usersCount,
      ensemblesCount,
      locationsCount,
      eventsCreatedLast30Days,
      coursesCreatedLast30Days,
      usersRegisteredLast30Days,
      registrationsLast30Days,
    ] = await Promise.all([
      ctx.db.event.count({ where: { status: "APPROVED" } }),
      ctx.db.course.count({ where: { status: "APPROVED" } }),
      ctx.db.post.count({ where: { status: "APPROVED" } }),
      ctx.db.courseRegistration.count(),
      ctx.db.newsletterSubscriber.count({ where: { isActive: true } }),
      ctx.db.user.count(),
      ctx.db.ensemble.count({ where: { isActive: true } }),
      ctx.db.location.count(),
      ctx.db.event.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      ctx.db.course.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      ctx.db.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      ctx.db.courseRegistration.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    return {
      eventsCount,
      coursesCount,
      postsCount,
      registrationsCount,
      newsletterActiveCount,
      usersCount,
      ensemblesCount,
      locationsCount,
      eventsCreatedLast30Days,
      coursesCreatedLast30Days,
      usersRegisteredLast30Days,
      registrationsLast30Days,
    };
  }),

  /**
   * Get page views that are associated with a user (consent: anonymous_and_user).
   * Returns which users visited which pages with counts. Same allowlist as getStats.
   */
  getViewsByUser: statsProcedure
    .input(
      z
        .object({
          from: z.string().datetime().optional(),
          to: z.string().datetime().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const from = input?.from ? new Date(input.from) : undefined;
      const to = input?.to ? new Date(input.to) : undefined;
      const where = {
        userId: { not: null },
        ...(from || to
          ? {
              createdAt: {
                ...(from && { gte: from }),
                ...(to && { lte: to }),
              },
            }
          : {}),
      };

      const views = await ctx.db.pageView.findMany({
        where,
        select: {
          path: true,
          createdAt: true,
          userId: true,
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              firstName: true,
              lastName: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const SEP = "\x00";
      const key = (uid: string, p: string) => `${uid}${SEP}${p}`;
      const counts = new Map<
        string,
        {
          count: number;
          lastViewedAt: Date;
          userDisplayName: string;
          userEmail: string;
        }
      >();
      for (const v of views) {
        if (!v.userId || !v.user) continue;
        const u = v.user;
        const displayName =
          u.displayName ??
          ([u.firstName, u.lastName].filter(Boolean).join(" ") ||
            u.email ||
            u.username) ??
          u.id;
        const k = key(v.userId, v.path);
        const existing = counts.get(k);
        if (existing) {
          existing.count += 1;
          if (v.createdAt > existing.lastViewedAt) {
            existing.lastViewedAt = v.createdAt;
          }
        } else {
          counts.set(k, {
            count: 1,
            lastViewedAt: v.createdAt,
            userDisplayName: displayName,
            userEmail: u.email,
          });
        }
      }

      const rows = Array.from(counts.entries()).map(([k, v]) => {
        const sepIdx = k.indexOf(SEP);
        const userId = sepIdx >= 0 ? k.slice(0, sepIdx) : "";
        const path = sepIdx >= 0 ? k.slice(sepIdx + 1) : k;
        return {
          userId,
          path,
          userDisplayName: v.userDisplayName,
          userEmail: v.userEmail,
          count: v.count,
          lastViewedAt: v.lastViewedAt.toISOString(),
        };
      });
      rows.sort(
        (a, b) =>
          a.userDisplayName.localeCompare(b.userDisplayName) ||
          a.path.localeCompare(b.path),
      );
      return { rows };
    }),

  /**
   * Check whether the current user is allowed to view stats (for UI redirect).
   */
  canViewStats: protectedProcedure.query(async ({ ctx }) => {
    const perms = await resolveUserPermissions(ctx.session.user.id);
    return perms.has(PERMISSIONS.STATS_VIEW);
  }),
});
