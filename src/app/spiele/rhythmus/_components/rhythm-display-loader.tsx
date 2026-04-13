"use client";

import dynamic from "next/dynamic";
import type { RhythmDisplayProps } from "./rhythm-display";

const RhythmDisplay = dynamic(
  () =>
    import("./rhythm-display").then((m) => ({ default: m.RhythmDisplay })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[232px] items-center justify-center rounded-sm border border-gray-200 bg-gray-50 dark:border-dark-border dark:bg-dark-surface md:min-h-[280px]">
        <p className="text-dark dark:text-dark-text-secondary text-sm">
          Notenzeile wird geladen…
        </p>
      </div>
    ),
  },
);

export function RhythmDisplayLoader(props: RhythmDisplayProps) {
  return <RhythmDisplay {...props} />;
}
