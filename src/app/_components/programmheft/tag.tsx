import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Etikett (öffentliche Variante von `ui/badge`) für Zustände: rechteckig,
 * gefüllt, halbschmal, ohne Versalien oder Sperrung. Umrandet sind im
 * Programmheft nur Aktionen; Art, Dauer oder Ort stehen als Meta-Text.
 * - `ink`: immer Tinte mit Papierschrift, z. B. auf Orange
 * - `inverse`: Tinte auf Papier, im Nachtdruck Nachtschrift auf Nachtgrund
 * - `orange`: Druckorange mit Tinte (z. B. „Nur Warteliste“)
 * - `cancelled`: beendete Zustände mit negativem Ausgang — „Abgesagt“,
 *   „Storniert“, „Abgelehnt“
 * - `muted`: nur umrandet, ohne Füllung. Für Zustände, die kein Gewicht
 *   verdienen (Entwurf, Archiviert). Im Dashboard trägt eine Liste viele
 *   Etiketten nebeneinander; wären alle gefüllt, hätte keines mehr Bedeutung.
 *
 * Gefüllt heißt: Das musst du sehen. Umrandet heißt: Das ist nur der Stand.
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
      // Etiketten tragen ihre eigene Füllung. Die Zeilenfüllung in
      // `.fill-row` färbt sonst auch ihre Schrift in Tinte — auf einem
      // tintefarbenen Etikett wäre sie dann unlesbar.
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
