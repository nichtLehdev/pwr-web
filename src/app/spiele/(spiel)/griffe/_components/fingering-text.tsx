"use client";

import { cn } from "@/lib/utils";

export type FingeringTextProps = {
  label: string;
  className?: string;
};

/** Live-Text unter dem Diagramm (z. B. „1+2“ oder „Zug 4“). */
export function FingeringText({ label, className }: FingeringTextProps) {
  return (
    <p
      className={cn(
        // Mit der Fensterhöhe mitwachsend: auf hohen Fenstern darf der
        // gegriffene Ton so groß stehen wie im Griffbild.
        "text-ink dark:text-night-text text-center text-[clamp(1.125rem,2.4dvh,1.75rem)] leading-tight font-bold tracking-tight tabular-nums",
        className,
      )}
      aria-live="polite"
    >
      {label}
    </p>
  );
}
