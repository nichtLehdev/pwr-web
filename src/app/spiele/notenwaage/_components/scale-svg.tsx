"use client";

import { cn } from "@/lib/utils";

type Props = {
  diffUnits: number;
  balancedFlash?: boolean;
  /** Anzahl noch unbelegter Felder rechts — Gleichgewicht allein reicht nicht. */
  openSlots?: number;
};

export function ScaleSVG({
  diffUnits,
  balancedFlash = false,
  openSlots = 0,
}: Props) {
  const tilt = Math.max(-16, Math.min(16, diffUnits / 2.4));
  const balanced = Math.abs(diffUnits) < 0.01;
  const status = balanced
    ? openSlots > 0
      ? `Im Gleichgewicht — noch ${openSlots} ${openSlots === 1 ? "Feld" : "Felder"} frei`
      : "Waage im Gleichgewicht"
    : diffUnits > 0
      ? "Rechts ist schwerer"
      : "Links ist schwerer";

  return (
    <div
      className={cn(
        "border-dark-border/50 dark:border-dark-border dark:from-dark-surface/60 dark:to-dark-surface/35 relative h-full min-h-[130px] w-full overflow-hidden rounded-sm border bg-gradient-to-b from-white/80 to-white/55 md:min-h-[220px]",
        balancedFlash && "ring-2 ring-emerald-500/75",
      )}
    >
      <svg viewBox="0 0 600 320" className="h-full w-full" aria-hidden>
        <ellipse
          cx="300"
          cy="286"
          rx="72"
          ry="14"
          fill="currentColor"
          opacity="0.16"
        />
        <rect
          x="291"
          y="120"
          width="18"
          height="146"
          rx="9"
          fill="currentColor"
          opacity="0.78"
        />
        <path d="M246 274h108l-14 14h-80z" fill="currentColor" opacity="0.82" />
        <circle cx="300" cy="120" r="10" fill="currentColor" opacity="0.95" />

        <g
          transform={`rotate(${tilt} 300 120)`}
          className="motion-safe:[transition:transform_300ms_cubic-bezier(0.22,1,0.36,1)]"
        >
          <line
            x1="120"
            y1="120"
            x2="480"
            y2="120"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <line
            x1="160"
            y1="120"
            x2="150"
            y2="178"
            stroke="currentColor"
            strokeWidth="3.5"
            opacity="0.75"
          />
          <line
            x1="140"
            y1="120"
            x2="150"
            y2="178"
            stroke="currentColor"
            strokeWidth="3.5"
            opacity="0.75"
          />
          <line
            x1="440"
            y1="120"
            x2="450"
            y2="178"
            stroke="currentColor"
            strokeWidth="3.5"
            opacity="0.75"
          />
          <line
            x1="460"
            y1="120"
            x2="450"
            y2="178"
            stroke="currentColor"
            strokeWidth="3.5"
            opacity="0.75"
          />
          <ellipse
            cx="150"
            cy="188"
            rx="78"
            ry="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="5.5"
          />
          <ellipse
            cx="450"
            cy="188"
            rx="78"
            ry="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="5.5"
          />
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center">
        <span
          role="status"
          aria-live="polite"
          className="text-dark dark:text-dark-text-secondary text-xs font-bold"
        >
          {status}
        </span>
      </div>
    </div>
  );
}
