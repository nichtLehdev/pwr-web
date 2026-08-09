"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MoreHorizontalIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardOverflowItem = {
  label: string;
  icon?: LucideIcon;
  /** Renders a Link when set, otherwise a button driving `onSelect` */
  href?: string;
  onSelect?: () => void;
  /** Red styling for destructive actions (Löschen, Stornieren, …) */
  destructive?: boolean;
  disabled?: boolean;
};

/**
 * “…” menu for header actions that do not fit next to the title on a phone.
 *
 * Usage: keep the primary action visible, mark the remaining buttons
 * `hidden sm:inline-flex`, and repeat those entries here with
 * `className="ml-auto sm:hidden"`. The `ml-auto` matters — the panel is
 * right-anchored, so a left-aligned trigger pushes it off the screen edge.
 */
export function DashboardOverflowMenu({
  items,
  className,
  label = "Weitere Aktionen",
}: {
  items: DashboardOverflowItem[];
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (items.length === 0) return null;

  const itemClass = (destructive?: boolean) =>
    cn(
      "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors disabled:opacity-50",
      destructive
        ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        : "dark:text-dark-text dark:hover:bg-dark-background-secondary text-gray-700 hover:bg-gray-50",
    );

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:hover:bg-dark-background-secondary inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50"
      >
        <MoreHorizontalIcon className="h-5 w-5" />
      </button>
      {open && (
        <div
          role="menu"
          className="dark:border-dark-border dark:bg-dark-surface absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                {Icon && (
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      !item.destructive && "text-gray-400",
                    )}
                  />
                )}
                {item.label}
              </>
            );

            return item.href ? (
              <Link
                key={item.label}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={itemClass(item.destructive)}
              >
                {content}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onSelect?.();
                  setOpen(false);
                }}
                className={itemClass(item.destructive)}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
