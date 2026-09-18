import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { permissionProcedure } from "../middleware/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { resolveUserPermissionsCached } from "../helpers/permissions";
import { berlinDate, berlinDayKey, berlinParts } from "@/lib/berlin-time";

const statsProcedure = permissionProcedure(PERMISSIONS.STATS_VIEW);

export const statsRouter = createTRPCRouter({
  /** "none" records nothing; only "anonymous_and_user" stores the session user id. */
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
      // User id only from the session: a caller-supplied id could forge rows for another
      // user, which would also end up in their GDPR export.
      await ctx.db.pageView.create({
        data: {
          path: input.path,
          section: input.section ?? null,
          userId:
            input.consent === "anonymous_and_user" && ctx.session?.user
              ? ctx.session.user.id
              : null,
        },
      });
      return { ok: true };
    }),

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

      // Tage in Berliner Zeit, nicht in der UTC-Zeit des Servers.
      const today = berlinParts(new Date());
      const thirtyDaysAgo = berlinDate(today.year, today.month, today.day - 30);
      const sevenDaysAgo = berlinDate(today.year, today.month, today.day - 7);
      const startOfToday = berlinDate(today.year, today.month, today.day);

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
        // Last 30 days unless pathPeriod is "overall"; the take-cap bounds growth (newest rows win).
        ctx.db.pageView.findMany({
          where: {
            ...where,
            userId: { not: null },
            ...(pathPeriod === "overall"
              ? {}
              : { createdAt: { gte: thirtyDaysAgo } }),
          },
          select: {
            path: true,
            userId: true,
            createdAt: true,
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
          orderBy: { createdAt: "desc" },
          take: 100_000,
        }),
      ]);

      // Berliner Kalendertag wie bei startOfToday / viewsToday, damit „heute"
      // im Verlauf und in der Kachel derselbe Tag ist.
      const byDay: Record<string, number> = {};
      for (const v of recentViews) {
        const key = berlinDayKey(v.createdAt);
        byDay[key] = (byDay[key] ?? 0) + 1;
      }
      // Last 30 days ending with today (same “today” as viewsToday)
      const recentDays: { date: string; count: number }[] = [];
      for (let i = 0; i < 30; i++) {
        const dateStr = berlinDayKey(
          berlinDate(today.year, today.month, today.day - (29 - i)),
        );
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
        const dateKey = berlinDayKey(v.createdAt);
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

  getSiteStats: statsProcedure.query(async ({ ctx }) => {
    const today = berlinParts(new Date());
    const thirtyDaysAgo = berlinDate(today.year, today.month, today.day - 30);

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

  /** Views with a user attached (consent anonymous_and_user), counted per user and page. */
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
        // Hard cap against unbounded growth; newest rows win.
        take: 100_000,
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

  canViewStats: protectedProcedure.query(async ({ ctx }) => {
    const perms = await resolveUserPermissionsCached(
      ctx.session.user.id,
      ctx.permissionCache,
    );
    return perms.has(PERMISSIONS.STATS_VIEW);
  }),
});
