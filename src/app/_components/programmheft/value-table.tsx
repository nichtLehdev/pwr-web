import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Beträge und Kennwerte im Tabellensatz: Bezeichnung links in Body, Wert
 * rechtsbündig in schmal-fetten Tabellenziffern, Haarlinien zwischen den
 * Zeilen, 2px-Tintenstrich darüber.
 */
export function ValueTable({
  rows,
  className,
}: {
  rows: { label: ReactNode; value: ReactNode }[];
  className?: string;
}) {
  return (
    <dl
      className={cn("border-ink dark:border-night-text border-t-2", className)}
    >
      {rows.map((row, index) => (
        <div
          key={index}
          className="border-rule dark:border-night-rule flex items-baseline justify-between gap-6 border-b px-1 py-3"
        >
          <dt className="text-ink dark:text-night-text text-lg">{row.label}</dt>
          <dd className="condensed text-ink dark:text-night-text text-[1.75rem] leading-none font-extrabold whitespace-nowrap tabular-nums">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
