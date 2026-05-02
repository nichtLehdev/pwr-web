"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CourseFormNavItem } from "./course-form-subnav";
import { CourseFormSubnav } from "./course-form-subnav";
import { CourseFormWorkbench } from "./course-form-workbench";

type DashboardSectionedFormLayoutProps = {
  /** Anchor targets (`#section-id`) must match section wrappers on the page */
  navItems: CourseFormNavItem[];
  children: ReactNode;
  /** Classes on the wrapper around `children` (vertical rhythm between sections) */
  contentClassName?: string;
  /** Extra classes on the horizontal subnav shown below `xl` */
  subnavClassName?: string;
};

/**
 * Long dashboard forms: horizontal subnav below the xl breakpoint and “Auf dieser Seite” rail from xl upward.
 * Uses {@link CourseFormWorkbench} spacing and sticky offsets.
 */
export function DashboardSectionedFormLayout({
  navItems,
  children,
  contentClassName,
  subnavClassName,
}: DashboardSectionedFormLayoutProps) {
  return (
    <CourseFormWorkbench railItems={navItems}>
      <CourseFormSubnav
        className={cn("xl:hidden", subnavClassName)}
        items={navItems}
      />
      <div className={contentClassName}>{children}</div>
    </CourseFormWorkbench>
  );
}
