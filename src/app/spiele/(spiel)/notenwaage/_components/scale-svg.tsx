"use client";

import { cn } from "@/lib/utils";

type Props = {
  diffUnits: number;
  balancedFlash?: boolean;
  /** Anzahl noch unbelegter Felder rechts — Gleichgewicht allein reicht nicht. */
  openSlots?: number;
  /**
   * Nur als Bild (Setup-Schirm): ohne Statuszeile und für Vorleseprogramme
   * unsichtbar — eine zweite `aria-live`-Zone ohne Spielstand wäre dort bloß
   * Lärm.
   */
  decorative?: boolean;
};

export function ScaleSVG({
  diffUnits,
  balancedFlash = false,
  openSlots = 0,
  decorative = false,
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
      aria-hidden={decorative || undefined}
      className={cn(
        // Papier statt Verlauf, Haarlinie statt Rundung: Die Waage steht auf
        // dem Blatt, sie liegt nicht in einer eigenen Schale.
        // Spalte statt überlagerter Bildunterschrift: Die Zeile lag vorher
        // absolut über der Zeichnung und schnitt bei flachen Fenstern mitten
        // durch den Waagefuß. Jetzt teilen sich Bild und Zeile die Höhe.
        "border-rule dark:border-night-rule text-ink dark:text-night-text flex h-full w-full flex-col overflow-hidden border",
        // Gleichgewicht wird mit Tinte quittiert, nicht mit Gruen.
        balancedFlash && "ring-ink dark:ring-night-text ring-[3px] ring-inset",
      )}
    >
      <svg
        viewBox="0 0 600 320"
        preserveAspectRatio="xMidYMid meet"
        className="min-h-0 w-full flex-1"
        aria-hidden
      >
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
          // Nur die Bewegung ist abschaltbar, nicht der Ausschlag: Bei
          // reduzierter Bewegung springt der Balken sofort in seine Lage,
          // das Ergebnis bleibt also ablesbar — es schwingt nur nicht mehr.
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
      {!decorative && (
        <div className="pointer-events-none shrink-0 px-2 pb-1 text-center">
          <span
            role="status"
            aria-live="polite"
            className="text-dark dark:text-night-muted text-xs font-bold md:text-sm"
          >
            {status}
          </span>
        </div>
      )}
    </div>
  );
}
