"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { DashboardSectionNavItem } from "./dashboard-form-sticky-subnav";
import { scrollToDashboardSection } from "./dashboard-form-scroll";

export function DashboardFormSideRail({
  items,
  className,
}: {
  items: DashboardSectionNavItem[];
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
                  scrollToDashboardSection(item.href);
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

export function DashboardFormSectionLayout({
  railItems,
  children,
}: {
  railItems: DashboardSectionNavItem[];
  children: ReactNode;
}) {
  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_10.5rem] xl:gap-14 xl:items-start xl:pt-4">
      <div className="min-w-0">{children}</div>
      <DashboardFormSideRail items={railItems} />
    </div>
  );
}
