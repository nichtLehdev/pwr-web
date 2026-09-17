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
        "dashboard-sticky-shell-top border-rule dark:border-night-rule bg-rule/25 dark:bg-night-raised sticky z-30 -mx-1 mb-2 border px-2 py-2.5 backdrop-blur-md sm:-mx-0 sm:px-3",
        className,
      )}
    >
      <ul className="-mx-0.5 flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.href} className="px-0.5">
            <a
              href={item.href}
              className="border-rule dark:border-night-rule text-ink dark:text-night-text bg-paper dark:bg-night hover:bg-primary hover:text-ink inline-flex min-h-11 items-center border px-3 text-xs font-semibold whitespace-nowrap transition-colors sm:text-sm"
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
