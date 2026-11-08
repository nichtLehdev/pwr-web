import {
  Barline,
  Beam,
  Dot,
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
import { notationColors } from "../notation-theme";
import { ensureVexFlowFonts } from "../vexflow-compact";
import { barTicks, TICKS_PER_QUARTER } from "./ticks";
import type { NoteValue, RhythmEvent, TimeSignature } from "./types";

/** Logisches Maß einer Viertel: Abstände sind zeitproportional, damit das Band gleichmäßig läuft. */
export const QUARTER_WIDTH = 100;
const PX_PER_TICK = QUARTER_WIDTH / TICKS_PER_QUARTER;
/** Abstand Taktstrich → erste Note. Kleiner als eine Sechzehntel minus Notenkopf. */
export const BAR_LEAD = 9;
const THIN_BARLINE = 1.4;
const THICK_BARLINE = 4.5;
const BARLINE_GAP = 2.6;
const STAVE_Y = 60;
const VIEW_Y = 66;
export const VIEW_HEIGHT = 132;
const LANE_Y = 170;
const LANE_HEIGHT = 7;
const TARGET_LANE_Y = 181;

export type NoteMark = "exact" | "close" | "off" | "missed";

export type BarHandle = {
  width: number;
  /** x-Koordinate (logisch) zu einer Position im Takt; eine Note beginnt am linken Rand ihres Kopfs. */
  xForTick: (tick: number) => number;
  mark: (eventIndex: number, mark: NoteMark, lengthIssue: boolean) => void;
  /** Spielspur unter den Noten: zeigt, was tatsächlich gespielt wurde. */
  addTake: (fromTick: number, toTick: number, stray: boolean) => void;
  /** Sollspur zum Vergleich, nur in der Auswertung. */
  addTargets: () => void;
  clear: () => void;
};

function markColor(mark: NoteMark | "length", dark: boolean): string {
  switch (mark) {
    case "exact":
      return dark ? "#faa619" : "#a55800";
    case "close":
    case "length":
      return dark ? "#c9b38c" : "#7a6a4f";
    case "off":
    case "missed":
      return dark ? "#f87171" : "#b91c1c";
  }
}

const BASE_DURATION: Record<NoteValue, { duration: string; dots: number }> = {
  w: { duration: "w", dots: 0 },
  hd: { duration: "h", dots: 1 },
  h: { duration: "h", dots: 0 },
  qd: { duration: "q", dots: 1 },
  q: { duration: "q", dots: 0 },
  "8d": { duration: "8", dots: 1 },
  "8": { duration: "8", dots: 0 },
  "16": { duration: "16", dots: 0 },
};

function staveNote(event: RhythmEvent, noteKey: string): StaveNote {
  const { duration, dots } = BASE_DURATION[event.value];
  const note = new StaveNote({
    keys: [event.isRest ? "b/4" : noteKey],
    duration: event.isRest ? `${duration}r` : duration,
    dots,
  });
  // Der Punkt muss als Modifier dran, `dots` allein zeichnet ihn nicht.
  if (dots > 0) Dot.buildAndAttach([note], { all: true });
  return note;
}

function paint(element: Element | undefined, color: string): void {
  element?.querySelectorAll("text, path, rect").forEach((part) => {
    if (part.tagName === "text") {
      part.setAttribute("fill", color);
      return;
    }
    part.setAttribute("stroke", color);
    if (part.getAttribute("fill") !== "none") part.setAttribute("fill", color);
  });
}

/** Tatsächlicher Maßstab im Kasten: Das SVG passt sich an Breite oder Höhe an. */
export function barScale(handle: BarHandle, box: DOMRect): number {
  return Math.min(box.width / handle.width, box.height / VIEW_HEIGHT);
}

export function prepareNotation(): Promise<void> {
  return ensureVexFlowFonts();
}

/** Zeichnet einen Takt als eigenes SVG. `prepareNotation` muss vorher durchgelaufen sein. */
export function drawBar(
  host: HTMLDivElement,
  options: {
    events: RhythmEvent[];
    /** Klingender Ton, siehe `harmonyAt`. */
    noteKey: string;
    timeSignature: TimeSignature;
    showPrefix: boolean;
    dark: boolean;
    /** Taktstrich am Ende selbst zeichnen; VexFlows liegt genau auf dem Rand und wird abgeschnitten. */
    endBarline?: "single" | "end";
  },
): BarHandle {
  const { events, noteKey, timeSignature, showPrefix, dark, endBarline } =
    options;
  const colors = notationColors(dark);
  const barWidth = barTicks(timeSignature) * PX_PER_TICK;
  const tsString = `${timeSignature.numerator}/${timeSignature.denominator}`;

  host.innerHTML = "";
  const renderer = new Renderer(host, RendererBackends.SVG);
  renderer.resize(barWidth + 120, VIEW_Y + VIEW_HEIGHT);
  const ctx = renderer.getContext();

  const stave = new Stave(0, STAVE_Y, barWidth);
  if (showPrefix) stave.addClef("treble").addTimeSignature(tsString);
  else stave.setBegBarType(Barline.type.NONE);
  if (endBarline) stave.setEndBarType(Barline.type.NONE);
  stave.setContext(ctx);
  // Bestimmt erst nach dem Layout der Vorsätze die echte Startposition.
  stave.format();
  const prefixWidth = showPrefix ? stave.getNoteStartX() : 0;
  stave.setWidth(prefixWidth + barWidth);
  const totalWidth = prefixWidth + barWidth;

  const notes = events.map((event) => staveNote(event, noteKey));
  const tuplets: Tuplet[] = [];
  let i = 0;
  while (i < events.length) {
    const id = events[i]!.tupletId;
    if (id === undefined) {
      i++;
      continue;
    }
    const group: StaveNote[] = [];
    while (events[i]?.tupletId === id) group.push(notes[i++]!);
    tuplets.push(new Tuplet(group, { numNotes: 3, notesOccupied: 2 }));
  }

  ctx.setFillStyle(colors.stave);
  ctx.setStrokeStyle(colors.stave);

  if (notes.length === 0) {
    stave.draw();
  } else {
    for (const note of notes) {
      note.setStyle({ fillStyle: colors.note, strokeStyle: colors.note });
    }
    const voice = new Voice({
      numBeats: timeSignature.numerator,
      beatValue: timeSignature.denominator,
    });
    voice.setMode(VoiceMode.SOFT);
    voice.addTickables(notes);
    const beams = Beam.generateBeams(notes, {
      groups: Beam.getDefaultBeamGroups(tsString),
      stemDirection: Stem.UP,
      beamRests: false,
    });
    // Die Position hängt am Notensystem der Note: Ohne das misst der Ursprung falsch.
    for (const note of notes) note.setStave(stave);
    voice.setStave(stave);
    new Formatter().joinVoices([voice]).format([voice], barWidth);

    // Zeitproportional statt der Formatter-Abstände.
    let tick = 0;
    notes.forEach((note, index) => {
      const context = note.getTickContext();
      context.setX(0);
      const origin = note.getAbsoluteX();
      context.setX(prefixWidth + BAR_LEAD + tick * PX_PER_TICK - origin);
      tick += events[index]!.ticks;
    });

    stave.draw();
    voice.draw(ctx, stave);
    for (const tuplet of tuplets) tuplet.setContext(ctx).draw();
    for (const beam of beams) beam.setContext(ctx).draw();
  }

  if (endBarline) {
    const top = stave.getYForLine(0);
    const height = stave.getYForLine(4) - top;
    ctx.setFillStyle(colors.stave);
    if (endBarline === "end") {
      // Schlussstrich: dünner Strich, Abstand, dicker Strich am Ende.
      ctx.fillRect(totalWidth - THICK_BARLINE, top, THICK_BARLINE, height);
      ctx.fillRect(
        totalWidth - THICK_BARLINE - BARLINE_GAP - THIN_BARLINE,
        top,
        THIN_BARLINE,
        height,
      );
    } else {
      ctx.fillRect(totalWidth - THIN_BARLINE, top, THIN_BARLINE, height);
    }
  }

  const svg = host.querySelector("svg")!;
  svg.setAttribute("viewBox", `0 ${VIEW_Y} ${totalWidth} ${VIEW_HEIGHT}`);
  svg.setAttribute("preserveAspectRatio", "xMinYMid meet");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  // VexFlow setzt feste Pixelmaße als Inline-Stil, die Attribute allein greifen nicht.
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.display = "block";

  const xForTick = (tick: number) =>
    prefixWidth + BAR_LEAD + tick * PX_PER_TICK;

  const overlay = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svg.appendChild(overlay);

  const rect = (
    x: number,
    y: number,
    width: number,
    fill: string,
    opacity = 1,
  ) => {
    const element = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    element.setAttribute("x", String(x));
    element.setAttribute("y", String(y));
    element.setAttribute("width", String(Math.max(3, width)));
    element.setAttribute("height", String(LANE_HEIGHT));
    element.setAttribute("fill", fill);
    element.setAttribute("opacity", String(opacity));
    overlay.appendChild(element);
  };

  const original = notes.map((note) => note.getSVGElement());
  const ticksInBar = barTicks(timeSignature);

  return {
    width: totalWidth,
    xForTick,
    mark: (eventIndex, mark, lengthIssue) => {
      paint(
        original[eventIndex],
        markColor(lengthIssue && mark === "exact" ? "length" : mark, dark),
      );
    },
    addTake: (fromTick, toTick, stray) => {
      const from = Math.max(-BAR_LEAD / PX_PER_TICK, fromTick);
      const to = Math.min(ticksInBar, toTick);
      if (to <= from) return;
      rect(
        xForTick(from),
        LANE_Y,
        (to - from) * PX_PER_TICK,
        stray ? markColor("off", dark) : dark ? "#faa619" : "#a55800",
      );
    },
    addTargets: () => {
      let tick = 0;
      for (const event of events) {
        if (!event.isRest) {
          rect(
            xForTick(tick),
            TARGET_LANE_Y,
            event.ticks * PX_PER_TICK - 2,
            colors.note,
            0.35,
          );
        }
        tick += event.ticks;
      }
    },
    clear: () => {
      overlay.replaceChildren();
      for (const part of original) paint(part, colors.note);
    },
  };
}
