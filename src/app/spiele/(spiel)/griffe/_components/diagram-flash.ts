import type { StaffFlash } from "../../noten-lesen/_components/staff-display";

export type DiagramFlash = StaffFlash;

export function diagramShellClass(flash: DiagramFlash): string {
  switch (flash) {
    case "correct":
      return "border-emerald-500/80 bg-emerald-500/15 dark:bg-emerald-500/10";
    case "wrong":
      return "border-rose-500/75 bg-rose-500/12 dark:bg-rose-500/10";
    default:
      return "border-dark-border/50 bg-white/40 dark:border-dark-border dark:bg-dark-surface/50";
  }
}
