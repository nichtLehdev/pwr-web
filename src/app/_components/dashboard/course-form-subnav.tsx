"use client";

import { cn } from "@/lib/utils";
import { scrollToCourseFormSection } from "./course-form-nav-utils";

export interface CourseFormNavItem {
  href: string;
  label: string;
}

interface CourseFormSubnavProps {
  items: CourseFormNavItem[];
  className?: string;
}

/**
 * Sticky horizontal links for long course create/edit forms.
 * Targets section wrappers with matching `id` (e.g. #kurs-form-inhalt).
 */
export function CourseFormSubnav({ items, className }: CourseFormSubnavProps) {
  return (
    <nav
      aria-label="Formularabschnitte"
      className={cn(
        /* top: padded main edge (--main-padding-top) + --dashboard-sticky-top-extra */
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
                scrollToCourseFormSection(item.href);
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
