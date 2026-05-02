"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DashboardFormMediaSplitProps = {
  /** Primary form column (left) */
  main: ReactNode;
  /** Sidebar, e.g. cover image — sticky from `lg` with shared dashboard top offset */
  aside: ReactNode;
  className?: string;
  asideClassName?: string;
  mainColumnClassName?: string;
};

/**
 * Two-column layout: main fields + sticky aside (e.g. Titelbild) on large screens.
 * Matches course edit “Inhalt” rhythm; reuse on other media-heavy edit forms.
 */
export function DashboardFormMediaSplit({
  main,
  aside,
  className,
  asideClassName,
  mainColumnClassName,
}: DashboardFormMediaSplitProps) {
  return (
    <div
      className={cn(
        "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(200px,280px)] lg:gap-10 lg:items-start",
        className,
      )}
    >
      <div className={cn("min-w-0 space-y-10", mainColumnClassName)}>{main}</div>
      <aside
        className={cn(
          "mt-10 min-w-0 space-y-3 lg:sticky lg:top-[calc(var(--main-padding-top,9rem)+var(--dashboard-sticky-top-extra))] lg:mt-0 lg:self-start",
          asideClassName,
        )}
      >
        {aside}
      </aside>
    </div>
  );
}
