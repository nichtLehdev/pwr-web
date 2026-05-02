"use client";

import { cn } from "@/lib/utils";
import { scrollToDashboardSection } from "./dashboard-form-scroll";

export interface DashboardSectionNavItem {
  href: string;
  label: string;
}

interface DashboardFormStickySubnavProps {
  items: DashboardSectionNavItem[];
  className?: string;
}

/** Sticky horizontal jumps for sectioned dashboard forms under the xl breakpoint. */
export function DashboardFormStickySubnav({
  items,
  className,
}: DashboardFormStickySubnavProps) {
  return (
    <nav
      aria-label="Formularabschnitte"
      className={cn(
        "dark:border-dark-border sticky top-[calc(var(--main-padding-top,5rem)+var(--dashboard-sticky-top-extra))] z-30 -mx-1 mb-2 rounded-lg border border-gray-200 bg-gray-50/95 px-2 py-2.5 shadow-sm backdrop-blur-md dark:bg-dark-background/95 sm:-mx-0 sm:px-3",
        className,
      )}
    >
      <ul className="-mx-0.5 flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.href} className="px-0.5">
            <a
              href={item.href}
              className="dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-surface inline-flex rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:border-primary hover:text-primary dark:bg-dark-surface sm:text-sm"
              onClick={(e) => {
                e.preventDefault();
                scrollToDashboardSection(item.href);
              }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
