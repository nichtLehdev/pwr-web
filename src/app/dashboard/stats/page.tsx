"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { BarChart3, ArrowLeft, FileText, Layout, Calendar } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useTheme } from "@/app/_components/general/theme-provider";

const CHART_GRID_STROKE_LIGHT = "#e5e7eb";
const CHART_GRID_STROKE_DARK = "#2d3340"; // dark-border
const CHART_AXIS_TICK_LIGHT = "#6b7280";
const CHART_AXIS_TICK_DARK = "#8a8d93"; // dark-text-muted

export default function StatsPage() {
  const { data: session, isPending } = useSession();
  const { resolvedTheme } = useTheme();
  const hasRedirected = useRef(false);
  const isDark = resolvedTheme === "dark";
  const { data: canView, isLoading: canViewLoading } =
    api.stats.canViewStats.useQuery(undefined, {
      enabled: !!session?.user,
    });
  const { data: stats, isLoading: statsLoading } = api.stats.getStats.useQuery(
    undefined,
    { enabled: !!canView },
  );

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/stats");
    }
  }, [isPending, session]);

  useEffect(() => {
    if (!canViewLoading && canView === false && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/dashboard");
    }
  }, [canView, canViewLoading]);

  if (isPending || canViewLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || canView === false) {
    return null;
  }

  return (
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="dark:text-dark-muted dark:hover:text-dark-text text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="dark:text-dark-text text-2xl font-bold text-gray-900">
            Statistik
          </h1>
        </div>
        <p className="dark:text-dark-muted mb-8 text-sm text-gray-600">
          Anonyme Aufrufe von Seiten und Bereichen der Webseite.
        </p>

        {statsLoading ? (
          <div className="flex justify-center py-12">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
          </div>
        ) : stats ? (
          <div className="space-y-8">
            <div className="dark:bg-dark-surface overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-dark-border">
              <div className="border-b border-gray-200 px-4 py-3 dark:border-dark-border sm:px-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="text-primary h-5 w-5" />
                  <h2 className="dark:text-dark-text font-semibold text-gray-900">
                    Gesamtaufrufe
                  </h2>
                </div>
              </div>
              <div className="px-4 py-6 sm:px-6">
                <p className="dark:text-dark-text text-3xl font-bold tabular-nums">
                  {stats.totalViews.toLocaleString("de-DE")}
                </p>
              </div>
            </div>

            {stats.byPath.length > 0 && (
              <div className="dark:bg-dark-surface overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-dark-border">
                <div className="border-b border-gray-200 px-4 py-3 dark:border-dark-border sm:px-6">
                  <div className="flex items-center gap-2">
                    <FileText className="text-primary h-5 w-5" />
                    <h2 className="dark:text-dark-text font-semibold text-gray-900">
                      Aufrufe nach Seite
                    </h2>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                    <thead>
                      <tr>
                        <th className="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:bg-dark-surface dark:text-dark-text sm:px-6">
                          Pfad
                        </th>
                        <th className="bg-gray-50 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-600 dark:bg-dark-surface dark:text-dark-text sm:px-6">
                          Aufrufe
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                      {stats.byPath.map((row) => (
                        <tr key={row.path}>
                          <td className="dark:text-dark-text whitespace-nowrap px-4 py-3 font-mono text-sm text-gray-900 sm:px-6">
                            {row.path || "/"}
                          </td>
                          <td className="dark:text-dark-text whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-900 sm:px-6">
                            {row.count.toLocaleString("de-DE")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {stats.bySection.length > 0 && (
              <div className="dark:bg-dark-surface overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-dark-border">
                <div className="border-b border-gray-200 px-4 py-3 dark:border-dark-border sm:px-6">
                  <div className="flex items-center gap-2">
                    <Layout className="text-primary h-5 w-5" />
                    <h2 className="dark:text-dark-text font-semibold text-gray-900">
                      Aufrufe nach Bereich
                    </h2>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                    <thead>
                      <tr>
                        <th className="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:bg-dark-surface dark:text-dark-text sm:px-6">
                          Bereich
                        </th>
                        <th className="bg-gray-50 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-600 dark:bg-dark-surface dark:text-dark-text sm:px-6">
                          Aufrufe
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                      {stats.bySection.map((row) => (
                        <tr key={row.section ?? ""}>
                          <td className="dark:text-dark-text whitespace-nowrap px-4 py-3 text-sm text-gray-900 sm:px-6">
                            {row.section}
                          </td>
                          <td className="dark:text-dark-text whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-900 sm:px-6">
                            {row.count.toLocaleString("de-DE")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {stats.recentDays.length > 0 && (
              <div className="dark:bg-dark-surface overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-dark-border">
                <div className="border-b border-gray-200 px-4 py-3 dark:border-dark-border sm:px-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="text-primary h-5 w-5" />
                    <h2 className="dark:text-dark-text font-semibold text-gray-900">
                      Aufrufe pro Tag (letzte 30 Tage)
                    </h2>
                  </div>
                </div>
                <div className="px-4 py-6 sm:px-6">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={stats.recentDays.map((d) => ({
                          date: d.date,
                          Aufrufe: d.count,
                          fullDate: d.date,
                        }))}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="visitorsGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="var(--color-primary)"
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="100%"
                              stopColor="var(--color-primary)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={isDark ? CHART_GRID_STROKE_DARK : CHART_GRID_STROKE_LIGHT}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tick={{
                            fontSize: 12,
                            fill: isDark ? CHART_AXIS_TICK_DARK : CHART_AXIS_TICK_LIGHT,
                          }}
                          tickFormatter={(value: string) => {
                            const [y, m, d] = value.split("-");
                            return `${d}.${m}`;
                          }}
                          axisLine={{
                            stroke: isDark ? CHART_GRID_STROKE_DARK : CHART_GRID_STROKE_LIGHT,
                          }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{
                            fontSize: 12,
                            fill: isDark ? CHART_AXIS_TICK_DARK : CHART_AXIS_TICK_LIGHT,
                          }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => v.toLocaleString("de-DE")}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: isDark
                              ? "1px solid #2d3340"
                              : "1px solid #e5e7eb",
                            backgroundColor: isDark ? "#252b36" : "#fff",
                            color: isDark ? "#e4e6eb" : "#111827",
                          }}
                          formatter={(value: number) => [
                            value.toLocaleString("de-DE"),
                            "Aufrufe",
                          ]}
                          labelFormatter={(label) => `Datum: ${label}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="Aufrufe"
                          stroke="var(--color-primary)"
                          strokeWidth={2}
                          fill="url(#visitorsGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="overflow-x-auto border-t border-gray-200 dark:border-dark-border">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                    <thead>
                      <tr>
                        <th className="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:bg-dark-surface dark:text-dark-text sm:px-6">
                          Datum
                        </th>
                        <th className="bg-gray-50 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-600 dark:bg-dark-surface dark:text-dark-text sm:px-6">
                          Aufrufe
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                      {stats.recentDays.map((row) => (
                        <tr key={row.date}>
                          <td className="dark:text-dark-text whitespace-nowrap px-4 py-3 text-sm text-gray-900 sm:px-6">
                            {row.date}
                          </td>
                          <td className="dark:text-dark-text whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-900 sm:px-6">
                            {row.count.toLocaleString("de-DE")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {stats.byPath.length === 0 &&
              stats.bySection.length === 0 &&
              stats.recentDays.length === 0 &&
              stats.totalViews === 0 && (
                <p className="dark:text-dark-muted text-center text-gray-500">
                  Noch keine Aufrufe erfasst.
                </p>
              )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
