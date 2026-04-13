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

    const containerW = Math.max(280, el.clientWidth);
    /** Schmalere Notenlinie + kleinere Abstände, damit lange Level auf dem Handy passen. */
    const compact = containerW < 640;
    /** Genug Höhe: Pausen-Fähnchen/-Hälse ragen oft unter die Linie; zu wenig → „fehlende“ Pausen. */
    const height = compact ? (containerW < 400 ? 220 : 232) : 280;

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
      MetricsDefaults.Stave.padding = 6;
      MetricsDefaults.Stave.endPaddingMax = 4;
      MetricsDefaults.Stave.endPaddingMin = 2;
      MetricsDefaults.NoteHead.minPadding = 1;
    }

    try {
    const marginX = compact ? 6 : 12;
    const staveY = compact ? 30 : 36;
    const tsStr = timeSigString(timeSignature);
    const beamGroups = Beam.getDefaultBeamGroups(tsStr);

    /** Neu bauen pro Layout-Versuch, damit Balken/Tuplet-Zustand nicht zwischen Durchläufen klebt. */
    const buildStemmables = (): {
      stemmables: StemmableNote[];
      tuplets: Tuplet[];
    } => {
      const stemmables: StemmableNote[] = [];
      const tuplets: Tuplet[] = [];
      let idx = 0;
      while (idx < events.length) {
        const ev = events[idx]!;
        if (ev.tupletGroupId !== undefined) {
          const group: StaveNote[] = [];
          const gid = ev.tupletGroupId;
          while (idx < events.length && events[idx]?.tupletGroupId === gid) {
            const e = events[idx]!;
            const sn = staveNoteFromRhythmEvent(e);
            styleNote(sn, dark);
            group.push(sn);
            stemmables.push(sn);
            idx++;
          }
          tuplets.push(
            new Tuplet(group, {
              notesOccupied: ev.tupletNotesOccupied ?? 2,
              numNotes: ev.tupletNumNotes ?? 3,
            }),
          );
        } else {
          const sn = staveNoteFromRhythmEvent(ev);
          styleNote(sn, dark);
          stemmables.push(sn);
          idx++;
        }
      }
      return { stemmables, tuplets };
    };

    const built = buildStemmables();
    /** Feste Notenlinien-Breite = verfügbare Breite — kein Verbreitern, kein horizontales Scrollen. */
    const baseInner = containerW - marginX * 2;
    const staveWidth = Math.max(120, baseInner);

    const formatterOpts = {
      maxIterations: compact ? 22 : 28,
      softmaxFactor: compact ? 7 : 11,
    };

    const stemmables = built.stemmables;
    const tuplets = built.tuplets;

    el.innerHTML = "";

    const svgWidth = staveWidth + marginX * 2;
    const renderer = new Renderer(el, RendererBackends.SVG);
    renderer.resize(svgWidth, height);
    const ctx = renderer.getContext();

    const stave = new Stave(marginX, staveY, staveWidth)
      .addClef("treble")
      .addTimeSignature(tsStr);

    if (dark) {
      stave.setStyle({ fillStyle: "#e4e6eb", strokeStyle: "#e4e6eb" });
    }

    const voice = new Voice({
      numBeats: timeSignature.numerator * bars,
      beatValue: timeSignature.denominator,
    });
    voice.setMode(VoiceMode.SOFT);
    voice.setSoftmaxFactor(formatterOpts.softmaxFactor);
    voice.addTickables(stemmables);

    const beams = Beam.applyAndGetBeams(voice, Stem.UP, beamGroups);

    stave.setContext(ctx);
    new Formatter(formatterOpts)
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

    const svg = el.querySelector("svg");
    if (svg) {
      svg.setAttribute("overflow", "visible");
      (svg as SVGSVGElement).style.overflow = "visible";
    }

    /** Taktstriche zwischen mehreren Takten (eine lange Voice = sonst kein Strich). */
    const stroke = dark ? "#c9ccd4" : "#1a1a1a";
    if (stave && ctx) {
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
      className="border-dark-border/40 dark:border-dark-border w-full overflow-y-visible rounded-sm border bg-white p-2 pb-4 md:p-3 dark:bg-dark-surface"
      aria-hidden
    >
      {/* Feste SVG-Breite = Container; kein horizontales Scrollen (VexFlow packt in die Notenlinien). */}
      <div
        ref={containerRef}
        className="min-h-[220px] w-full max-w-full overflow-x-hidden sm:min-h-[232px] md:min-h-[280px]"
      />
    </div>
  );
}
