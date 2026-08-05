"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, type LucideIcon } from "lucide-react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import {
  getVisibleNavGroups,
  type DashboardNavContext,
} from "./dashboard-nav-items";

/**
 * Persistent, permission-filtered navigation for /dashboard/**.
 *
 * Desktop (lg+): sticky left sidebar below the fixed site header (offset via
 * `--main-padding-top`, set on <main> by MainContent). Below lg: horizontal
 * scrollable pill bar above the page content. Rendered as a fragment — the
 * dashboard layout arranges both via `flex-col lg:flex-row`.
 */
export default function DashboardSidebar() {
  const pathname = usePathname();
  const { hasPermission, hasAnyPermission } = usePermissions();
  const { data: canViewStats } = api.stats.canViewStats.useQuery();
  const { data: canManagePermissions } = api.permissions.canManage.useQuery();

  const ctx: DashboardNavContext = {
    hasPermission,
    hasAnyPermission,
    canViewStats: canViewStats ?? false,
    canManagePermissions: canManagePermissions ?? false,
  };

  const groups = getVisibleNavGroups(ctx);

  const overview = {
    title: "Übersicht",
    href: "/dashboard",
    icon: LayoutDashboard,
  };
  const website = { title: "Zur Webseite", href: "/", icon: Home };

  // Active item = the nav href that is the longest path-prefix of the current
  // pathname ("/dashboard/courses/xyz" → "Kurse"; plain "/dashboard" only
  // matches "Übersicht" exactly, since every other href is longer).
  const navHrefs = [
    overview.href,
    ...groups.flatMap((group) => group.items.map((item) => item.href)),
  ];
  const activeHref = navHrefs.reduce<string | null>((best, href) => {
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (!matches) return best;
    return best === null || href.length > best.length ? href : best;
  }, null);

  return (
    <>
      {/* Desktop sidebar (lg and up) */}
      <aside className="dark:border-dark-border dark:bg-dark-surface hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
        <nav
          aria-label="Dashboard-Navigation"
          className="sticky overflow-y-auto px-3 py-6"
          style={{
            top: "var(--main-padding-top, 5rem)",
            maxHeight: "calc(100vh - var(--main-padding-top, 5rem))",
          }}
        >
          <SidebarLink
            title={overview.title}
            href={overview.href}
            icon={overview.icon}
            active={activeHref === overview.href}
          />
          {groups.map((group) => (
            <div key={group.title} className="mt-6">
              <p className="px-3 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                {group.title}
              </p>
              <ul className="mt-2 space-y-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <SidebarLink
                      title={item.title}
                      href={item.href}
                      icon={item.icon}
                      active={activeHref === item.href}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="dark:border-dark-border mt-6 border-t border-gray-200 pt-4">
            <SidebarLink
              title={website.title}
              href={website.href}
              icon={website.icon}
              active={false}
            />
          </div>
        </nav>
      </aside>

      {/* Mobile / tablet pill bar (below lg) */}
      <nav
        aria-label="Dashboard-Navigation"
        className="dark:border-dark-border dark:bg-dark-surface border-b border-gray-200 bg-white lg:hidden"
      >
        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          <PillLink
            title={overview.title}
            href={overview.href}
            active={activeHref === overview.href}
          />
          {groups.flatMap((group) =>
            group.items.map((item) => (
              <PillLink
                key={item.href}
                title={item.title}
                href={item.href}
                active={activeHref === item.href}
              />
            )),
          )}
          <PillLink title={website.title} href={website.href} active={false} />
        </div>
      </nav>
    </>
  );
}

function SidebarLink({
  title,
  href,
  icon: Icon,
  active,
}: {
  title: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`focus-visible:ring-primary flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
        active
          ? "bg-primary/10 text-primary"
          : "dark:hover:bg-dark-background-secondary text-gray-700 hover:bg-gray-50 dark:text-gray-300"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{title}</span>
    </Link>
  );
}

function PillLink({
  title,
  href,
  active,
}: {
  title: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`focus-visible:ring-primary shrink-0 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none ${
        active
          ? "bg-primary/10 text-primary"
          : "dark:hover:bg-dark-background-secondary text-gray-700 hover:bg-gray-50 dark:text-gray-300"
      }`}
    >
      {title}
    </Link>
  );
}
