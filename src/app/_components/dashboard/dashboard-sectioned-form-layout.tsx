"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { DashboardSectionNavItem } from "./dashboard-form-sticky-subnav";
import { DashboardFormStickySubnav } from "./dashboard-form-sticky-subnav";
import { DashboardFormSectionLayout } from "./dashboard-form-section-layout";

type DashboardSectionedFormLayoutProps = {
  /** Anchor targets (`#section-id`) must match section wrappers on the page */
  navItems: DashboardSectionNavItem[];
  children: ReactNode;
  /** Classes on the wrapper around `children` (vertical rhythm between sections) */
  contentClassName?: string;
  /** Extra classes on the horizontal subnav shown below xl */
  subnavClassName?: string;
};

/**
 * Long dashboard forms: sticky pill subnav below xl and numbered “Auf dieser Seite” rail from xl up.
 */
export function DashboardSectionedFormLayout({
  navItems,
  children,
  contentClassName,
  subnavClassName,
}: DashboardSectionedFormLayoutProps) {
  return (
    <DashboardFormSectionLayout railItems={navItems}>
      <DashboardFormStickySubnav
        className={cn("xl:hidden", subnavClassName)}
        items={navItems}
      />
      <div className={contentClassName}>{children}</div>
    </DashboardFormSectionLayout>
  );
}
