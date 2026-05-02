"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { CalendarDays, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CourseFormNavItem } from "./course-form-subnav";
import { scrollToCourseFormSection } from "./course-form-nav-utils";

export function CourseFormZoneHeader({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  const n = String(step).padStart(2, "0");
  return (
    <header className="mb-10 max-w-2xl">
      <p className="text-primary text-[11px] font-semibold tracking-[0.22em] uppercase">
        Abschnitt {n}
      </p>
      <h2 className="text-dark dark:text-dark-text mt-2 text-2xl font-bold tracking-tight">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </header>
  );
}

export function CourseFormBlock({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="border-primary/35 dark:border-primary/45 border-l-2 py-0.5 pl-4">
        <h3 className="text-dark dark:text-dark-text text-base font-semibold">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function CourseFormEditMetaBar({
  startDate,
  startTime,
  endDate,
  endTime,
  courseId,
}: {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  courseId: string;
}) {
  let rangeLabel: string | null = null;
  if (startDate && endDate) {
    try {
      const a = new Date(`${startDate}T${startTime || "00:00"}`);
      const b = new Date(`${endDate}T${endTime || "00:00"}`);
      if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime())) {
        const o: Intl.DateTimeFormatOptions = {
          day: "numeric",
          month: "short",
          year: "numeric",
        };
        rangeLabel = `${a.toLocaleDateString("de-DE", o)} · ${b.toLocaleDateString("de-DE", o)}`;
      }
    } catch {
      rangeLabel = null;
    }
  }

  return (
    <div
      className="dark:border-dark-border mb-8 flex flex-col gap-4 rounded-2xl border border-gray-200/90 bg-linear-to-br from-white via-gray-50/40 to-emerald-50/30 px-4 py-4 dark:from-dark-surface dark:via-dark-background dark:to-primary/15 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
      role="region"
      aria-label="Kurskontext"
    >
      <div className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
        <CalendarDays
          className="text-primary mt-0.5 h-4 w-4 shrink-0 opacity-90"
          aria-hidden
        />
        {rangeLabel ? (
          <span className="font-medium">{rangeLabel}</span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">
            Termin ergänzen, um die Zeitspanne hier zu sehen
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="text-dark dark:text-dark-text font-medium underline-offset-4 hover:underline"
        >
          Zur Kursübersicht
        </Link>
        <Link
          href={`/mitmachen/kurse/${courseId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline"
        >
          Öffentliche Seite
          <ExternalLink className="h-3.5 w-3.5 opacity-90" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

export function CourseFormStoryRail({
  items,
  className,
}: {
  items: CourseFormNavItem[];
  className?: string;
}) {
  const [active, setActive] = useState(items[0]?.href ?? "");

  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.href.slice(1)))
      .filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        let best = visible[0]!;
        for (const e of visible) {
          if (e.intersectionRatio > best.intersectionRatio) best = e;
        }
        setActive(`#${best.target.id}`);
      },
      {
        root: null,
        rootMargin: "-10% 0px -52% 0px",
        threshold: [0, 0.08, 0.2, 0.35, 0.55, 0.75, 1],
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Abschnitte"
      className={cn(
        /* Shell + breathing room (--dashboard-sticky-top-extra); 9rem fallback ≈ former top-36 */
        "hidden xl:block xl:self-start xl:sticky xl:top-[calc(var(--main-padding-top,9rem)+var(--dashboard-sticky-top-extra))]",
        className,
      )}
    >
      <p className="dark:text-dark-muted mb-4 text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
        Auf dieser Seite
      </p>
      <ol className="space-y-0.5">
        {items.map((item, i) => {
          const isActive = active === item.href;
          const num = String(i + 1).padStart(2, "0");
          return (
            <li key={item.href}>
              <a
                href={item.href}
                className={cn(
                  "group hover:border-primary/50 -ml-px flex items-baseline gap-2 border-l-2 border-transparent py-2 pl-3 text-sm transition-colors",
                  isActive
                    ? "border-primary text-primary font-semibold"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100",
                )}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToCourseFormSection(item.href);
                }}
              >
                <span
                  className={cn(
                    "w-6 font-mono text-[10px] transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-400",
                  )}
                >
                  {num}
                </span>
                <span className="min-w-0 leading-snug">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function CourseFormWorkbench({
  railItems,
  children,
}: {
  railItems: CourseFormNavItem[];
  children: ReactNode;
}) {
  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_10.5rem] xl:gap-14 xl:items-start xl:pt-4">
      <div className="min-w-0">{children}</div>
      <CourseFormStoryRail items={railItems} />
    </div>
  );
}
