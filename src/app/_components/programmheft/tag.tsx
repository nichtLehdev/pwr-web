import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Etikett für Zustände (öffentliche Variante von `ui/badge`). Gefüllt heißt:
 * Das musst du sehen. `muted` (umrandet) ist nur der Stand, z. B. Entwurf.
 */
export type TagTone = "ink" | "inverse" | "orange" | "cancelled" | "muted";

const TONE: Record<TagTone, string> = {
  ink: "bg-ink text-paper",
  inverse: "bg-ink text-paper dark:bg-night-text dark:text-night",
  orange: "bg-primary text-ink",
  cancelled: "bg-red-700 text-paper dark:bg-red-400 dark:text-night",
  muted:
    "border-rule text-dark dark:border-night-rule dark:text-night-muted border bg-transparent",
};

export function Tag({
  tone = "inverse",
  className,
  children,
}: {
  tone?: TagTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      // Nimmt das Etikett von `.fill-row` aus, das sonst seine Schrift in
      // Tinte färbt (auf Tinte unlesbar).
      data-tag=""
      className={cn(
        "semi-condensed inline-flex min-h-6 items-center gap-1.5 px-2 text-sm leading-none font-semibold whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
