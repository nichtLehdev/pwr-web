"use client";

import dynamic from "next/dynamic";
import type { RhythmFigureProps } from "./rhythm-figure";

const RhythmFigure = dynamic(
  () => import("./rhythm-figure").then((m) => ({ default: m.RhythmFigure })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <p className="text-dark dark:text-night-muted text-sm">
          Notenzeile wird geladen…
        </p>
      </div>
    ),
  },
);

export function RhythmFigureLoader(props: RhythmFigureProps) {
  return <RhythmFigure {...props} />;
}
