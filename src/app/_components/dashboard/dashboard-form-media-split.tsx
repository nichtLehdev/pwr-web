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
 * Shared rhythm for dashboard “Inhalt”-style splits; reuse on media-heavy edit forms.
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
        "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(200px,280px)] lg:items-start lg:gap-10",
        className,
      )}
    >
      <div className={cn("min-w-0 space-y-10", mainColumnClassName)}>
        {main}
      </div>
      <aside
        className={cn(
          "dashboard-sticky-shell-top mt-10 min-w-0 space-y-3 lg:sticky lg:mt-0 lg:self-start",
          asideClassName,
        )}
      >
        {aside}
      </aside>
    </div>
  );
}
