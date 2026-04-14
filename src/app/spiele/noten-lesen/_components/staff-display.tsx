"use client";

import { useTheme } from "@/app/_components/general/theme-provider";
import { cn } from "@/lib/utils";
import VexFlow, {
  Accidental,
  Formatter,
  Metrics,
  MetricsDefaults,
  Renderer,
  RendererBackends,
  Stave,
  StaveNote,
  Voice,
  VoiceMode,
} from "vexflow";
import { useCallback, useEffect, useRef } from "react";
import type { StaffAccidentalLayout } from "../_lib/staff-accidental-layout";
import type { ClefKind, WrittenPitch } from "../_lib/types";
import { answerLabelForPitch } from "../_lib/pitch";
import { writtenPitchToVexNoteKeyAndAccidental } from "../_lib/vex-pitch-key";

let fontsReady: Promise<void> | null = null;

function ensureVexFlowFonts(): Promise<void> {
  if (!fontsReady) {
    fontsReady = VexFlow.loadFonts("Bravura", "Academico");
  }
  return fontsReady;
}

function styleNoteAndAccidentals(sn: StaveNote, dark: boolean): void {
  const stroke = dark ? "#e4e6eb" : "#171717";
  sn.setStyle({ fillStyle: stroke, strokeStyle: stroke });
  sn.setKeyStyle(0, { fillStyle: stroke, strokeStyle: stroke });
  for (const mod of sn.getModifiers()) {
    if (mod instanceof Accidental) {
      mod.setStyle({ fillStyle: stroke, strokeStyle: stroke });
    }
  }
}

const KEY_SIGNATURE_DEFAULT_ALTERS: Record<
  string,
  Partial<Record<"A" | "H" | "C" | "D" | "E" | "F" | "G", -1 | 0 | 1>>
> = {
  C: {},
  G: { F: 1 },
  D: { F: 1, C: 1 },
  F: { H: -1 },
  Bb: { H: -1, E: -1 },
  Eb: { H: -1, E: -1, A: -1 },
  Ab: { H: -1, E: -1, A: -1, D: -1 },
};

function accidentalForPitchInLayout(
  pitch: WrittenPitch,
  layout: StaffAccidentalLayout,
): "#" | "b" | "n" | null {
  if (layout.kind !== "keySignature") {
    if (pitch.alter === 1) return "#";
    if (pitch.alter === -1) return "b";
    return null;
  }

  const table = KEY_SIGNATURE_DEFAULT_ALTERS[layout.keySpec] ?? {};
  const letter = pitch.letter as "A" | "H" | "C" | "D" | "E" | "F" | "G";
  const defaultAlter = table[letter] ?? 0;

  if (pitch.alter === defaultAlter) return null;
  if (pitch.alter === 0 && defaultAlter !== 0) return "n";
  if (pitch.alter === 1) return "#";
  if (pitch.alter === -1) return "b";
  return null;
}

export type StaffFlash = "none" | "correct" | "wrong";

export type StaffDisplayProps = {
  clef: ClefKind;
  pitch: WrittenPitch;
  /** Fortgeschritten: abwechselnd nur Note-Vorzeichen vs. Tonart am System. */
  staffAccidentalLayout: StaffAccidentalLayout;
  flash?: StaffFlash;
  className?: string;
};

export function StaffDisplay({
  clef,
  pitch,
  staffAccidentalLayout,
  flash = "none",
  className,
}: StaffDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const draw = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    await ensureVexFlowFonts();

    const containerW = Math.max(280, el.clientWidth);
    const compact = containerW < 640;
    const height = compact ? (containerW < 400 ? 200 : 212) : 240;

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
      MetricsDefaults.fontScale = 0.9;
      MetricsDefaults.Stave.padding = 8;
      MetricsDefaults.Stave.endPaddingMax = 6;
      MetricsDefaults.Stave.endPaddingMin = 4;
      MetricsDefaults.NoteHead.minPadding = 1;
    }

    try {
      const marginX = compact ? 8 : 14;
      const staveY = compact ? 28 : 34;
      const baseInner = containerW - marginX * 2;
      const staveWidth = Math.max(160, baseInner);

      el.innerHTML = "";

      const svgWidth = staveWidth + marginX * 2;
      const renderer = new Renderer(el, RendererBackends.SVG);
      renderer.resize(svgWidth, height);
      const ctx = renderer.getContext();

      const clefId =
        clef === "treble"
          ? "treble"
          : clef === "bass"
            ? "bass"
            : clef === "alto"
              ? "alto"
              : "tenor";
      const stave = new Stave(marginX, staveY, staveWidth).addClef(clefId);

      if (staffAccidentalLayout.kind === "keySignature") {
        stave.addKeySignature(staffAccidentalLayout.keySpec);
      }

      if (dark) {
        stave.setStyle({ fillStyle: "#e4e6eb", strokeStyle: "#e4e6eb" });
      }

      /* Immer Kopfposition ohne eingebettetes #/b und Vorzeichen direkt am
       * Notenkopf setzen. So ist das Vorzeichen am Zielton immer eindeutig
       * sichtbar (auch bei Tonartdarstellung am System). */
      const { vexKey } = writtenPitchToVexNoteKeyAndAccidental(pitch);
      const accidental = accidentalForPitchInLayout(
        pitch,
        staffAccidentalLayout,
      );
      const note = new StaveNote({
        keys: [vexKey],
        duration: "w",
        clef: clefId,
      });
      if (accidental) {
        note.addModifier(new Accidental(accidental), 0);
      }

      const voice = new Voice({ numBeats: 4, beatValue: 4 });
      voice.setMode(VoiceMode.SOFT);
      voice.setSoftmaxFactor(compact ? 8 : 12);
      voice.addTickables([note]);

      stave.setContext(ctx);
      const formatterOpts = {
        maxIterations: compact ? 18 : 24,
        softmaxFactor: compact ? 8 : 12,
      };
      const formatter = new Formatter(formatterOpts).joinVoices([voice]);

      formatter.formatToStave([voice], stave, { context: ctx, stave });

      styleNoteAndAccidentals(note, dark);

      stave.draw();
      voice.draw(ctx, stave);

      const svg = el.querySelector("svg");
      if (svg) {
        svg.setAttribute("overflow", "visible");
        (svg as SVGSVGElement).style.overflow = "visible";
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
  }, [clef, dark, pitch, staffAccidentalLayout]);

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
      className={cn(
        "relative w-full overflow-x-hidden overflow-y-visible rounded-sm border transition-colors duration-200",
        flash === "correct" &&
          "border-emerald-500/80 bg-emerald-500/15 dark:bg-emerald-500/10",
        flash === "wrong" &&
          "border-rose-500/75 bg-rose-500/12 dark:bg-rose-500/10",
        flash === "none" &&
          "border-dark-border/50 dark:border-dark-border dark:bg-dark-surface/50 bg-white/40",
        className,
      )}
    >
      <div
        ref={containerRef}
        className="min-h-[200px] w-full max-w-full p-2 pb-3 md:min-h-[240px] md:p-3"
        role="img"
        aria-label={`Notensystem, ganze Note ${answerLabelForPitch(pitch)}`}
      />
    </div>
  );
}
