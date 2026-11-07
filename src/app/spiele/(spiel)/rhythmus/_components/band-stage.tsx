"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/app/_components/general/theme-provider";
import { harmonyFor } from "../../../_lib/rhythm/audio";
import {
  BAR_LEAD,
  drawBar,
  prepareNotation,
  QUARTER_WIDTH,
  VIEW_HEIGHT,
  type BarHandle,
} from "../../../_lib/rhythm/draw-bar";
import {
  barTicks,
  pulseOf,
  secPerTick,
  TICKS_PER_QUARTER,
} from "../../../_lib/rhythm/ticks";
import type { TimeSignature } from "../../../_lib/rhythm/types";
import type { Conductor, Press, Segment } from "../_lib/conductor";
import type { BandSource } from "../_lib/session-script";
import { spawnBurst } from "../../../_components/note-burst";
import {
  ANNOUNCEMENT,
  ballHop,
  CountOverlay,
  HoppingHead,
  StageHud,
  useCountIn,
} from "./stage-parts";

/** Lesekante: links genug Platz fürs Gespielte, rechts der Blick voraus. */
const READ_LINE = 0.22;
const MIN_SCALE = 0.72;

type DrawnBar = { host: HTMLDivElement; handle: BarHandle };

/**
 * Laufband vom Blatt. Takte entstehen erst kurz vor der Sichtbarkeit und werden danach
 * entfernt: Ein durchgehendes SVG wäre als Ebene für mobile Browser zu groß.
 */
export function BandStage({
  conductor,
  source,
  timeSignature,
}: {
  conductor: Conductor;
  source: BandSource;
  timeSignature: TimeSignature;
}) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const boxRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const drawn = useRef(new Map<number, DrawnBar>());
  const [segment, setSegment] = useState<Segment | null>(null);
  const countNumber = useCountIn(conductor);

  useEffect(() => {
    const ticksPerBar = barTicks(timeSignature);
    const { pulsesPerBar } = pulseOf(timeSignature);
    const barSecAt = (index: number) =>
      ticksPerBar * secPerTick(source.bpmAt(index));
    // Takt und Startzeit wandern mit: Das Tempo darf von Takt zu Takt wechseln.
    let barIndex = 0;
    let barStart = conductor.startSec + barSecAt(0);
    const barWidth =
      (barTicks(timeSignature) / TICKS_PER_QUARTER) * QUARTER_WIDTH;
    let ready = false;
    void prepareNotation().then(() => {
      ready = true;
    });
    const drawnBars = drawn.current;

    const ensureBar = (index: number, scale: number) => {
      const track = trackRef.current;
      const events = source.barAt(index);
      if (!track || !events || drawnBars.has(index)) return;
      const host = document.createElement("div");
      host.style.position = "absolute";
      host.style.top = "0";
      host.style.height = "100%";
      track.appendChild(host);
      const handle = drawBar(host, {
        events,
        noteKey: harmonyFor({ index, steadyPitch: source.steadyPitch })
          .melodyKey,
        timeSignature,
        showPrefix: index === 0,
        dark,
      });
      const prefixWidth = handle.width - barWidth;
      host.style.left = `${(index * barWidth - BAR_LEAD - prefixWidth) * scale}px`;
      host.style.width = `${handle.width * scale}px`;
      drawnBars.set(index, { host, handle });
    };

    const unsubscribe = conductor.subscribe({
      onSegment: (next: Segment) => {
        if (next.kind === "read") setSegment(next);
      },
      onFrame: (songSec) => {
        const box = boxRef.current;
        const track = trackRef.current;
        if (!box || !track || !ready) return;
        const width = box.clientWidth;
        const scale = Math.min(
          box.clientHeight / VIEW_HEIGHT,
          Math.max(MIN_SCALE, width / 640),
        );
        if (barIndex === 0 && barStart < conductor.startSec) {
          barStart = conductor.startSec + barSecAt(0);
        }
        while (songSec >= barStart + barSecAt(barIndex)) {
          barStart += barSecAt(barIndex);
          barIndex++;
        }
        // Vor dem ersten Takt negativ: Dann läuft er während des Einzählens heran.
        const position = barIndex + (songSec - barStart) / barSecAt(barIndex);
        const x = width * READ_LINE - position * barWidth * scale;
        track.style.transform = `translate3d(${x}px, 0, 0)`;
        if (ballRef.current) {
          const hop = ballHop(position * pulsesPerBar, 16);
          ballRef.current.style.transform = `translate(-50%, ${hop}px)`;
        }

        const visibleBars = Math.ceil(width / (barWidth * scale)) + 1;
        const first = Math.floor(position);
        for (let i = Math.max(0, first); i <= first + visibleBars; i++) {
          ensureBar(i, scale);
        }
        for (const [index, bar] of drawnBars) {
          if (index < first - 1) {
            bar.host.remove();
            drawnBars.delete(index);
          }
        }
      },
      onJudge: (event) => {
        if (event.type === "extra") return;
        const { note } = event;
        const segmentIndex = conductor.indexOfSegment(event.segmentId);
        drawnBars
          .get(segmentIndex)
          ?.handle.mark(
            note.eventIndex,
            note.verdict ?? "missed",
            note.length === "short" || note.length === "long",
          );
        const box = boxRef.current;
        if (
          box &&
          event.type === "note" &&
          (note.verdict === "exact" || note.verdict === "close")
        ) {
          spawnBurst(
            box,
            box.clientWidth * READ_LINE,
            box.clientHeight * 0.55,
            note.verdict === "exact" ? 4 : 2,
          );
        }
      },
      onRelease: (press: Press, owner: Segment | null) => {
        if (!owner) return;
        const tickSec = secPerTick(owner.bpm);
        const from = (press.atMs / 1000 - owner.startSec) / tickSec;
        drawnBars
          .get(owner.index)
          ?.handle.addTake(
            from,
            from + (press.durationMs ?? 0) / 1000 / tickSec,
            false,
          );
      },
    });

    return () => {
      unsubscribe();
      for (const bar of drawnBars.values()) bar.host.remove();
      drawnBars.clear();
    };
  }, [conductor, source, timeSignature, dark]);

  return (
    <div className="spiel-stage flex flex-col gap-2">
      <StageHud
        conductor={conductor}
        baseText={
          !segment
            ? "Mitzählen"
            : segment.announcement
              ? ANNOUNCEMENT[segment.announcement]
              : "Lies und spiel"
        }
        baseMood={!segment ? "idle" : "play"}
        progressText={
          segment
            ? `Takt ${segment.index + 1}${segment.total !== null ? ` von ${segment.total}` : ""} · ${segment.bpm} BPM`
            : ""
        }
        progress={
          source.barCount === null
            ? null
            : (segment ? segment.index + 1 : 0) / source.barCount
        }
        lives={source.barCount === null ? (segment?.lives ?? 3) : undefined}
      />
      <div
        ref={boxRef}
        className="spiel-sheet relative h-[clamp(8rem,26svh,14rem)] overflow-hidden md:h-[clamp(12rem,38svh,22rem)]"
        aria-hidden
      >
        <div
          ref={trackRef}
          className="absolute inset-0 will-change-transform"
        />
        <div
          className="bg-primary-ink dark:bg-primary pointer-events-none absolute top-0 bottom-0 z-10 w-0.5"
          style={{ left: `${READ_LINE * 100}%` }}
        >
          <HoppingHead headRef={ballRef} filled />
        </div>
        <CountOverlay number={countNumber} />
      </div>
    </div>
  );
}
