"use client";

import { useTheme } from "@/app/_components/general/theme-provider";
import {
  Beam,
  Formatter,
  Renderer,
  RendererBackends,
  Stave,
  StaveNote,
  Stem,
  Tuplet,
  Voice,
  VoiceMode,
} from "vexflow/bravura";
import type { StemmableNote } from "vexflow/bravura";
import { useCallback, useEffect, useRef } from "react";
import { notationColors } from "../../../_lib/notation-theme";
import {
  ensureVexFlowFonts,
  withCompactMetrics,
} from "../../../_lib/vexflow-compact";
import type { RhythmEvent, TimeSignature } from "../_lib/types";
import type { OnsetVerdict } from "../_lib/scoring";
import { staveNoteFromRhythmEvent } from "../_lib/vex-stave-note";

export interface RhythmDisplayProps {
  events: RhythmEvent[];
  timeSignature: TimeSignature;
  bars: number;
  /** Wo Takte wechseln (Index der ersten Note des neuen Takts); für Taktstriche. */
  barStartEventIndices?: number[];
  /**
   * Optional (Ergebnis-Phase): Urteil je Event-Index — färbt Notenköpfe.
   * Pausen bleiben `undefined`; ohne Prop ändert sich nichts.
   */
  eventVerdicts?: (OnsetVerdict | undefined)[];
  /**
   * `play` (Vorgabe): die Notenzeile ist der einzige Inhalt und nimmt sich den
   * Platz. `review`: sie teilt ihn sich mit der Auswertung und bleibt kleiner.
   */
  variant?: "play" | "review";
}

/**
 * Höhe des Notenkastens. Das Spielmaß nutzt auch der Ladeplatzhalter in
 * `rhythm-display-loader.tsx` — bitte zusammen ändern.
 *
 * `svh` statt `dvh`: die kleine Ansichtshöhe springt nicht, wenn die Adresszeile
 * auf dem Handy ein- und ausfährt — sonst würde das Notenbild mitten im Spiel
 * neu gezeichnet.
 */
export const NOTATION_BOX_PLAY =
  "h-[clamp(10rem,26svh,15rem)] md:h-[clamp(12rem,32svh,20rem)]";
export const NOTATION_BOX_REVIEW =
  "h-[clamp(8rem,17svh,10rem)] md:h-[clamp(9rem,20svh,13rem)]";

/** Logische Zeichenfläche. Die viewBox zieht sie danach auf die Tinte zusammen. */
const LOGICAL_HEIGHT = 300;
const STAVE_Y = 60;
/** Obergrenze, damit bei sehr wenig Tinte (eine Ganze) nichts plakatgroß wird. */
const MAX_SCALE = 2.0;
/**
 * Tintenhöhe einer Zeile bei Maßstab 1, im Browser gemessen: rund 200–220px
 * (Hals und Fähnchen über der Linie, Pausen darunter). Zu klein angesetzt,
 * rechnet sich das Bild zu groß und muss über die Höhe eingepasst werden —
 * dann steht die Zeile schmaler als die Satzbreite.
 */
const INK_HEIGHT = 210;

function timeSigString(ts: TimeSignature): string {
  return `${ts.numerator}/${ts.denominator}`;
}

/**
 * Urteil → Notenfarbe. Kein Grün: getroffen ist schlicht Tinte, knapp daneben
 * trägt die Messing-Tinte des Hefts (im Nachtdruck das Druckorange selbst),
 * daneben bleibt Rot — die einzige Signalfarbe, die das Heft kennt.
 */
function verdictColor(verdict: OnsetVerdict, dark: boolean): string {
  switch (verdict) {
    case "good":
      return dark ? "#ecebe8" : "#1c1d1f";
    case "ok":
      return dark ? "#faa619" : "#a55800";
    case "off":
    case "missed":
      return dark ? "#f87171" : "#b91c1c";
  }
}

function styleNote(
  sn: StaveNote,
  baseColor: string,
  dark: boolean,
  verdict?: OnsetVerdict,
): void {
  const stroke =
    verdict !== undefined ? verdictColor(verdict, dark) : baseColor;
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
  eventVerdicts,
  variant = "play",
}: RhythmDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const draw = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    await ensureVexFlowFonts();

    const boxW = Math.max(240, el.clientWidth);
    const boxH = Math.max(120, el.clientHeight);
    const colors = notationColors(dark);

    /**
     * Die logische Breite steuert allein die Notendichte — wie groß das Bild
     * am Ende steht, entscheidet der Platz. Schmal gezeichnet und groß
     * skaliert heißt: auf einem hohen Fenster werden die Noten größer.
     *
     * Eine Notenzeile ist breit und flach; sie kann einen hohen Kasten nie
     * ausfüllen, ohne über die Breite hinauszuwachsen. Sie wächst deshalb nur
     * bis zu einem geschmackvollen Maß mit — der Rest bleibt Luft um sie
     * herum, wie im gedruckten Notenbeispiel.
     */
    const targetScale = Math.min(1.8, boxH / INK_HEIGHT);
    const minLogicalW = Math.max(300, 60 + events.length * 22);
    const logicalW = Math.max(minLogicalW, Math.round(boxW / targetScale));
    /** Enge Metriken erst, wenn die Zeile logisch wirklich schmal wird. */
    const compact = logicalW < 560;

    const compactMetrics = compact
      ? {
          fontScale: 0.88,
          stavePadding: 6,
          staveEndPaddingMax: 4,
          staveEndPaddingMin: 2,
          noteHeadMinPadding: 1,
        }
      : null;

    withCompactMetrics(compactMetrics, () => {
      const marginX = compact ? 6 : 12;
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
              styleNote(sn, colors.note, dark, eventVerdicts?.[idx]);
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
            styleNote(sn, colors.note, dark, eventVerdicts?.[idx]);
            stemmables.push(sn);
            idx++;
          }
        }
        return { stemmables, tuplets };
      };

      const built = buildStemmables();
      const staveWidth = Math.max(120, logicalW - marginX * 2);

      const formatterOpts = {
        maxIterations: compact ? 22 : 28,
        softmaxFactor: compact ? 7 : 11,
      };

      const stemmables = built.stemmables;
      const tuplets = built.tuplets;

      el.innerHTML = "";

      const renderer = new Renderer(el, RendererBackends.SVG);
      renderer.resize(logicalW, LOGICAL_HEIGHT);
      const ctx = renderer.getContext();

      const stave = new Stave(marginX, STAVE_Y, staveWidth)
        .addClef("treble")
        .addTimeSignature(tsStr);

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

      /* Die Farbe muss an den Kontext, nicht an den Stave: `stave.setStyle()`
       * allein erreicht weder die Notenlinien noch Schlüssel und Taktart —
       * das sind eigene StaveModifier mit eigenem Stil und fielen auf den
       * Kontext-Standard zurück, also reines Schwarz auf Nachtgrund. Balken
       * und Triolen weiter unten hängen am selben Standard und werden damit
       * ebenfalls mitgefärbt; `note` und `stave` liefern denselben Wert, es
       * verschiebt sich also nichts. Die nachgezeichneten Taktstriche setzen
       * ihre eigene Farbe in save()/restore() und bleiben unberührt.
       *
       * Bedingungslos, nicht nur nachts: Hell ist der Kontext-Standard
       * ebenfalls reines Schwarz statt der Tinte #1c1d1f. */
      ctx.setFillStyle(colors.stave);
      ctx.setStrokeStyle(colors.stave);

      stave.draw();
      voice.draw(ctx, stave);

      for (const tuplet of tuplets) {
        tuplet.setContext(ctx).draw();
      }

      beams.forEach((b) => {
        b.setContext(ctx).draw();
      });

      /** Taktstriche zwischen mehreren Takten (eine lange Voice = sonst kein Strich). */
      const stroke = colors.barline;
      if (stave && ctx) {
        for (const splitIdx of barStartEventIndices) {
          if (splitIdx <= 0 || splitIdx >= stemmables.length) continue;
          const left = stemmables[splitIdx - 1] as StaveNote;
          const right = stemmables[splitIdx] as StaveNote;
          const x = (left.getNoteHeadEndX() + right.getNoteHeadBeginX()) / 2;
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

      /**
       * Erst zeichnen, dann die viewBox auf die tatsächliche Tinte ziehen: die
       * feste Zeichenfläche ließ unter jeder Notenzeile 74px Papier leer
       * (gemessen: 200px Tinte in 280px Kasten). Jetzt füllt das Bild den
       * Kasten, ohne je breiter als er zu werden.
       */
      const svg = el.querySelector("svg");
      if (svg instanceof SVGSVGElement) {
        let vbX = 0;
        let vbY = 0;
        let vbW = logicalW;
        let vbH = LOGICAL_HEIGHT;
        try {
          const bb = svg.getBBox();
          if (bb.width > 0 && bb.height > 0) {
            const padX = 4;
            const padY = 8;
            vbX = bb.x - padX;
            vbY = bb.y - padY;
            vbW = bb.width + padX * 2;
            vbH = bb.height + padY * 2;
          }
        } catch {
          /* Ohne getBBox bleibt die volle Zeichenfläche stehen. */
        }

        /** Nur aufziehen, nie beschneiden: der Deckel vergrößert die viewBox. */
        const fit = Math.min(boxW / vbW, boxH / vbH);
        if (fit > MAX_SCALE) {
          const cx = vbX + vbW / 2;
          const cy = vbY + vbH / 2;
          vbW = boxW / MAX_SCALE;
          vbH = boxH / MAX_SCALE;
          vbX = cx - vbW / 2;
          vbY = cy - vbH / 2;
        }

        svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.display = "block";
      }
    });
  }, [
    barStartEventIndices,
    bars,
    dark,
    events,
    eventVerdicts,
    timeSignature,
    // `variant` steht bewusst nicht in der Liste: `draw` liest die Kastenhöhe
    // aus dem DOM, und den Wechsel meldet der ResizeObserver unten.
  ]);

  useEffect(() => {
    void draw();
  }, [draw]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    /**
     * Entprellt und mit Schwelle: die Höhe zählt jetzt mit (der Kasten wächst
     * mit dem Fenster), aber erst ab 8px — winzige Sprünge sollen nicht neu
     * zeichnen.
     */
    let lastWidth = el.clientWidth;
    let lastHeight = el.clientHeight;
    let timer: number | null = null;
    const ro = new ResizeObserver(() => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width === lastWidth && Math.abs(height - lastHeight) < 8) return;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        lastWidth = el.clientWidth;
        lastHeight = el.clientHeight;
        void draw();
      }, 100);
    });
    ro.observe(el);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      ro.disconnect();
    };
  }, [draw]);

  return (
    // Kein Rahmen: im Heft steht eine Notenzeile auf dem Papier, nicht in
    // einem Kasten — und ein Kasten um eine flache Zeile stünde auf hohen
    // Fenstern zur Hälfte leer. Das SVG passt sich über seine viewBox ein,
    // deshalb gibt es kein horizontales Scrollen.
    <div
      ref={containerRef}
      role="img"
      aria-label={`Rhythmus-Notation: ${events.length} Symbole im ${timeSignature.numerator}/${timeSignature.denominator}-Takt`}
      className={`w-full max-w-full overflow-hidden ${
        variant === "review" ? NOTATION_BOX_REVIEW : NOTATION_BOX_PLAY
      }`}
    />
  );
}
