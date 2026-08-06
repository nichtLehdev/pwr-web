"use client";

import dynamic from "next/dynamic";
import type { StaffDisplayProps } from "./staff-display";

export type { StaffFlash } from "./staff-display";

// Same pattern as rhythm-display-loader: VexFlow is ~500 KB raw and must not
// be in the initial route bundle.
const StaffDisplayInner = dynamic(
  () => import("./staff-display").then((m) => ({ default: m.StaffDisplay })),
  {
    ssr: false,
    loading: () => (
      // Höhe = endgültige Staff-Höhe (min-h 200/240), sonst Layout-Sprung (CLS).
      <div className="dark:border-dark-border dark:bg-dark-surface flex min-h-[200px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 md:min-h-[240px]">
        <p className="text-dark dark:text-dark-text-secondary text-sm">
          Notenzeile wird geladen…
        </p>
      </div>
    ),
  },
);

export function StaffDisplay(props: StaffDisplayProps) {
  return <StaffDisplayInner {...props} />;
}
