"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import {
  getVisibleNavGroups,
  type DashboardNavContext,
} from "@/app/_components/dashboard/dashboard-nav-items";
import Link from "next/link";
import {
  Calendar,
  FileText,
  Settings,
  Home,
  Info,
  HelpCircle,
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
  const { hasDashboardAccess, hasPermission, hasAnyPermission } =
    usePermissions();

  const navContext: DashboardNavContext = {
    hasPermission,
    hasAnyPermission,
    canViewStats: canViewStats ?? false,
    canManagePermissions: canManagePermissions ?? false,
  };

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
            {/* Permission-filtered sections from the shared nav model */}
            {getVisibleNavGroups(navContext).map((group) => (
              <section key={group.title} className="mb-8">
                <div className="dark:bg-dark-surface rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <h2 className="text-dark dark:text-dark-text text-lg font-semibold">
                      {group.title}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {group.description}
                    </p>
                  </div>
                  <div className="p-6">
                    <div
                      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
                        group.cardColumns === 3
                          ? "lg:grid-cols-3"
                          : "lg:grid-cols-4"
                      }`}
                    >
                      {group.items.map((item) => (
                        <DashboardCard
                          key={item.href}
                          title={item.title}
                          description={item.description}
                          icon={<item.icon className="h-5 w-5" />}
                          href={item.href}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ))}

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
