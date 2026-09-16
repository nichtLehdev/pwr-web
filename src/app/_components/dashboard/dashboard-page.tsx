"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface DashboardPageProps {
  /** Page title */
  title: string;
  /** Optional page description/subtitle */
  description?: string;
  /** Breadcrumb items (defaults to Dashboard + current page) */
  breadcrumbs?: BreadcrumbItem[];
  /** Action buttons to display in the header (e.g., "New" buttons) */
  actions?: ReactNode;
  /** Page content */
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
 * Hülle jeder Dashboard-Seite.
 *
 * Das Dashboard ist eine Werkbank, kein Heftaufschlag. Es bleibt an die
 * öffentliche Gestaltung angelehnt — Archivo, Tinte auf Papier, eckige Ecken,
 * Haarlinien statt Kästen mit Schatten — übernimmt aber bewusst NICHT deren
 * redaktionelle Mittel: kein Display-Titel mit `clamp`, kein Satzstrich unter
 * der Überschrift, keine zeremonielle 2px-Eröffnungslinie und nicht den
 * großzügigen Abschnittsrhythmus. Auf 82 Arbeitsseiten kostet jede dieser
 * Gesten bei jedem Aufruf Arbeitsfläche, die für Tabellen und Formulare
 * gebraucht wird.
 *
 * `programm` bleibt trotzdem stehen: Die Klasse setzt ausschließlich
 * Markierungs- und Cursorfarbe, den Select-Reset und den 3px-Fokusring — also
 * Infrastruktur, kein Layout. Ohne sie verlören alle Eingabefelder im
 * Dashboard ihre sichtbare Fokusmarkierung.
 */
export default function DashboardPage({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  maxWidth = "7xl",
}: DashboardPageProps) {
  // Default breadcrumbs: Dashboard + current page
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
            {/* Umbricht statt überzulaufen: Tiefe Pfade (Kurs → Teilnehmer →
                Anmeldung) liefen auf Telefonen über den Rand, und
                `overflow-x: clip` am <html> schnitt die letzten Krumen ohne
                Scrollmöglichkeit ab. */}
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

          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              {/* Lange deutsche Komposita („Berechtigungsverwaltung“) sind ein
                  einzelnes unteilbares Wort, breiter als ein 375px-Fenster —
                  deshalb Silbentrennung (lang="de" am <html>). */}
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
              <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
            )}
          </div>
        </div>
      </header>

      <div className={cn(rahmen, "py-8")}>{children}</div>
    </div>
  );
}
