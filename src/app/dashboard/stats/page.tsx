"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { DashboardPage } from "@/app/_components/dashboard";
import {
  BarChart3,
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
  ExternalLink,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "@/app/_components/general/theme-provider";

// Lazy: keeps recharts out of the initial bundle.
const DailyViewsChart = dynamic(
  () => import("./_components/daily-views-chart"),
  {
    ssr: false,
    loading: () => <div className="h-full w-full" />,
  },
);

export default function StatsPage() {
  const { data: session, isPending } = useSession();
  const { resolvedTheme } = useTheme();
  const hasRedirected = useRef(false);
  const isDark = resolvedTheme === "dark";
  const { data: canView, isLoading: canViewLoading } =
    api.stats.canViewStats.useQuery(undefined, {
      enabled: !!session?.user,
    });
  const [pathPeriod, setPathPeriod] = useState<
    "today" | "last30Days" | "overall"
  >("last30Days");
  const [showAllPaths, setShowAllPaths] = useState(false);
  const { data: stats, isLoading: statsLoading } = api.stats.getStats.useQuery(
    { pathPeriod },
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
    <DashboardPage
      title="Statistik"
      description="Seitenaufrufe (anonym bzw. mit Konto, je nach Einwilligung) sowie Übersicht über Inhalte und Nutzung."
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Statistik" },
      ]}
      maxWidth="7xl"
    >
      {statsLoading || siteStatsLoading ? (
        <div className="flex justify-center py-12">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
        </div>
      ) : stats ? (
        <div className="space-y-8">
          {siteStats && (
            <div className="dark:bg-dark-surface dark:border-dark-border overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="dark:border-dark-border border-b border-gray-200 px-4 py-3 sm:px-6">
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
              <div className="dark:border-dark-border border-t border-gray-200 px-4 pb-4 sm:px-6 sm:pb-5">
                <h3 className="dark:text-dark-muted mt-4 mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">
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

          <div className="dark:bg-dark-surface dark:border-dark-border overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="dark:border-dark-border border-b border-gray-200 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-primary h-5 w-5" />
                <h2 className="dark:text-dark-text font-semibold text-gray-900">
                  Seitenaufrufe
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3 sm:px-6 sm:py-5">
              <div className="dark:bg-dark-background dark:border-dark-border rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="dark:text-dark-muted text-sm text-gray-500">
                  Heute
                </p>
                <p className="dark:text-dark-text mt-1 text-2xl font-bold text-gray-900 tabular-nums">
                  {stats.viewsToday.toLocaleString("de-DE")}
                </p>
              </div>
              <div className="dark:bg-dark-background dark:border-dark-border rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="dark:text-dark-muted text-sm text-gray-500">
                  Letzte 7 Tage
                </p>
                <p className="dark:text-dark-text mt-1 text-2xl font-bold text-gray-900 tabular-nums">
                  {stats.viewsLast7Days.toLocaleString("de-DE")}
                </p>
              </div>
              <div className="dark:bg-dark-background dark:border-dark-border rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="dark:text-dark-muted text-sm text-gray-500">
                  Letzte 30 Tage
                </p>
                <p className="dark:text-dark-text mt-1 text-2xl font-bold text-gray-900 tabular-nums">
                  {stats.viewsLast30Days.toLocaleString("de-DE")}
                </p>
              </div>
            </div>
            {stats.viewsWithUser > 0 && (
              <div className="dark:border-dark-border border-t border-gray-200 px-4 py-3 sm:px-6">
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
            <div className="dark:bg-dark-surface dark:border-dark-border overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="dark:border-dark-border border-b border-gray-200 px-4 py-3 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="text-primary h-5 w-5" />
                      <h2 className="dark:text-dark-text font-semibold text-gray-900">
                        Aufrufe nach Seite
                      </h2>
                    </div>
                    <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                      Strg+Klick bzw. Cmd+Klick auf einen Pfad öffnet die Seite
                    </p>
                  </div>
                  <div className="dark:border-dark-border flex rounded-lg border border-gray-200 p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPathPeriod("today");
                        setShowAllPaths(false);
                      }}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                        pathPeriod === "today"
                          ? "bg-primary text-white"
                          : "dark:text-dark-muted dark:hover:bg-dark-background text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      Heute
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPathPeriod("last30Days");
                        setShowAllPaths(false);
                      }}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                        pathPeriod === "last30Days"
                          ? "bg-primary text-white"
                          : "dark:text-dark-muted dark:hover:bg-dark-background text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      30 Tage
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPathPeriod("overall");
                        setShowAllPaths(false);
                      }}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                        pathPeriod === "overall"
                          ? "bg-primary text-white"
                          : "dark:text-dark-muted dark:hover:bg-dark-background text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      Gesamt
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="dark:divide-dark-border min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="dark:bg-dark-surface dark:text-dark-text bg-gray-50 px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase sm:px-6">
                        Pfad
                      </th>
                      <th className="dark:bg-dark-surface dark:text-dark-text bg-gray-50 px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase sm:px-6">
                        Aufrufe
                      </th>
                    </tr>
                  </thead>
                  <tbody className="dark:divide-dark-border divide-y divide-gray-200">
                    {(showAllPaths
                      ? stats.byPath
                      : stats.byPath.slice(0, 5)
                    ).map((row) => (
                      <tr key={row.path}>
                        <td className="dark:text-dark-text px-4 py-3 font-mono text-sm whitespace-nowrap text-gray-900 sm:px-6">
                          <Link
                            href={row.path || "/"}
                            onClick={(e) => {
                              if (!e.ctrlKey && !e.metaKey) {
                                e.preventDefault();
                              }
                            }}
                            title="Strg+Klick (bzw. Cmd+Klick) zum Öffnen der Seite"
                            className="hover:text-primary dark:hover:text-primary inline-flex items-center gap-1.5 hover:underline"
                          >
                            {row.path || "/"}
                            <ExternalLink
                              className="h-3 w-3 shrink-0 opacity-60"
                              aria-hidden
                            />
                          </Link>
                        </td>
                        <td className="dark:text-dark-text relative px-4 py-3 text-right whitespace-nowrap text-gray-900 tabular-nums sm:px-6">
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
              {stats.byPath.length > 5 && (
                <div className="dark:border-dark-border border-t border-gray-200 px-4 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => setShowAllPaths((v) => !v)}
                    className="dark:text-primary text-primary text-sm font-medium hover:underline"
                  >
                    {showAllPaths
                      ? "Weniger anzeigen"
                      : `Alle anzeigen (${stats.byPath.length})`}
                  </button>
                </div>
              )}
            </div>
          )}

          {stats.bySection.length > 0 && (
            <div className="dark:bg-dark-surface dark:border-dark-border overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="dark:border-dark-border border-b border-gray-200 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2">
                  <Layout className="text-primary h-5 w-5" />
                  <h2 className="dark:text-dark-text font-semibold text-gray-900">
                    Aufrufe nach Bereich
                  </h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="dark:divide-dark-border min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="dark:bg-dark-surface dark:text-dark-text bg-gray-50 px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase sm:px-6">
                        Bereich
                      </th>
                      <th className="dark:bg-dark-surface dark:text-dark-text bg-gray-50 px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase sm:px-6">
                        Aufrufe
                      </th>
                    </tr>
                  </thead>
                  <tbody className="dark:divide-dark-border divide-y divide-gray-200">
                    {stats.bySection.map((row) => (
                      <tr key={row.section ?? ""}>
                        <td className="dark:text-dark-text px-4 py-3 text-sm whitespace-nowrap text-gray-900 sm:px-6">
                          {row.section}
                        </td>
                        <td className="dark:text-dark-text px-4 py-3 text-right whitespace-nowrap text-gray-900 tabular-nums sm:px-6">
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
            <div className="dark:bg-dark-surface dark:border-dark-border overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="dark:border-dark-border border-b border-gray-200 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2">
                  <Calendar className="text-primary h-5 w-5" />
                  <h2 className="dark:text-dark-text font-semibold text-gray-900">
                    Aufrufe pro Tag (letzte 30 Tage)
                  </h2>
                </div>
              </div>
              <div className="px-4 py-6 sm:px-6">
                <div className="h-64 w-full">
                  <DailyViewsChart
                    recentDays={stats.recentDays}
                    dayVisitorDetails={stats.dayVisitorDetails}
                    isDark={isDark}
                  />
                </div>
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
    </DashboardPage>
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
    (visitorDetails.topVisitors.length > 0 || visitorDetails.otherViews > 0);

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
          className="dark:bg-dark-surface dark:border-dark-border pointer-events-none absolute right-0 bottom-full z-50 mb-1 hidden w-56 rounded-lg border border-gray-200 bg-white py-2 pr-3 pl-3 text-left shadow-lg group-hover:block"
        >
          <p className="dark:text-dark-muted mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">
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
            <p className="dark:text-dark-muted dark:border-dark-border mt-2 border-t border-gray-100 pt-2 text-sm text-gray-500">
              {visitorDetails.otherViews.toLocaleString("de-DE")} Aufrufe von{" "}
              {visitorDetails.otherUsers}{" "}
              {visitorDetails.otherUsers === 1
                ? "weiterem Nutzer"
                : "weiteren Nutzern"}
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
    <div className="dark:bg-dark-background dark:border-dark-border flex flex-col gap-1 rounded-lg border border-gray-100 bg-gray-50 p-3">
      <span className="text-primary flex items-center gap-2">{icon}</span>
      <p className="dark:text-dark-text text-xl font-semibold text-gray-900 tabular-nums">
        {value.toLocaleString("de-DE")}
      </p>
      <p className="dark:text-dark-muted text-xs text-gray-500">{label}</p>
    </div>
  );
}
