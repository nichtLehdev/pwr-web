"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import PageHeader from "./page-header";

export interface PublicPageBreadcrumb {
  label: string;
  href?: string;
}

export type PublicPageColor =
  | "primary"
  | "primary-dark"
  | "foerderverein"
  | "dark"
  | "district-1"
  | "district-2"
  | "district-3"
  | "district-4"
  | "district-5"
  | "district-6"
  | "district-7"
  | "district-8"
  | "district-9"
  | "district-10"
  | "district-11"
  | "district-12"
  | "district-13";

const colorToBgClass: Record<PublicPageColor, string> = {
  primary: "bg-primary",
  "primary-dark": "bg-primary-dark",
  foerderverein: "bg-foerderverein",
  dark: "bg-dark",
  "district-1": "bg-district-1",
  "district-2": "bg-district-2",
  "district-3": "bg-district-3",
  "district-4": "bg-district-4",
  "district-5": "bg-district-5",
  "district-6": "bg-district-6",
  "district-7": "bg-district-7",
  "district-8": "bg-district-8",
  "district-9": "bg-district-9",
  "district-10": "bg-district-10",
  "district-11": "bg-district-11",
  "district-12": "bg-district-12",
  "district-13": "bg-district-13",
};

export interface PublicPageProps {
  /** Title used in the sticky PageHeader and, if heroTitle is not set, in the hero */
  title: string;
  /** Optional different title for the hero section (e.g. "Unsere Posaunenwarte") */
  heroTitle?: string;
  /** Color for PageHeader and hero background */
  color?: PublicPageColor;
  /** Breadcrumb items (e.g. Start, Über uns, current page) */
  breadcrumbs: PublicPageBreadcrumb[];
  /** Optional intro content below the hero title (paragraphs, etc.) */
  description?: ReactNode;
  /**
   * `compact`: less vertical padding and a smaller hero title (e.g. forms / tool pages).
   */
  heroSize?: "default" | "compact";
  /** Main content (sections below the hero) */
  children: ReactNode;
}

/**
 * Reusable public page layout: sticky PageHeader, hero with breadcrumbs + title + description,
 * then children. Use for Über-uns and other public content pages.
 */
export default function PublicPage({
  title,
  heroTitle,
  color = "primary",
  breadcrumbs,
  description,
  heroSize = "default",
  children,
}: PublicPageProps) {
  const heroHeading = heroTitle ?? title;
  const bgClass = colorToBgClass[color];
  const isCompact = heroSize === "compact";
  /** Compact eyebrow only when the sticky title differs from the hero heading (e.g. registration flow). */
  const showCompactEyebrow =
    isCompact && heroTitle != null && heroTitle !== title;

  const heroPadding = isCompact
    ? "py-6 text-white md:py-8"
    : "py-12 text-white md:py-16 lg:py-20";

  const titleClasses = isCompact
    ? "mb-3 text-2xl leading-tight font-bold md:text-3xl lg:text-4xl"
    : "mb-6 text-3xl font-bold md:text-4xl lg:text-5xl";

  const descriptionClasses = isCompact
    ? "text-base leading-relaxed opacity-95 md:text-lg"
    : "text-lg leading-relaxed opacity-95 md:text-xl";

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title={title} color={color} />

      {/* Hero Section */}
      <section className={`${bgClass} ${heroPadding}`}>
        <div className="container mx-auto">
          <nav
            className="mb-3 flex flex-wrap items-center gap-2 text-sm opacity-90 md:mb-4"
            aria-label="Breadcrumb"
          >
            {breadcrumbs.map((item, index) => (
              <span key={index} className="flex items-center gap-2">
                {index > 0 && <span>/</span>}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span>{item.label}</span>
                )}
              </span>
            ))}
          </nav>
          <div className="max-w-3xl">
            {showCompactEyebrow && (
              <p className="mb-1 text-xs font-semibold tracking-wide text-white/80 uppercase">
                {title}
              </p>
            )}
            <h1 className={titleClasses}>{heroHeading}</h1>
            {description && (
              <div className={descriptionClasses}>{description}</div>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      {children}
    </div>
  );
}
