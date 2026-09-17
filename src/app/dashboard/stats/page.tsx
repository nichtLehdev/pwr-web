"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import Link from "next/link";
import { DashboardPage } from "@/app/_components/dashboard";
import {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui/data-table";
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

type PathRow = RouterOutputs["stats"]["getStats"]["byPath"][number];
type SectionRow = RouterOutputs["stats"]["getStats"]["bySection"][number];

const pathColumn = createDataTableColumnHelper<PathRow>();
const sectionColumn = createDataTableColumnHelper<SectionRow>();

/** Zeitraum-Register über der Pfadtabelle — Unterstrich statt Kasten, wie bei „Meine Anmeldungen“. */
function periodButtonClass(active: boolean): string {
  return `semi-condensed inline-flex min-h-11 shrink-0 items-center gap-2 border-b-[3px] px-3 text-sm font-semibold whitespace-nowrap transition-colors ${
    active
      ? "border-primary text-ink dark:text-night-text"
      : "border-transparent text-dark hover:border-ink hover:text-ink dark:text-night-muted dark:hover:border-night-text dark:hover:text-night-text"
  }`;
}

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

  const pathColumns = useMemo<DataTableColumn<PathRow>[]>(
    () =>
      pathColumn.columns([
        pathColumn.accessor((row) => row.path || "/", {
          id: "path",
          header: "Pfad",
          meta: {
            alwaysVisible: true,
            cellClassName: "font-mono whitespace-nowrap",
          },
          cell: ({ row }) => (
            <Link
              href={row.original.path || "/"}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                }
              }}
              title="Strg+Klick (bzw. Cmd+Klick) zum Öffnen der Seite"
              className="hover:text-primary-ink dark:hover:text-primary inline-flex items-center gap-1.5 hover:underline"
            >
              {row.original.path || "/"}
              <ExternalLink
                className="h-3 w-3 shrink-0 opacity-60"
                aria-hidden
              />
            </Link>
          ),
        }),
        pathColumn.accessor((row) => row.count, {
          id: "count",
          header: "Aufrufe",
          meta: {
            align: "right",
            filterVariant: "number",
            cellClassName: "tabular-nums whitespace-nowrap",
          },
          cell: ({ row }) => (
            <PathCountWithPopup
              count={row.original.count}
              path={row.original.path}
              visitorDetails={stats?.pathVisitorDetails?.[row.original.path]}
            />
          ),
        }),
      ]),
    [stats?.pathVisitorDetails],
  );

  const sectionColumns = useMemo<DataTableColumn<SectionRow>[]>(
    () =>
      sectionColumn.columns([
        sectionColumn.accessor((row) => row.section ?? "", {
          id: "section",
          header: "Bereich",
          meta: { alwaysVisible: true, filterVariant: "set" },
        }),
        sectionColumn.accessor((row) => row.count, {
          id: "count",
          header: "Aufrufe",
          meta: {
            align: "right",
            filterVariant: "number",
            cellClassName: "tabular-nums whitespace-nowrap",
          },
          cell: ({ getValue }) => getValue().toLocaleString("de-DE"),
        }),
      ]),
    [],
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
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
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
          <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {siteStats && (
            <div className="border-rule dark:border-night-rule border">
              <div className="border-rule dark:border-night-rule border-b px-4 py-3 sm:px-6">
                <h2 className="text-ink dark:text-night-text font-semibold">
                  Übersicht: Inhalte &amp; Nutzung
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 sm:px-6 sm:py-5 lg:grid-cols-4">
                <StatCard
                  icon={<CalendarDays className="h-5 w-5" aria-hidden />}
                  label="Termine (veröffentlicht)"
                  value={siteStats.eventsCount}
                />
                <StatCard
                  icon={<GraduationCap className="h-5 w-5" aria-hidden />}
                  label="Kurse (veröffentlicht)"
                  value={siteStats.coursesCount}
                />
                <StatCard
                  icon={<Newspaper className="h-5 w-5" aria-hidden />}
                  label="Beiträge (veröffentlicht)"
                  value={siteStats.postsCount}
                />
                <StatCard
                  icon={<UserPlus className="h-5 w-5" aria-hidden />}
                  label="Kursanmeldungen (gesamt)"
                  value={siteStats.registrationsCount}
                />
                <StatCard
                  icon={<Mail className="h-5 w-5" aria-hidden />}
                  label="Newsletter-Abonnenten"
                  value={siteStats.newsletterActiveCount}
                />
                <StatCard
                  icon={<Users className="h-5 w-5" aria-hidden />}
                  label="Benutzer"
                  value={siteStats.usersCount}
                />
                <StatCard
                  icon={<Music className="h-5 w-5" aria-hidden />}
                  label="Ensembles (aktiv)"
                  value={siteStats.ensemblesCount}
                />
                <StatCard
                  icon={<MapPin className="h-5 w-5" aria-hidden />}
                  label="Veranstaltungsorte"
                  value={siteStats.locationsCount}
                />
              </div>
              <div className="border-rule dark:border-night-rule border-t px-4 pb-4 sm:px-6 sm:pb-5">
                <h3 className="text-dark dark:text-night-muted mt-4 mb-3 text-xs font-semibold tracking-wider uppercase">
                  Neu in den letzten 30 Tagen
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <StatCard
                    icon={<CalendarDays className="h-5 w-5" aria-hidden />}
                    label="Termine erstellt"
                    value={siteStats.eventsCreatedLast30Days}
                  />
                  <StatCard
                    icon={<GraduationCap className="h-5 w-5" aria-hidden />}
                    label="Kurse erstellt"
                    value={siteStats.coursesCreatedLast30Days}
                  />
                  <StatCard
                    icon={<Users className="h-5 w-5" aria-hidden />}
                    label="Nutzer registriert"
                    value={siteStats.usersRegisteredLast30Days}
                  />
                  <StatCard
                    icon={<UserPlus className="h-5 w-5" aria-hidden />}
                    label="Kursanmeldungen"
                    value={siteStats.registrationsLast30Days}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="border-rule dark:border-night-rule border">
            <div className="border-rule dark:border-night-rule border-b px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2">
                <BarChart3
                  className="text-ink dark:text-night-text h-5 w-5"
                  aria-hidden
                />
                <h2 className="text-ink dark:text-night-text font-semibold">
                  Seitenaufrufe
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3 sm:px-6 sm:py-5">
              <div className="bg-rule/25 dark:bg-night-raised p-4">
                <p className="text-dark dark:text-night-muted text-sm">Heute</p>
                <p className="text-ink dark:text-night-text mt-1 text-2xl font-bold tabular-nums">
                  {stats.viewsToday.toLocaleString("de-DE")}
                </p>
              </div>
              <div className="bg-rule/25 dark:bg-night-raised p-4">
                <p className="text-dark dark:text-night-muted text-sm">
                  Letzte 7 Tage
                </p>
                <p className="text-ink dark:text-night-text mt-1 text-2xl font-bold tabular-nums">
                  {stats.viewsLast7Days.toLocaleString("de-DE")}
                </p>
              </div>
              <div className="bg-rule/25 dark:bg-night-raised p-4">
                <p className="text-dark dark:text-night-muted text-sm">
                  Letzte 30 Tage
                </p>
                <p className="text-ink dark:text-night-text mt-1 text-2xl font-bold tabular-nums">
                  {stats.viewsLast30Days.toLocaleString("de-DE")}
                </p>
              </div>
            </div>
            {stats.viewsWithUser > 0 && (
              <div className="border-rule dark:border-night-rule border-t px-4 py-3 sm:px-6">
                <p className="text-dark dark:text-night-muted text-sm">
                  davon mit Konto zugeordnet (gesamt):{" "}
                  <span className="text-ink dark:text-night-text font-medium">
                    {stats.viewsWithUser.toLocaleString("de-DE")}
                  </span>
                </p>
              </div>
            )}
          </div>

          {stats.byPath.length > 0 && (
            <div className="border-rule dark:border-night-rule border">
              <div className="border-rule dark:border-night-rule border-b px-4 py-3 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText
                        className="text-ink dark:text-night-text h-5 w-5"
                        aria-hidden
                      />
                      <h2 className="text-ink dark:text-night-text font-semibold">
                        Aufrufe nach Seite
                      </h2>
                    </div>
                    <p className="text-dark dark:text-night-muted mt-1 text-xs">
                      Strg+Klick bzw. Cmd+Klick auf einen Pfad öffnet die Seite
                    </p>
                  </div>
                  <div
                    role="group"
                    aria-label="Zeitraum"
                    className="flex gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setPathPeriod("today");
                        setShowAllPaths(false);
                      }}
                      aria-pressed={pathPeriod === "today"}
                      className={periodButtonClass(pathPeriod === "today")}
                    >
                      Heute
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPathPeriod("last30Days");
                        setShowAllPaths(false);
                      }}
                      aria-pressed={pathPeriod === "last30Days"}
                      className={periodButtonClass(pathPeriod === "last30Days")}
                    >
                      30 Tage
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPathPeriod("overall");
                        setShowAllPaths(false);
                      }}
                      aria-pressed={pathPeriod === "overall"}
                      className={periodButtonClass(pathPeriod === "overall")}
                    >
                      Gesamt
                    </button>
                  </div>
                </div>
              </div>
              <DataTable
                data={showAllPaths ? stats.byPath : stats.byPath.slice(0, 5)}
                columns={pathColumns}
                getRowId={(row) => row.path}
                searchable={false}
                paginated={false}
                hideFooter
                className="[&_table]:min-w-full"
              />
              {stats.byPath.length > 5 && (
                <div className="border-rule dark:border-night-rule border-t px-4 py-2 sm:px-6">
                  <button
                    type="button"
                    onClick={() => setShowAllPaths((v) => !v)}
                    className="link-ink text-sm"
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
            <div className="border-rule dark:border-night-rule border">
              <div className="border-rule dark:border-night-rule border-b px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2">
                  <Layout
                    className="text-ink dark:text-night-text h-5 w-5"
                    aria-hidden
                  />
                  <h2 className="text-ink dark:text-night-text font-semibold">
                    Aufrufe nach Bereich
                  </h2>
                </div>
              </div>
              <DataTable
                data={stats.bySection}
                columns={sectionColumns}
                getRowId={(row) => row.section ?? ""}
                searchable={false}
                paginated={false}
                hideFooter
                className="[&_table]:min-w-full"
              />
            </div>
          )}

          {stats.recentDays.length > 0 && (
            <div className="border-rule dark:border-night-rule border">
              <div className="border-rule dark:border-night-rule border-b px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2">
                  <Calendar
                    className="text-ink dark:text-night-text h-5 w-5"
                    aria-hidden
                  />
                  <h2 className="text-ink dark:text-night-text font-semibold">
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
              <p className="text-dark dark:text-night-muted text-center">
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
            ? "border-dark dark:border-night-muted cursor-help border-b border-dotted"
            : ""
        }
      >
        {count.toLocaleString("de-DE")}
      </span>
      {hasDetails && visitorDetails && (
        <span
          role="tooltip"
          className="border-ink dark:border-night-text bg-paper dark:bg-night-raised pointer-events-none absolute right-0 bottom-full z-50 mb-1 hidden w-56 border-2 py-2 pr-3 pl-3 text-left group-hover:block"
        >
          <p className="text-dark dark:text-night-muted mb-2 text-xs font-medium tracking-wider uppercase">
            Mit Konto zugeordnet
          </p>
          <ul className="space-y-1">
            {visitorDetails.topVisitors.map((v, i) => (
              <li
                key={i}
                className="text-ink dark:text-night-text flex justify-between text-sm"
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
            <p className="text-dark dark:text-night-muted border-rule dark:border-night-rule mt-2 border-t pt-2 text-sm">
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
    <div className="bg-rule/25 dark:bg-night-raised flex flex-col gap-1 p-3">
      <span className="text-dark dark:text-night-muted flex items-center gap-2">
        {icon}
      </span>
      <p className="text-ink dark:text-night-text text-xl font-semibold tabular-nums">
        {value.toLocaleString("de-DE")}
      </p>
      <p className="text-dark dark:text-night-muted text-xs">{label}</p>
    </div>
  );
}
