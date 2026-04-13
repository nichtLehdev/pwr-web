"use client";

import { useTheme } from "@/app/_components/general/theme-provider";
import VexFlow, {
  Beam,
  Formatter,
  Metrics,
  MetricsDefaults,
  Renderer,
  RendererBackends,
  Stave,
  StaveNote,
  Stem,
  Tuplet,
  Voice,
  VoiceMode,
} from "vexflow";
import type { StemmableNote } from "vexflow";
import { useCallback, useEffect, useRef } from "react";
import type { RhythmEvent, TimeSignature } from "../_lib/types";
import { staveNoteFromRhythmEvent } from "../_lib/vex-stave-note";

let fontsReady: Promise<void> | null = null;

function ensureVexFlowFonts(): Promise<void> {
  if (!fontsReady) {
    fontsReady = VexFlow.loadFonts("Bravura", "Academico");
  }
  return fontsReady;
}

export interface RhythmDisplayProps {
  events: RhythmEvent[];
  timeSignature: TimeSignature;
  bars: number;
}

function timeSigString(ts: TimeSignature): string {
  return `${ts.numerator}/${ts.denominator}`;
}

function styleNote(
  sn: StaveNote,
  dark: boolean,
): void {
  if (dark) {
    sn.setStyle({ fillStyle: "#e4e6eb", strokeStyle: "#e4e6eb" });
  }
}

export function RhythmDisplay({
  events,
  timeSignature,
  bars,
}: RhythmDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const draw = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    await ensureVexFlowFonts();

    const width = Math.max(280, el.clientWidth - 8);
    /** Schmalere Notenlinie + kleinere Abstände, damit lange Level auf dem Handy passen. */
    const compact = width < 640;
    const height = compact ? (width < 400 ? 156 : 168) : 220;
    el.innerHTML = "";

    const prevMetrics = compact
      ? {
          fontScale: MetricsDefaults.fontScale as number,
          stavePadding: MetricsDefaults.Stave.padding as number,
          staveEndMax: MetricsDefaults.Stave.endPaddingMax as number,
          staveEndMin: MetricsDefaults.Stave.endPaddingMin as number,
          noteHeadMin: MetricsDefaults.NoteHead.minPadding as number,
        }
      : null;

    if (compact) {
      MetricsDefaults.fontScale = 0.88;
      MetricsDefaults.Stave.padding = 7;
      MetricsDefaults.Stave.endPaddingMax = 5;
      MetricsDefaults.Stave.endPaddingMin = 3;
      MetricsDefaults.NoteHead.minPadding = 1;
    }

    try {
    const renderer = new Renderer(el, RendererBackends.SVG);
    renderer.resize(width, height);
    const ctx = renderer.getContext();

    const marginX = compact ? 6 : 12;
    const staveWidth = width - marginX * 2;
    const staveY = compact ? 30 : 36;

    const stave = new Stave(marginX, staveY, staveWidth)
      .addClef("treble")
      .addTimeSignature(timeSigString(timeSignature));

    if (dark) {
      stave.setStyle({ fillStyle: "#e4e6eb", strokeStyle: "#e4e6eb" });
    }

    const stemmables: StemmableNote[] = [];
    const tuplets: Tuplet[] = [];

    let i = 0;
    while (i < events.length) {
      const ev = events[i]!;
      if (ev.tupletGroupId !== undefined) {
        const group: StaveNote[] = [];
        const gid = ev.tupletGroupId;
        while (i < events.length && events[i]?.tupletGroupId === gid) {
          const e = events[i]!;
          const sn = staveNoteFromRhythmEvent(e);
          styleNote(sn, dark);
          group.push(sn);
          stemmables.push(sn);
          i++;
        }
        const tuplet = new Tuplet(group, {
          notesOccupied: ev.tupletNotesOccupied ?? 2,
          numNotes: ev.tupletNumNotes ?? 3,
        });
        tuplets.push(tuplet);
      } else {
        const e = ev;
        const sn = staveNoteFromRhythmEvent(e);
        styleNote(sn, dark);
        stemmables.push(sn);
        i++;
      }
    }

    const voice = new Voice({
      numBeats: timeSignature.numerator * bars,
      beatValue: timeSignature.denominator,
    });
    voice.setMode(VoiceMode.SOFT);
    if (compact) {
      voice.setSoftmaxFactor(5);
    }
    voice.addTickables(stemmables);

    /** Wie VexFlow `FormatAndGetBeams`: Balken vor `format`/`draw`, sonst bleiben Fähnchen sichtbar. */
    const beams = Beam.applyAndGetBeams(voice, Stem.UP);

    stave.setContext(ctx);
    new Formatter(
      compact ? { softmaxFactor: 5, maxIterations: 8 } : undefined,
    )
      .joinVoices([voice])
      .formatToStave([voice], stave, { context: ctx, stave });

    stave.draw();
    voice.draw(ctx, stave);

    for (const tuplet of tuplets) {
      tuplet.setContext(ctx).draw();
    }

    beams.forEach((b) => {
      b.setContext(ctx).draw();
    });
    } finally {
      if (prevMetrics) {
        MetricsDefaults.fontScale = prevMetrics.fontScale;
        MetricsDefaults.Stave.padding = prevMetrics.stavePadding;
        MetricsDefaults.Stave.endPaddingMax = prevMetrics.staveEndMax;
        MetricsDefaults.Stave.endPaddingMin = prevMetrics.staveEndMin;
        MetricsDefaults.NoteHead.minPadding = prevMetrics.noteHeadMin;
        Metrics.clear();
      }
    }
  }, [bars, dark, events, timeSignature]);

  useEffect(() => {
    void draw();
  }, [draw]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => void draw());
    ro.observe(el);
    return () => ro.disconnect();
  }, [draw]);

  return (
    <div
      ref={containerRef}
      className="w-full min-h-[156px] overflow-x-auto rounded-xl border border-gray-200 bg-white p-2 shadow-sm dark:border-dark-border dark:bg-dark-surface dark:shadow-none sm:min-h-[168px] md:min-h-[220px] md:p-3"
      aria-hidden
    />
  );
}
