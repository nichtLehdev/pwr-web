"use client";

import { useTheme } from "@/app/_components/general/theme-provider";
import { cn } from "@/lib/utils";
import {
  Accidental,
  Formatter,
  Renderer,
  RendererBackends,
  Stave,
  StaveNote,
  Voice,
  VoiceMode,
} from "vexflow/bravura";
import { useCallback, useEffect, useRef } from "react";
import { notationColors } from "../../../_lib/notation-theme";
import {
  ensureVexFlowFonts,
  withCompactMetrics,
} from "../../../_lib/vexflow-compact";
import type { StaffAccidentalLayout } from "../_lib/staff-accidental-layout";
import type { ClefKind, WrittenPitch } from "../_lib/types";
import { answerLabelForPitch } from "../_lib/pitch";
import { writtenPitchToVexNoteKeyAndAccidental } from "../_lib/vex-pitch-key";

/**
 * Logischer Zeichenblock (Notenzeile plus Luft für Schlüssel und Hilfslinien); der
 * Kontext skaliert diese Einheiten auf die tatsächliche Kastenhöhe.
 */
const LOGICAL_BLOCK_H = 120;

/**
 * 0, weil VexFlow selbst vier Linienabstände über den Linien freihält
 * (`space_above_staff_ln`); ein eigener Vorschub käme noch hinzu.
 */
const LOGICAL_STAVE_Y = 0;

/** Breiteste Notenzeile in logischen Einheiten (eine Note braucht keine 5xl). */
const MAX_STAVE_WIDTH = 340;

/** Schmalste logische Breite; darunter wird die Vergrößerung zurückgenommen. */
const MIN_LOGICAL_W = 230;

/** Unterhalb dieser logischen Breite greifen die kompakten Metriken. */
const COMPACT_LOGICAL_W = 520;

const MIN_SCALE = 0.85;
const MAX_SCALE = 2.2;

/** ResizeObserver-Neuzeichnen entprellen (Layout-Jitter, Scrollbars, …). */
const REDRAW_DEBOUNCE_MS = 100;

/**
 * Vorab aufrufen (z. B. in der Setup-Phase), damit die erste Frage nicht auf
 * Chunk- und Font-Laden warten muss.
 */
export function preloadStaffFonts(): Promise<void> {
  return ensureVexFlowFonts();
}

function styleNoteAndAccidentals(sn: StaveNote, color: string): void {
  sn.setStyle({ fillStyle: color, strokeStyle: color });
  sn.setKeyStyle(0, { fillStyle: color, strokeStyle: color });
  for (const mod of sn.getModifiers()) {
    if (mod instanceof Accidental) {
      mod.setStyle({ fillStyle: color, strokeStyle: color });
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
  /** Trägt die Höhe des Kastens (das Spiel gibt eine clamp()-Formel mit). */
  className?: string;
  /** Ersetzt das Standard-Label, das den Tonnamen nennt — beim Noten-Lesen verriete es die Antwort. */
  ariaLabel?: string;
};

export function StaffDisplay({
  clef,
  pitch,
  staffAccidentalLayout,
  flash = "none",
  className,
  ariaLabel,
}: StaffDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const draw = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    await ensureVexFlowFonts();

    const containerW = Math.max(240, el.clientWidth);
    const containerH = Math.max(120, el.clientHeight);
    const colors = notationColors(dark);

    /* Die Notenschrift wächst mit der Kastenhöhe — und wird zurückgenommen,
     * wenn dafür die Breite nicht reicht. */
    let scale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, containerH / LOGICAL_BLOCK_H),
    );
    if (containerW / scale < MIN_LOGICAL_W) {
      scale = Math.max(MIN_SCALE, containerW / MIN_LOGICAL_W);
    }

    const logicalW = containerW / scale;
    const logicalH = containerH / scale;
    const compact = logicalW < COMPACT_LOGICAL_W;

    const compactMetrics = compact
      ? {
          fontScale: 0.9,
          stavePadding: 8,
          staveEndPaddingMax: 6,
          staveEndPaddingMin: 4,
          noteHeadMinPadding: 1,
        }
      : null;

    withCompactMetrics(compactMetrics, () => {
      const marginX = compact ? 8 : 14;
      const baseInner = logicalW - marginX * 2;
      /* Breite deckeln, sonst entstehen lange leere Notenlinien. */
      const staveWidth = Math.min(MAX_STAVE_WIDTH, Math.max(150, baseInner));
      /* Block mittig setzen, wenn die Höhe mehr hergibt als er braucht. */
      const staveY =
        LOGICAL_STAVE_Y + Math.max(0, (logicalH - LOGICAL_BLOCK_H) / 2);

      el.innerHTML = "";

      const renderer = new Renderer(el, RendererBackends.SVG);
      /* resize() setzt die Gerätegröße, scale() die viewBox darin: gezeichnet
       * wird in logischen Einheiten, das SVG bildet sie scharf darauf ab. */
      renderer.resize(containerW, containerH);
      const ctx = renderer.getContext();
      ctx.scale(scale, scale);

      const clefId =
        clef === "treble"
          ? "treble"
          : clef === "bass"
            ? "bass"
            : clef === "alto"
              ? "alto"
              : "tenor";
      const staveX = marginX + Math.max(0, (baseInner - staveWidth) / 2);
      const stave = new Stave(staveX, staveY, staveWidth).addClef(clefId);

      if (staffAccidentalLayout.kind === "keySignature") {
        stave.addKeySignature(staffAccidentalLayout.keySpec);
      }

      /* Vorzeichen immer direkt am Notenkopf, damit es auch bei Tonart am System
       * eindeutig sichtbar ist. */
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

      styleNoteAndAccidentals(note, colors.note);

      /* Farbe an den Kontext, nicht an den Stave: `stave.setStyle()` erreicht Linien,
       * Schlüssel und Taktstriche nicht (eigene StaveModifier), sie blieben schwarz. */
      ctx.setFillStyle(colors.stave);
      ctx.setStrokeStyle(colors.stave);

      stave.draw();
      voice.draw(ctx, stave);

      const svg = el.querySelector("svg");
      if (svg) {
        svg.setAttribute("overflow", "visible");
        (svg as SVGSVGElement).style.overflow = "visible";
      }
    });
  }, [clef, dark, pitch, staffAccidentalLayout]);

  useEffect(() => {
    void draw();
  }, [draw]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let lastWidth = Math.round(el.clientWidth);
    let lastHeight = Math.round(el.clientHeight);
    let timer: number | null = null;
    const ro = new ResizeObserver(() => {
      const width = Math.round(el.clientWidth);
      const height = Math.round(el.clientHeight);
      /* Auch auf Höhe hören: Die Notengröße hängt daran. */
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        void draw();
      }, REDRAW_DEBOUNCE_MS);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (timer != null) window.clearTimeout(timer);
    };
  }, [draw]);

  return (
    <div
      className={cn(
        "relative flex w-full overflow-x-hidden overflow-y-visible border transition-colors duration-200 motion-reduce:transition-none",
        /* Richtig ist ein Druckfeld, falsch bleibt Rot — kein Grün. */
        flash === "correct" &&
          "border-ink dark:border-night-text bg-primary/15",
        /* Große Fläche: zurückhaltende Tönung, Rand und Marke tragen das Signal. */
        flash === "wrong" && "border-red-700 bg-red-700/5 dark:bg-red-500/10",
        flash === "none" &&
          "border-rule dark:border-night-rule dark:bg-night-raised bg-rule/25",
        className,
      )}
    >
      <div
        ref={containerRef}
        className="h-full w-full max-w-full p-2 md:p-3"
        role="img"
        aria-label={
          ariaLabel ?? `Notensystem, ganze Note ${answerLabelForPitch(pitch)}`
        }
      />
    </div>
  );
}
