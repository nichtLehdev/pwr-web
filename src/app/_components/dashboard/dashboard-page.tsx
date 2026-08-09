"use client";

import Link from "next/link";
import { type ReactNode } from "react";

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
 * Reusable DashboardPage component that provides consistent layout,
 * breadcrumbs, header, and back button across all dashboard pages.
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

  return (
    <div className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div
        className={`container mx-auto ${maxWidthClasses[maxWidth]} px-4 py-8 sm:px-6 lg:px-8`}
      >
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm" aria-label="Breadcrumb">
          {/* Wraps instead of overflowing: deep trails (Kurs → Teilnehmer →
              Anmeldung) blew past the viewport on phones, and `overflow-x: clip`
              on <html> cut the trailing crumbs off with no way to scroll to them. */}
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {finalBreadcrumbs.map((item, index) => {
              const isLast = index === finalBreadcrumbs.length - 1;
              return (
                <li key={index} className="flex min-w-0 items-center gap-2">
                  {index > 0 && (
                    <span className="dark:text-dark-muted text-gray-400">
                      /
                    </span>
                  )}
                  {isLast || !item.href ? (
                    <span className="dark:text-dark-text text-dark truncate">
                      {item.label}
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      className="dark:text-dark-muted dark:hover:text-primary hover:text-primary truncate font-medium text-gray-600 underline underline-offset-2 transition-all"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Long German compounds ("Berechtigungsverwaltung") are a single
              unbreakable word wider than a 375px viewport — hyphenate them
              (lang="de" on <html>) and step the size down below sm. */}
          <div className="min-w-0">
            <h1 className="text-dark dark:text-dark-text text-2xl font-bold break-words hyphens-auto sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="dark:text-dark-muted mt-2 break-words hyphens-auto text-gray-600">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
