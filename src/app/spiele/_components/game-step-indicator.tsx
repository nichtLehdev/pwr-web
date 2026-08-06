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
        "border-dark-border/40 dark:border-dark-border/60 flex flex-wrap items-center justify-center gap-1.5 border-b pb-3 md:gap-2 md:pb-4",
        className,
      )}
    >
      {steps.map((label, i) => (
        <div
          key={label}
          role="listitem"
          aria-current={i === current ? "step" : undefined}
          className={cn(
            "rounded-lg px-2.5 py-1 text-[10px] font-bold tracking-wide transition-colors md:px-3 md:text-xs",
            i === current
              ? "bg-primary text-white"
              : i < current
                ? "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
                : "text-dark/55 dark:text-dark-text-muted bg-transparent",
          )}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
