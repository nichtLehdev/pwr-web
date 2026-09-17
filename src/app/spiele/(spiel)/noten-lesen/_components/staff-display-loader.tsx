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
      // Höhe = endgültige Staff-Höhe (dieselbe clamp-Formel wie im Spiel),
      // sonst Layout-Sprung (CLS).
      <div className="border-rule bg-rule/25 dark:border-night-rule dark:bg-night-raised flex h-[clamp(9.5rem,40dvh,28rem)] items-center justify-center border">
        <p className="text-dark dark:text-night-muted text-sm">
          Notenzeile wird geladen…
        </p>
      </div>
    ),
  },
);

export function StaffDisplay(props: StaffDisplayProps) {
  return <StaffDisplayInner {...props} />;
}
