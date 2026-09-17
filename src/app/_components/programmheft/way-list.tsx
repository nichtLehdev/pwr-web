import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LinkIcon, SmartLink, linkKindFor, type LinkKind } from "./link";

interface WayListProps {
  id?: string;
  labelledBy?: string;
  /** 2px-Tintenstrich über der Liste; entfällt, wenn ein Listenkopf ihn zieht. */
  rule?: boolean;
  /** Zweispaltig ab 48rem (Register). */
  columns?: 1 | 2;
  className?: string;
  children: ReactNode;
}

/** Gruppe von Wegzeilen. */
export function WayList({
  id,
  labelledBy,
  rule = true,
  columns = 1,
  className,
  children,
}: WayListProps) {
  return (
    <ul
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        rule && "border-ink dark:border-night-text border-t-2",
        columns === 2 && "grid md:grid-cols-2 md:gap-x-10",
        className,
      )}
    >
      {children}
    </ul>
  );
}

interface WayRowProps {
  /** Ohne Ziel ist die Zeile nicht klickbar (z. B. „Demnächst“). */
  href?: string;
  title: ReactNode;
  /** Mit Beschreibung wird die Wegzeile zur Registerzeile. */
  description?: ReactNode;
  /** `compact`: 1.375rem-Titel für schmale Spalten wie das Programm. */
  size?: "default" | "compact";
  kind?: LinkKind;
  fileType?: string;
  /** Förderverein-Zeilen füllen sich blau statt orange. */
  tone?: "primary" | "foerderverein";
  /** Steht anstelle des Pfeils, wenn die Zeile kein Ziel hat. */
  status?: ReactNode;
}

const ICON = "text-ink dark:text-night-text h-5 w-5 shrink-0";

/**
 * Wegzeile: volle Zeile mit Pfeil, die sich bei Hover/Fokus von links füllt
 * (`.fill-row`). Mit Beschreibung ist sie eine Registerzeile.
 */
export function WayRow({
  href,
  title,
  description,
  size = "default",
  kind,
  fileType,
  tone = "primary",
  status,
}: WayRowProps) {
  if (!href) {
    return (
      <li className="border-rule dark:border-night-rule border-b">
        <div className="flex items-center justify-between gap-6 px-1 py-4">
          <span className="min-w-0">
            <span className="condensed text-dark dark:text-night-muted block text-[1.5rem] leading-tight font-bold">
              {title}
            </span>
            {description ? (
              <span className="text-dark dark:text-night-muted mt-1 block text-[0.9375rem]">
                {description}
              </span>
            ) : null}
          </span>
          {status}
        </div>
      </li>
    );
  }

  const resolved = kind ?? linkKindFor(href);
  const icon = <LinkIcon kind={resolved} className={ICON} />;

  return (
    <li
      className="fill-row border-rule dark:border-night-rule border-b"
      data-tone={tone === "foerderverein" ? "foerderverein" : undefined}
    >
      {description ? (
        <SmartLink
          href={href}
          kind={resolved}
          fileType={fileType}
          className="flex items-center justify-between gap-6 px-1 py-4"
        >
          <span className="min-w-0">
            <span className="condensed text-ink dark:text-night-text block text-[1.5rem] leading-tight font-bold">
              {title}
            </span>
            <span className="text-dark dark:text-night-muted mt-1 block text-[0.9375rem]">
              {description}
            </span>
          </span>
          {icon}
        </SmartLink>
      ) : (
        <SmartLink
          href={href}
          kind={resolved}
          fileType={fileType}
          className={cn(
            "condensed text-ink dark:text-night-text flex min-h-14 items-center justify-between gap-4 px-1 font-bold",
            size === "compact" ? "text-[1.375rem]" : "text-[1.5rem]",
          )}
        >
          {title}
          {icon}
        </SmartLink>
      )}
    </li>
  );
}
