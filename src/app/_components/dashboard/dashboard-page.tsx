"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface DashboardPageProps {
  title: string;
  description?: string;
  /** Breadcrumb items (defaults to Dashboard + current page) */
  breadcrumbs?: BreadcrumbItem[];
  /** Action buttons to display in the header (e.g., "New" buttons) */
  actions?: ReactNode;
  children: ReactNode;
  /** Optional custom max width (defaults to max-w-7xl) */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl" | "7xl" | "full";
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
};

/**
 * Hülle jeder Dashboard-Seite: öffentliche Grammatik, aber bewusst ohne redaktionelle Gesten,
 * die Arbeitsfläche kosten. `programm` bleibt: ohne die Klasse fehlt allen Feldern der Fokusring.
 */
export default function DashboardPage({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  maxWidth = "7xl",
}: DashboardPageProps) {
  const defaultBreadcrumbs: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard" },
    { label: title },
  ];
  const finalBreadcrumbs = breadcrumbs ?? defaultBreadcrumbs;
  const rahmen = cn(
    "container mx-auto px-4 sm:px-6 lg:px-8",
    maxWidthClasses[maxWidth],
  );

  return (
    <div className="programm font-programm bg-paper text-ink dark:bg-night dark:text-night-text min-h-screen">
      <header className="border-rule dark:border-night-rule border-b">
        <div className={cn(rahmen, "pt-3 pb-4")}>
          <nav aria-label="Brotkrumen">
            {/* Umbricht, weil `overflow-x: clip` am <html> tiefe Pfade auf Telefonen abschneidet. */}
            <ol className="semi-condensed text-dark dark:text-night-muted -ml-1 flex flex-wrap items-center text-sm font-semibold">
              {finalBreadcrumbs.map((item, index) => {
                const current = index === finalBreadcrumbs.length - 1;
                return (
                  <Fragment key={`${index}-${item.label}`}>
                    {index > 0 ? (
                      <li aria-hidden className="px-0.5">
                        /
                      </li>
                    ) : null}
                    <li className="flex min-w-0">
                      {item.href && !current ? (
                        <Link
                          href={item.href}
                          className="hover:text-ink dark:hover:text-night-text inline-flex min-h-9 items-center px-1 underline-offset-4 hover:underline"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <span
                          aria-current={current ? "page" : undefined}
                          className="text-ink dark:text-night-text inline-flex min-h-9 items-center truncate px-1"
                        >
                          {item.label}
                        </span>
                      )}
                    </li>
                  </Fragment>
                );
              })}
            </ol>
          </nav>

          {/* `sm:flex-wrap`: sonst quetschen viele Aktionen den Titel (`min-w-0`) auf null Breite. */}
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0">
              {/* Lange Komposita sind breiter als ein Telefon, daher Silbentrennung (lang="de" am <html>). */}
              <h1 className="condensed text-ink dark:text-night-text text-2xl leading-tight font-bold break-words hyphens-auto sm:text-[1.75rem]">
                {title}
              </h1>
              {description && (
                <p className="text-dark dark:text-night-muted mt-1 max-w-[70ch] text-sm break-words hyphens-auto">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              // Ohne `shrink-0`, damit das eigene `flex-wrap` der Gruppe greift.
              <div className="flex flex-wrap gap-2">{actions}</div>
            )}
          </div>
        </div>
      </header>

      <div className={cn(rahmen, "py-8")}>{children}</div>
    </div>
  );
}
