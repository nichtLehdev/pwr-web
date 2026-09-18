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
 * Permission-filtered navigation for /dashboard/**: sticky sidebar from lg (offset via
 * `--main-padding-top`), a scrollable bar below. Fragment — the layout arranges both.
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

  // Active item = the href that is the longest path-prefix of the pathname.
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
      <aside className="programm font-programm border-rule dark:border-night-rule bg-rule/25 dark:bg-night-raised hidden w-64 shrink-0 border-r lg:block">
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
              <p className="semi-condensed text-dark dark:text-night-muted px-3 text-xs font-semibold tracking-wider uppercase">
                {group.title}
              </p>
              <ul className="mt-2 space-y-0.5">
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
          <div className="border-rule dark:border-night-rule mt-6 border-t pt-4">
            <SidebarLink
              title={website.title}
              href={website.href}
              icon={website.icon}
              active={false}
            />
          </div>
        </nav>
      </aside>

      <nav
        aria-label="Dashboard-Navigation"
        className="programm font-programm border-rule dark:border-night-rule bg-rule/25 dark:bg-night-raised border-b lg:hidden"
      >
        <div className="flex gap-1 overflow-x-auto px-4 py-2">
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

/** Tinte auf Orange im aktiven Zustand — nie Orange als Schriftfarbe. */
const AKTIV = "on-orange bg-primary text-ink";
const RUHEND =
  "text-ink dark:text-night-text hover:bg-rule/60 dark:hover:bg-night-rule";

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
      className={`semi-condensed flex min-h-11 items-center gap-3 px-3 py-2 text-sm font-semibold transition-colors ${
        active ? AKTIV : RUHEND
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
      className={`semi-condensed inline-flex min-h-11 shrink-0 items-center px-3 text-sm font-semibold whitespace-nowrap transition-colors ${
        active ? AKTIV : RUHEND
      }`}
    >
      {title}
    </Link>
  );
}
