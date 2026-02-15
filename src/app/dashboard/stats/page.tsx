"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import {
  BarChart3,
  ArrowLeft,
  FileText,
  Layout,
  Calendar,
  CalendarDays,
  GraduationCap,
  Newspaper,
  UserPlus,
  Mail,
  Users,
  Music,
  MapPin,
} from "lucide-react";
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
  const { data: siteStats, isLoading: siteStatsLoading } =
    api.stats.getSiteStats.useQuery(undefined, { enabled: !!canView });

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
          Seitenaufrufe (anonym bzw. mit Konto, je nach Einwilligung) sowie
          Übersicht über Inhalte und Nutzung.
        </p>

        {(statsLoading || siteStatsLoading) ? (
          <div className="flex justify-center py-12">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
          </div>
        ) : stats ? (
          <div className="space-y-8">
            {siteStats && (
              <div className="dark:bg-dark-surface overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-dark-border">
                <div className="border-b border-gray-200 px-4 py-3 dark:border-dark-border sm:px-6">
                  <h2 className="dark:text-dark-text font-semibold text-gray-900">
                    Übersicht: Inhalte & Nutzung
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 sm:px-6 sm:py-5 lg:grid-cols-4">
                  <StatCard
                    icon={<CalendarDays className="h-5 w-5" />}
                    label="Termine (veröffentlicht)"
                    value={siteStats.eventsCount}
                  />
                  <StatCard
                    icon={<GraduationCap className="h-5 w-5" />}
                    label="Kurse (veröffentlicht)"
                    value={siteStats.coursesCount}
                  />
                  <StatCard
                    icon={<Newspaper className="h-5 w-5" />}
                    label="Beiträge (veröffentlicht)"
                    value={siteStats.postsCount}
                  />
                  <StatCard
                    icon={<UserPlus className="h-5 w-5" />}
                    label="Kursanmeldungen (gesamt)"
                    value={siteStats.registrationsCount}
                  />
                  <StatCard
                    icon={<Mail className="h-5 w-5" />}
                    label="Newsletter-Abonnenten"
                    value={siteStats.newsletterActiveCount}
                  />
                  <StatCard
                    icon={<Users className="h-5 w-5" />}
                    label="Benutzer"
                    value={siteStats.usersCount}
                  />
                  <StatCard
                    icon={<Music className="h-5 w-5" />}
                    label="Ensembles (aktiv)"
                    value={siteStats.ensemblesCount}
                  />
                  <StatCard
                    icon={<MapPin className="h-5 w-5" />}
                    label="Veranstaltungsorte"
                    value={siteStats.locationsCount}
                  />
                </div>
                <div className="border-t border-gray-200 px-4 pb-4 dark:border-dark-border sm:px-6 sm:pb-5">
                  <h3 className="dark:text-dark-muted mb-3 mt-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Neu in den letzten 30 Tagen
                  </h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <StatCard
                      icon={<CalendarDays className="h-5 w-5" />}
                      label="Termine erstellt"
                      value={siteStats.eventsCreatedLast30Days}
                    />
                    <StatCard
                      icon={<GraduationCap className="h-5 w-5" />}
                      label="Kurse erstellt"
                      value={siteStats.coursesCreatedLast30Days}
                    />
                    <StatCard
                      icon={<Users className="h-5 w-5" />}
                      label="Nutzer registriert"
                      value={siteStats.usersRegisteredLast30Days}
                    />
                    <StatCard
                      icon={<UserPlus className="h-5 w-5" />}
                      label="Kursanmeldungen"
                      value={siteStats.registrationsLast30Days}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="dark:bg-dark-surface overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-dark-border">
              <div className="border-b border-gray-200 px-4 py-3 dark:border-dark-border sm:px-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="text-primary h-5 w-5" />
                  <h2 className="dark:text-dark-text font-semibold text-gray-900">
                    Seitenaufrufe
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3 sm:px-6 sm:py-5">
                <div className="dark:bg-dark-background rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-dark-border">
                  <p className="dark:text-dark-muted text-sm text-gray-500">
                    Heute
                  </p>
                  <p className="dark:text-dark-text mt-1 text-2xl font-bold tabular-nums text-gray-900">
                    {stats.viewsToday.toLocaleString("de-DE")}
                  </p>
                </div>
                <div className="dark:bg-dark-background rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-dark-border">
                  <p className="dark:text-dark-muted text-sm text-gray-500">
                    Letzte 7 Tage
                  </p>
                  <p className="dark:text-dark-text mt-1 text-2xl font-bold tabular-nums text-gray-900">
                    {stats.viewsLast7Days.toLocaleString("de-DE")}
                  </p>
                </div>
                <div className="dark:bg-dark-background rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-dark-border">
                  <p className="dark:text-dark-muted text-sm text-gray-500">
                    Letzte 30 Tage
                  </p>
                  <p className="dark:text-dark-text mt-1 text-2xl font-bold tabular-nums text-gray-900">
                    {stats.viewsLast30Days.toLocaleString("de-DE")}
                  </p>
                </div>
              </div>
              {stats.viewsWithUser > 0 && (
                <div className="border-t border-gray-200 px-4 py-3 dark:border-dark-border sm:px-6">
                  <p className="dark:text-dark-muted text-sm text-gray-500">
                    davon mit Konto zugeordnet (gesamt):{" "}
                    <span className="dark:text-dark-text font-medium text-gray-700">
                      {stats.viewsWithUser.toLocaleString("de-DE")}
                    </span>
                  </p>
                </div>
              )}
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
                          <td className="dark:text-dark-text relative whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-900 sm:px-6">
                            <PathCountWithPopup
                              count={row.count}
                              path={row.path}
                              visitorDetails={
                                stats.pathVisitorDetails?.[row.path]
                              }
                            />
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
                            backgroundColor: isDark ? "#252b36" : "#ffffff",
                            color: isDark ? "#e4e6eb" : "#111827",
                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
                          }}
                          content={(props) => (
                            <ChartDayTooltipContent
                              {...props}
                              dayVisitorDetails={stats.dayVisitorDetails}
                              isDark={isDark}
                            />
                          )}
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
                          <td className="dark:text-dark-text relative whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-900 sm:px-6">
                            <PathCountWithPopup
                              count={row.count}
                              path={row.date}
                              visitorDetails={
                                stats.dayVisitorDetails?.[row.date]
                              }
                            />
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

const visitorDetailsShape = {
  topVisitors: [] as { userDisplayName: string; count: number }[],
  otherViews: 0,
  otherUsers: 0,
};

function ChartDayTooltipContent({
  active,
  payload,
  label,
  dayVisitorDetails,
  isDark,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
  dayVisitorDetails?: Record<string, typeof visitorDetailsShape>;
  isDark?: boolean;
}) {
  if (!active || !payload?.length || label == null) return null;
  const value = payload[0]?.value ?? 0;
  const details = dayVisitorDetails?.[label];
  const hasDetails =
    details &&
    (details.topVisitors.length > 0 || details.otherViews > 0);

  const bg = isDark ? "#252b36" : "#ffffff";
  const color = isDark ? "#e4e6eb" : "#111827";
  const border = isDark ? "#2d3340" : "#e5e7eb";
  const muted = isDark ? "#8a8d93" : "#6b7280";
  const borderMuted = isDark ? "#2d3340" : "#e5e7eb";

  return (
    <div
      className="min-w-48 rounded-lg px-3 py-2 shadow-lg"
      style={{
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
      }}
    >
      <p className="font-medium">Datum: {label}</p>
      <p className="text-sm" style={{ color: muted }}>
        Aufrufe: {value.toLocaleString("de-DE")}
      </p>
      {hasDetails && details && (
        <>
          <p
            className="mt-2 text-xs font-medium uppercase tracking-wider"
            style={{ color: muted }}
          >
            Mit Konto zugeordnet
          </p>
          <ul className="mt-1 space-y-0.5">
            {details.topVisitors.map((v, i) => (
              <li key={i} className="flex justify-between gap-4 text-sm">
                <span className="truncate" title={v.userDisplayName}>
                  {v.userDisplayName}
                </span>
                <span className="shrink-0 tabular-nums">
                  {v.count} {v.count === 1 ? "Aufruf" : "Aufrufe"}
                </span>
              </li>
            ))}
          </ul>
          {details.otherViews > 0 && (
            <p
              className="mt-1.5 border-t pt-1.5 text-xs"
              style={{ borderColor: borderMuted, color: muted }}
            >
              {details.otherViews.toLocaleString("de-DE")} Aufrufe von{" "}
              {details.otherUsers}{" "}
              {details.otherUsers === 1 ? "weiterem Nutzer" : "weiteren Nutzern"}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function PathCountWithPopup({
  count,
  visitorDetails,
}: {
  count: number;
  path: string;
  visitorDetails?: {
    topVisitors: { userDisplayName: string; count: number }[];
    otherViews: number;
    otherUsers: number;
  };
}) {
  const hasDetails =
    visitorDetails &&
    (visitorDetails.topVisitors.length > 0 ||
      visitorDetails.otherViews > 0);

  return (
    <span className="group relative inline-block">
      <span
        className={
          hasDetails
            ? "cursor-help border-b border-dotted border-gray-400 dark:border-gray-500"
            : ""
        }
      >
        {count.toLocaleString("de-DE")}
      </span>
      {hasDetails && visitorDetails && (
        <span
          role="tooltip"
          className="dark:bg-dark-surface dark:border-dark-border pointer-events-none absolute bottom-full right-0 z-50 mb-1 hidden w-56 rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-3 text-left shadow-lg group-hover:block"
        >
          <p className="dark:text-dark-muted mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
            Mit Konto zugeordnet
          </p>
          <ul className="space-y-1">
            {visitorDetails.topVisitors.map((v, i) => (
              <li
                key={i}
                className="dark:text-dark-text flex justify-between text-sm text-gray-900"
              >
                <span className="truncate pr-2" title={v.userDisplayName}>
                  {v.userDisplayName}
                </span>
                <span className="shrink-0 tabular-nums">
                  {v.count} {v.count === 1 ? "Aufruf" : "Aufrufe"}
                </span>
              </li>
            ))}
          </ul>
          {visitorDetails.otherViews > 0 && (
            <p className="dark:text-dark-muted mt-2 border-t border-gray-100 pt-2 text-sm text-gray-500 dark:border-dark-border">
              {visitorDetails.otherViews.toLocaleString("de-DE")} Aufrufe von{" "}
              {visitorDetails.otherUsers}{" "}
              {visitorDetails.otherUsers === 1 ? "weiterem Nutzer" : "weiteren Nutzern"}
            </p>
          )}
        </span>
      )}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="dark:bg-dark-background flex flex-col gap-1 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-dark-border">
      <span className="text-primary flex items-center gap-2">{icon}</span>
      <p className="dark:text-dark-text text-xl font-semibold tabular-nums text-gray-900">
        {value.toLocaleString("de-DE")}
      </p>
      <p className="dark:text-dark-muted text-xs text-gray-500">{label}</p>
    </div>
  );
}
