import { cn } from "@/lib/utils";

type GameStepIndicatorProps = {
  steps: readonly string[];
  current: number;
  className?: string;
};

/** Einheitliche Schritt-Anzeige (Setup → Spielen → …) oben in jedem Spiel. */
export function GameStepIndicator({
  steps,
  current,
  className,
}: GameStepIndicatorProps) {
  return (
    <div
      role="list"
      aria-label="Spielschritte"
      className={cn(
        "border-rule dark:border-night-rule flex flex-wrap items-center justify-center gap-1.5 border-b pb-3 md:gap-2 md:pb-4",
        className,
      )}
    >
      {steps.map((label, i) => (
        <div
          key={label}
          role="listitem"
          aria-current={i === current ? "step" : undefined}
          className={cn(
            // Gefüllt = aktueller Schritt; erledigte Schritte nur umrandet.
            "px-2.5 py-1 text-[10px] font-bold tracking-wide transition-colors md:px-3 md:text-xs",
            i === current
              ? "on-orange bg-primary text-ink"
              : i < current
                ? "border-rule text-dark dark:border-night-rule dark:text-night-muted border bg-transparent"
                : "text-dark/55 dark:text-night-muted bg-transparent",
          )}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
