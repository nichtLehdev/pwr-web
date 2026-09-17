import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Köpfe sprechen schmal-extrafett, nie in gesperrten Versalien (Condensed
 * Head Rule). Vier Größen aus dem Heft:
 * - `close`: Schlussabschnitt
 * - `headline`: Abschnittskopf („Aktuelles“)
 * - `programme`: Kopf einer Programmspalte
 * - `list`: Kopf einer Register- oder Unterliste
 */
export type HeadingSize = "close" | "headline" | "programme" | "list";

const SIZE: Record<HeadingSize, string> = {
  close: "text-[clamp(2.5rem,5.5vw,4.75rem)] leading-[0.92] text-balance",
  headline: "text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[0.95]",
  programme: "text-[2.25rem] leading-none",
  list: "text-[1.75rem] leading-none",
};

const RULE_PADDING: Record<HeadingSize, string> = {
  close: "pb-4",
  headline: "pb-4",
  programme: "pb-3",
  list: "pb-2",
};

/** 2px-Tintenstrich unter Köpfen. */
const HEAD_RULE = "border-ink dark:border-night-text border-b-2";

interface HeadingProps {
  as?: "h2" | "h3" | "h4";
  id?: string;
  size?: HeadingSize;
  /** 2px-Tintenstrich unter dem Kopf. */
  rule?: boolean;
  className?: string;
  children: ReactNode;
}

export function Heading({
  as: Tag = "h2",
  id,
  size = "headline",
  rule = false,
  className,
  children,
}: HeadingProps) {
  return (
    <Tag
      id={id}
      className={cn(
        "condensed text-ink dark:text-night-text font-extrabold",
        SIZE[size],
        rule && HEAD_RULE,
        rule && RULE_PADDING[size],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Textlink mit Pfeil in Messing-Tinte (Nacht: Druckorange). */
export function ArrowLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "semi-condensed text-primary-ink dark:text-primary inline-flex min-h-11 items-center gap-2 text-lg font-semibold underline-offset-4 hover:underline",
        className,
      )}
    >
      {children}
      <ArrowRight className="h-5 w-5" aria-hidden />
    </Link>
  );
}

interface SectionHeadProps extends Omit<HeadingProps, "children"> {
  title: ReactNode;
  /** Weiterführender Link rechts neben dem Kopf, z. B. „Alle News“. */
  action?: { href: string; label: string };
  /** Einleitungssatz unter dem Kopf. */
  intro?: ReactNode;
}

/**
 * Abschnittskopf: Kopf, optional mit Link auf derselben Linie und
 * Einleitungssatz darunter. Keine Kicker darüber (Metadata Below Rule).
 */
export function SectionHead({
  title,
  action,
  intro,
  rule = false,
  size = "headline",
  className,
  ...heading
}: SectionHeadProps) {
  const introLine = intro ? (
    <p className="text-dark dark:text-night-muted mt-4 max-w-2xl text-lg">
      {intro}
    </p>
  ) : null;

  if (action) {
    return (
      <>
        <div
          className={cn(
            "flex flex-wrap items-end justify-between gap-x-6 gap-y-2",
            rule && HEAD_RULE,
            rule && RULE_PADDING[size],
            className,
          )}
        >
          <Heading size={size} {...heading}>
            {title}
          </Heading>
          <ArrowLink href={action.href}>{action.label}</ArrowLink>
        </div>
        {introLine}
      </>
    );
  }

  return (
    <>
      <Heading size={size} rule={rule} className={className} {...heading}>
        {title}
      </Heading>
      {introLine}
    </>
  );
}
