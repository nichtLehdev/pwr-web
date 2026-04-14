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
        "text-dark dark:text-dark-text text-center text-lg font-black tabular-nums tracking-tight md:text-xl",
        className,
      )}
      aria-live="polite"
    >
      {label}
    </p>
  );
}
