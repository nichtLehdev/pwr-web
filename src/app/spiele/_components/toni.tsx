import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type ToniMood = "idle" | "listen" | "play" | "happy" | "oops";

const INK = "#1c1d1f";
const BRASS = "#faa619";
const BRASS_DARK = "#e08a00";

function Face({ mood }: { mood: ToniMood }) {
  switch (mood) {
    case "happy":
      return (
        <g fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round">
          <path d="M35 62q6-8 12 0M63 62q6-8 12 0" />
          <path d="M40 74q15 18 30 0z" fill={INK} />
        </g>
      );
    case "oops":
      return (
        <g>
          <circle
            cx="41"
            cy="60"
            r="8"
            fill="#fff"
            stroke={INK}
            strokeWidth="2.5"
          />
          <circle
            cx="69"
            cy="60"
            r="8"
            fill="#fff"
            stroke={INK}
            strokeWidth="2.5"
          />
          <circle cx="41" cy="61" r="3.5" fill={INK} />
          <circle cx="69" cy="61" r="3.5" fill={INK} />
          <path
            d="M45 80q5-5 10 0t10 0"
            fill="none"
            stroke={INK}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path d="M88 40q5 8 0 11q-5-3 0-11z" fill="#78a8da" />
        </g>
      );
    case "listen":
      return (
        <g>
          <circle cx="41" cy="60" r="7" fill="#fff" />
          <circle cx="69" cy="60" r="7" fill="#fff" />
          <circle cx="44" cy="57" r="4" fill={INK} />
          <circle cx="72" cy="57" r="4" fill={INK} />
          <path
            d="M47 77q8 5 16 0"
            fill="none"
            stroke={INK}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </g>
      );
    case "play":
      return (
        <g>
          <ellipse
            cx="30"
            cy="74"
            rx="10"
            ry="8"
            fill="#f4845f"
            opacity="0.75"
          />
          <ellipse
            cx="80"
            cy="74"
            rx="10"
            ry="8"
            fill="#f4845f"
            opacity="0.75"
          />
          <path
            d="M35 62h12M63 62h12"
            stroke={INK}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="55" cy="78" r="5" fill={INK} />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="41" cy="60" r="7" fill="#fff" />
          <circle cx="69" cy="60" r="7" fill="#fff" />
          <circle cx="42" cy="61" r="4" fill={INK} />
          <circle cx="70" cy="61" r="4" fill={INK} />
          <path
            d="M44 75q11 10 22 0"
            fill="none"
            stroke={INK}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </g>
      );
  }
}

/** Toni, die kleine Tuba: Das Maskottchen der Rhythmus-Spiele. Rein dekorativ. */
export const Toni = forwardRef<
  HTMLDivElement,
  { mood?: ToniMood; className?: string }
>(function Toni({ mood = "idle", className }, ref) {
  return (
    <div ref={ref} className={cn("shrink-0", className)} aria-hidden>
      <svg
        viewBox="0 0 124 124"
        className="text-ink dark:text-night-text h-full w-full overflow-visible"
      >
        <ellipse cx="38" cy="113" rx="11" ry="6" fill="currentColor" />
        <ellipse cx="72" cy="113" rx="11" ry="6" fill="currentColor" />
        <path
          d="M72 36C80 22 92 14 106 7l12 25c-14 2-24 10-28 24z"
          fill={BRASS_DARK}
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <ellipse
          cx="112"
          cy="19"
          rx="7"
          ry="15"
          transform="rotate(-27 112 19)"
          fill="#ffd27a"
          stroke="currentColor"
          strokeWidth="3"
        />
        <g fill="currentColor">
          <rect x="33" y="17" width="8" height="16" rx="2" />
          <rect x="47" y="13" width="8" height="18" rx="2" />
          <rect x="61" y="17" width="8" height="16" rx="2" />
        </g>
        <circle
          cx="55"
          cy="68"
          r="42"
          fill={BRASS}
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          d="M26 48a34 34 0 0 1 19-15"
          fill="none"
          stroke="#ffe3a8"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <Face mood={mood} />
      </svg>
    </div>
  );
});
