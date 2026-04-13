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
  /** Wo Takte wechseln (Index der ersten Note des neuen Takts); für Taktstriche. */
  barStartEventIndices?: number[];
}

function timeSigString(ts: TimeSignature): string {
  return `${ts.numerator}/${ts.denominator}`;
}

function styleNote(
  sn: StaveNote,
  dark: boolean,
): void {
  const stroke = dark ? "#e4e6eb" : "#171717";
  /** Pausen: nur Gesamtstil — setKeyStyle(0) trifft oft nur den Kopf, Achtel-/Sechzehntelpausen haben zusätzlich Stem/Flag-Pfade. */
  if (sn.isRest()) {
    sn.setStyle({ fillStyle: stroke, strokeStyle: stroke });
    return;
  }
  sn.setStyle({ fillStyle: stroke, strokeStyle: stroke });
  sn.setKeyStyle(0, { fillStyle: stroke, strokeStyle: stroke });
}

export function RhythmDisplay({
  events,
  timeSignature,
  bars,
  barStartEventIndices = [],
}: RhythmDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const draw = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    await ensureVexFlowFonts();

    const containerW = Math.max(280, el.clientWidth - 8);
    /** Schmalere Notenlinie + kleinere Abstände, damit lange Level auf dem Handy passen. */
    const compact = containerW < 640;
    /** Etwas höher: Achtel-/Sechzehntel-Pausen ragen unter die Notenlinien; sonst wirken sie abgeschnitten. */
    const height = compact ? (containerW < 400 ? 196 : 208) : 256;
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
    const marginX = compact ? 6 : 12;

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

    /**
     * Horizontal: genug Platz für alle Tickables (3/4 mit 2×4 + 2×8 = oft 4 Symbole —
     * sonst wirkt der Takt „2 Viertel + eine Achtelpause“ obwohl noch eine Achtel fehlt / clippt).
     */
    const baseInner = containerW - marginX * 2;
    const extraForNotes =
      Math.max(0, stemmables.length - 3) * (compact ? 56 : 64);
    const minInnerForTickables =
      stemmables.length * (compact ? 50 : 56) + (compact ? 140 : 165);
    const staveWidth = Math.max(baseInner + extraForNotes, minInnerForTickables);
    const svgWidth = staveWidth + marginX * 2;

    const renderer = new Renderer(el, RendererBackends.SVG);
    renderer.resize(svgWidth, height);
    const ctx = renderer.getContext();

    const staveY = compact ? 30 : 36;

    const stave = new Stave(marginX, staveY, staveWidth)
      .addClef("treble")
      .addTimeSignature(timeSigString(timeSignature));

    if (dark) {
      stave.setStyle({ fillStyle: "#e4e6eb", strokeStyle: "#e4e6eb" });
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
      /* alignRests: false (Default): true würde Pausen an Nachbarnoten ziehen — falsch für Rhythmus-Leseübung. */
      .formatToStave([voice], stave, { context: ctx, stave });

    stave.draw();
    voice.draw(ctx, stave);

    for (const tuplet of tuplets) {
      tuplet.setContext(ctx).draw();
    }

    beams.forEach((b) => {
      b.setContext(ctx).draw();
    });

    const svg = el.querySelector("svg");
    if (svg) {
      svg.setAttribute("overflow", "visible");
      (svg as SVGSVGElement).style.overflow = "visible";
    }

    /** Taktstriche zwischen mehreren Takten (eine lange Voice = sonst kein Strich). */
    const stroke = dark ? "#c9ccd4" : "#1a1a1a";
    for (const splitIdx of barStartEventIndices) {
      if (splitIdx <= 0 || splitIdx >= stemmables.length) continue;
      const left = stemmables[splitIdx - 1] as StaveNote;
      const right = stemmables[splitIdx] as StaveNote;
      const x =
        (left.getNoteHeadEndX() + right.getNoteHeadBeginX()) / 2;
      const yTop = stave.getYForLine(0) - 2;
      const yBottom = stave.getYForLine(4) + 2;
      ctx.save();
      ctx.setStrokeStyle(stroke);
      ctx.setLineWidth(1.25);
      ctx.beginPath();
      ctx.moveTo(x, yTop);
      ctx.lineTo(x, yBottom);
      ctx.stroke();
      ctx.restore();
    }
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
  }, [barStartEventIndices, bars, dark, events, timeSignature]);

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
      className="w-full min-h-[196px] overflow-x-auto overflow-y-visible rounded-2xl border-2 border-amber-100 bg-white p-2 shadow-inner shadow-amber-100/50 dark:border-cyan-900/30 dark:bg-dark-surface dark:shadow-none sm:min-h-[208px] md:min-h-[256px] md:rounded-3xl md:p-3"
      aria-hidden
    />
  );
}
