"use client";

import { cn } from "@/lib/utils";
import { unitsLabel } from "../_lib/puzzle-generator";

type Props = {
  currentUnits: number;
  targetUnits: number;
  className?: string;
};

export function BeatCounter({ currentUnits, targetUnits, className }: Props) {
  return (
    <p className={cn("text-dark dark:text-dark-text-secondary text-center text-sm font-bold", className)}>
      {unitsLabel(currentUnits)} / {unitsLabel(targetUnits)} Schläge
    </p>
  );
}
