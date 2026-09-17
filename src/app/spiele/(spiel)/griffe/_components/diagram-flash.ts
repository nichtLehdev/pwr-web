import type { StaffFlash } from "../../noten-lesen/_components/staff-display";

export type DiagramFlash = StaffFlash;

/**
 * Rückmeldung am Diagrammrahmen. Richtig ist Tinte — das Heft führt kein
 * Grün. Falsch bleibt Rot, die einzige Signalfarbe, die bleibt.
 */
export function diagramShellClass(flash: DiagramFlash): string {
  switch (flash) {
    case "correct":
      return "border-ink bg-rule/25 dark:border-night-text dark:bg-night-raised";
    case "wrong":
      return "border-red-600 bg-red-50 dark:border-red-400 dark:bg-red-900/20";
    default:
      return "border-rule bg-paper dark:border-night-rule dark:bg-night";
  }
}
