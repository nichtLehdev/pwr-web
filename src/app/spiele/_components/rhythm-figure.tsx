"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/app/_components/general/theme-provider";
import { cn } from "@/lib/utils";
import {
  drawBar,
  prepareNotation,
  type BarHandle,
} from "../_lib/rhythm/draw-bar";
import type { RhythmEvent, TimeSignature } from "../_lib/rhythm/types";

export type RhythmFigureProps = {
  bars: RhythmEvent[][];
  timeSignature: TimeSignature;
  className?: string;
  /** Bekommt je Takt die Griffe zum Einfärben, nach jedem Neuzeichnen. */
  onDrawn?: (handles: BarHandle[], hosts: HTMLElement[]) => void;
};

/** Eine Figur aus eigenständigen Takten; zwei Takte stehen auf dem Telefon untereinander. */
export function RhythmFigure({
  bars,
  timeSignature,
  className,
  onDrawn,
}: RhythmFigureProps) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const hostsRef = useRef<(HTMLDivElement | null)[]>([]);
  const onDrawnRef = useRef(onDrawn);
  useEffect(() => {
    onDrawnRef.current = onDrawn;
  });

  useEffect(() => {
    let cancelled = false;
    void prepareNotation().then(() => {
      if (cancelled) return;
      const hosts = hostsRef.current.slice(0, bars.length) as HTMLDivElement[];
      const handles = hosts.map((host, index) =>
        drawBar(host, {
          events: bars[index]!,
          timeSignature,
          showPrefix: index === 0,
          dark,
        }),
      );
      // Damit beide Takte denselben Maßstab haben, zählt die Breite samt Vorsatz.
      hosts.forEach((host, index) => {
        host.style.flexGrow = String(handles[index]!.width);
      });
      onDrawnRef.current?.(handles, hosts);
    });
    return () => {
      cancelled = true;
    };
  }, [bars, timeSignature, dark]);

  return (
    <div
      aria-hidden
      className={cn(
        "flex w-full flex-col md:flex-row",
        bars.length === 1 ? "h-full" : "h-full",
        className,
      )}
    >
      {bars.map((_, index) => (
        <div
          key={index}
          ref={(element) => {
            hostsRef.current[index] = element;
          }}
          className="relative min-h-0 min-w-0 flex-1 basis-0 overflow-hidden"
        />
      ))}
    </div>
  );
}
