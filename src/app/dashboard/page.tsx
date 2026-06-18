"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import Link from "next/link";
import {
  Calendar,
  GraduationCap,
  FileText,
  Clock,
  Map,
  Users,
  User,
  Music,
  MapPin,
  Settings,
  Home,
  Info,
  HelpCircle,
  BadgeCheck,
  Heart,
  ImageIcon,
  Download,
  BookOpen,
  Mail,
  Layout,
  BarChart3,
  Shield,
  ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });
  const { data: canViewStats } = api.stats.canViewStats.useQuery(undefined, {
    enabled: !!session?.user && !!profile,
  });
  const { data: canManagePermissions } = api.permissions.canManage.useQuery(
    undefined,
    {
      enabled: !!session?.user && !!profile,
    },
  );

  // Check if user has any dashboard permissions
  const { hasDashboardAccess } = usePermissions();

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard");
    }
  }, [isPending, session]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !hasDashboardAccess &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      redirect("/");
    }
  }, [profile, profileLoading, hasDashboardAccess]);

  if (isPending || profileLoading) {
    return (
      <div className="bg-background-secondary dark:bg-dark-background-secondary flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !hasDashboardAccess) {
    return null;
  }

  const displayName =
    profile?.displayName ??
    profile?.firstName ??
    session.user.name?.split(" ")[0] ??
    "User";

  return (
    <main className="bg-background-secondary dark:bg-dark-background-secondary min-h-[calc(100vh-4rem)]">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-dark dark:text-dark-text text-3xl font-bold">
            Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Willkommen zurück, {displayName}!
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main Content */}
          <div className="lg:col-span-12">
            {/* Content Management */}
            <section className="mb-8">
              <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                  <h2 className="text-dark dark:text-dark-text text-lg font-semibold">
                    Inhalte
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Verwalte Veranstaltungen, Kurse, Beiträge und mehr
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <DashboardCard
                      title="Termine"
                      description="Veranstaltungen verwalten"
                      icon={<Calendar className="h-5 w-5" />}
                      href="/dashboard/events"
                    />
                    <DashboardCard
                      title="Kurse"
                      description="Kurse & Anmeldungen"
                      icon={<GraduationCap className="h-5 w-5" />}
                      href="/dashboard/courses"
                    />
                    <DashboardCard
                      title="Beiträge"
                      description="News & Artikel"
                      icon={<FileText className="h-5 w-5" />}
                      href="/dashboard/posts"
                    />
                    <DashboardCard
                      title="Geschichte"
                      description="Historische Ereignisse"
                      icon={<Clock className="h-5 w-5" />}
                      href="/dashboard/history"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Organization - Users with manage permissions */}
            {canManagePermissions && (
              <section className="mb-8">
                <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <h2 className="text-dark dark:text-dark-text text-lg font-semibold">
                      Organisation
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Bezirke, Ensembles, Auswahlchöre und Veranstaltungsorte
                    </p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <DashboardCard
                        title="Bezirke"
                        description="Bezirke & Regionen"
                        icon={<Map className="h-5 w-5" />}
                        href="/dashboard/bezirke"
                      />
                      <DashboardCard
                        title="Ensembles"
                        description="Bläsergruppen"
                        icon={<Users className="h-5 w-5" />}
                        href="/dashboard/ensembles"
                      />
                      <DashboardCard
                        title="Auswahlchöre"
                        description="Auswahlchöre verwalten"
                        icon={<Music className="h-5 w-5" />}
                        href="/dashboard/auswahlchoere"
                      />
                      <DashboardCard
                        title="Veranstaltungsorte"
                        description="Locations verwalten"
                        icon={<MapPin className="h-5 w-5" />}
                        href="/dashboard/locations"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* People - Users with manage permissions */}
            {canManagePermissions && (
              <section className="mb-8">
                <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <h2 className="text-dark dark:text-dark-text text-lg font-semibold">
                      Personen & Gremien
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Benutzer, Vorstand, Team und weitere Gremien verwalten
                    </p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <DashboardCard
                        title="Benutzer"
                        description="Benutzerkonten verwalten"
                        icon={<User className="h-5 w-5" />}
                        href="/dashboard/users"
                      />
                      <DashboardCard
                        title="Vorstand"
                        description="Vorstandsmitglieder"
                        icon={<Users className="h-5 w-5" />}
                        href="/dashboard/vorstand"
                      />
                      <DashboardCard
                        title="Team"
                        description="Teammitglieder"
                        icon={<Users className="h-5 w-5" />}
                        href="/dashboard/team"
                      />
                      <DashboardCard
                        title="Posaunenrat"
                        description="Posaunenratsmitglieder"
                        icon={<BadgeCheck className="h-5 w-5" />}
                        href="/dashboard/posaunenrat"
                      />
                      <DashboardCard
                        title="Förderverein"
                        description="Fördervereins-Mitglieder"
                        icon={<Heart className="h-5 w-5" />}
                        href="/dashboard/foerderverein"
                      />
                      <DashboardCard
                        title="Posaunenwarte"
                        description="LPW & RPW verwalten"
                        icon={<Music className="h-5 w-5" />}
                        href="/dashboard/posaunenwarte"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Media & Resources - Users with manage permissions */}
            {canManagePermissions && (
              <section className="mb-8">
                <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <h2 className="text-dark dark:text-dark-text text-lg font-semibold">
                      Medien & Ressourcen
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Medien, Downloads, Bläserhefte und Newsletter
                    </p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <DashboardCard
                        title="Homepage"
                        description="Homepage Bildkarussell"
                        icon={<Layout className="h-5 w-5" />}
                        href="/dashboard/homepage"
                      />
                      <DashboardCard
                        title="Medien"
                        description="Bilder & Dateien"
                        icon={<ImageIcon className="h-5 w-5" />}
                        href="/dashboard/media"
                      />
                      <DashboardCard
                        title="Downloads"
                        description="Downloadbare Dateien"
                        icon={<Download className="h-5 w-5" />}
                        href="/dashboard/downloads"
                      />
                      <DashboardCard
                        title="Bläserhefte"
                        description="Notenhefte verwalten"
                        icon={<BookOpen className="h-5 w-5" />}
                        href="/dashboard/blaeserhefte"
                      />
                      {canManagePermissions && (
                        <DashboardCard
                          title="Newsletter"
                          description="Abonnenten verwalten"
                          icon={<Mail className="h-5 w-5" />}
                          href="/dashboard/newsletter"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* System & Verwaltung - Stats & Permissions */}
            {(canManagePermissions || canViewStats) && (
              <section className="mb-8">
                <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <h2 className="text-dark dark:text-dark-text text-lg font-semibold">
                      System & Verwaltung
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Statistiken, Berechtigungen und Datenverwaltung
                    </p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {canManagePermissions && (
                        <DashboardCard
                          title="Export & Import"
                          description="Daten exportieren und importieren"
                          icon={<Download className="h-5 w-5" />}
                          href="/dashboard/export-import"
                        />
                      )}
                      {canViewStats && (
                        <DashboardCard
                          title="Statistik"
                          description="Anonyme Seitenaufrufe"
                          icon={<BarChart3 className="h-5 w-5" />}
                          href="/dashboard/stats"
                        />
                      )}
                      {canManagePermissions && (
                        <DashboardCard
                          title="Berechtigungen"
                          description="Rollen & Berechtigungen verwalten"
                          icon={<Shield className="h-5 w-5" />}
                          href="/dashboard/permissions"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Quick Links */}
            <section>
              <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                  <h2 className="text-dark dark:text-dark-text text-lg font-semibold">
                    Schnellzugriff
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Häufig verwendete Links und Funktionen
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <QuickLink
                      title="Einstellungen"
                      href="/settings"
                      icon={<Settings className="h-4 w-4" />}
                    />
                    <QuickLink
                      title="Zur Webseite"
                      href="/"
                      icon={<Home className="h-4 w-4" />}
                    />
                    <QuickLink
                      title="Termine"
                      href="/termine"
                      icon={<Calendar className="h-4 w-4" />}
                    />
                    <QuickLink
                      title="Aktuelles"
                      href="/aktuelles"
                      icon={<FileText className="h-4 w-4" />}
                    />
                    <QuickLink
                      title="Über uns"
                      href="/ueber-uns"
                      icon={<Info className="h-4 w-4" />}
                    />
                    <QuickLink
                      title="Hilfe"
                      href="/kontakt"
                      icon={<HelpCircle className="h-4 w-4" />}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  description,
  icon,
  href,
  comingSoon = false,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  comingSoon?: boolean;
}) {
  const content = (
    <div
      className={`group relative flex h-full flex-col rounded-lg border p-4 transition-all ${
        comingSoon
          ? "dark:border-dark-border cursor-not-allowed border-gray-200 bg-gray-50 opacity-60 dark:bg-gray-800/30"
          : "dark:border-dark-border dark:bg-dark-background-secondary hover:border-primary dark:hover:border-primary border-gray-200 bg-white hover:shadow-md"
      }`}
    >
      {comingSoon && (
        <span className="absolute top-2 right-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Bald
        </span>
      )}
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
          comingSoon
            ? "dark:bg-dark-border bg-gray-100 text-gray-400"
            : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"
        }`}
      >
        {icon}
      </div>
      <h3 className="text-dark dark:text-dark-text mb-1 font-semibold">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      {!comingSoon && (
        <div className="text-primary mt-3 flex items-center text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100">
          Öffnen
          <ArrowRight className="ml-1 h-4 w-4" />
        </div>
      )}
    </div>
  );

  if (comingSoon) {
    return content;
  }

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}

function QuickLink({
  title,
  href,
  icon,
}: {
  title: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-all dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
    >
      <span className="group-hover:text-primary dark:group-hover:text-primary text-gray-400 transition-colors dark:text-gray-500">
        {icon}
      </span>
      {title}
    </Link>
  );
}
