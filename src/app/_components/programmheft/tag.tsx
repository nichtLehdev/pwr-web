import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Etikett (öffentliche Variante von `ui/badge`): rechteckig, halbschmal,
 * ohne Versalien oder Sperrung.
 * - `ink`: immer Tinte mit Papierschrift, z. B. auf Orange
 * - `inverse`: Tinte auf Papier, im Nachtdruck Nachtschrift auf Nachtgrund
 * - `orange`: Druckorange mit Tinte
 * - `outline`: 2px-Rahmen in Schriftfarbe
 * - `cancelled`: nur für „Abgesagt“
 */
export type TagTone = "ink" | "inverse" | "orange" | "outline" | "cancelled";

const TONE: Record<TagTone, string> = {
  ink: "bg-ink text-paper",
  inverse: "bg-ink text-paper dark:bg-night-text dark:text-night",
  orange: "bg-primary text-ink",
  outline:
    "border-ink text-ink dark:border-night-text dark:text-night-text border-2",
  cancelled: "bg-red-700 text-paper dark:bg-red-400 dark:text-night",
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
