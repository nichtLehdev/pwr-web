"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { DashboardSectionNavItem } from "./dashboard-form-sticky-subnav";
import { scrollToDashboardSection } from "./dashboard-form-scroll";

function readAnchorActivationLinePx(anchor: HTMLElement): number {
  const raw = getComputedStyle(anchor).scrollMarginTop;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 120;
}

export function DashboardFormSideRail({
  items,
  className,
}: {
  items: DashboardSectionNavItem[];
  className?: string;
}) {
  const [active, setActive] = useState(items[0]?.href ?? "");

  const itemHrefsKey = items.map((i) => i.href).join("\0");
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const navItems = itemsRef.current;
    const initialPairs = navItems
      .map((item) => ({
        href: item.href,
        el: document.getElementById(item.href.slice(1)),
      }))
      .filter((pair): pair is { href: string; el: HTMLElement } =>
        Boolean(pair.el),
      );
    if (initialPairs.length === 0) return;

    const compute = () => {
      const currentItems = itemsRef.current;
      if (currentItems.length === 0) return;

      const pairs = currentItems
        .map((item) => ({
          href: item.href,
          el: document.getElementById(item.href.slice(1)),
        }))
        .filter((pair): pair is { href: string; el: HTMLElement } =>
          Boolean(pair.el),
        );
      if (pairs.length === 0) return;

      const activationLine = readAnchorActivationLinePx(pairs[0]!.el);

      let best = pairs[0]!.href;
      for (const pair of pairs) {
        if (pair.el.getBoundingClientRect().top <= activationLine) {
          best = pair.href;
        }
      }

      const doc = document.documentElement;
      const scrollBottom = window.scrollY + window.innerHeight;
      const nearBottom = scrollBottom >= doc.scrollHeight - 4;
      if (nearBottom) {
        best = pairs[pairs.length - 1]!.href;
      }

      setActive((prev) => (prev === best ? prev : best));
    };

    let ticking = false;
    const onScrollOrResize = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        compute();
      });
    };

    compute();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [itemHrefsKey]);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Abschnitte"
      className={cn(
        "dashboard-sticky-shell-top hidden xl:sticky xl:self-start xl:block",
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
  className,
  railClassName,
}: {
  railItems: DashboardSectionNavItem[];
  children: ReactNode;
  className?: string;
  railClassName?: string;
}) {
  return (
    <div
      className={cn(
        "xl:grid xl:grid-cols-[minmax(0,1fr)_10.5rem] xl:items-start xl:gap-14 xl:pt-4",
        className,
      )}
    >
      <div className="min-w-0">{children}</div>
      <DashboardFormSideRail className={railClassName} items={railItems} />
    </div>
  );
}
