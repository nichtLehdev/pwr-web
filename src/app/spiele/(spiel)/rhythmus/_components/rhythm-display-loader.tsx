"use client";

import dynamic from "next/dynamic";
import type { RhythmDisplayProps } from "./rhythm-display";

/** Wie `NOTATION_BOX_PLAY`: der Platzhalter erscheint nur beim ersten Laden, also in der Spielphase. */
const BOX = "h-[clamp(10rem,26svh,15rem)] md:h-[clamp(12rem,32svh,20rem)]";

const RhythmDisplay = dynamic(
  () => import("./rhythm-display").then((m) => ({ default: m.RhythmDisplay })),
  {
    ssr: false,
    loading: () => (
      <div className={`flex items-center justify-center ${BOX}`}>
        <p className="text-dark dark:text-night-muted text-sm">
          Notenzeile wird geladen…
        </p>
      </div>
    ),
  },
);

export function RhythmDisplayLoader(props: RhythmDisplayProps) {
  return <RhythmDisplay {...props} />;
}
