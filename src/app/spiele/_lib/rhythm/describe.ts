import type { Figure, RhythmEvent } from "./types";

const NOTE_NAMES: Record<RhythmEvent["value"], [note: string, rest: string]> = {
  w: ["ganze Note", "ganze Pause"],
  hd: ["punktierte halbe Note", "punktierte halbe Pause"],
  h: ["halbe Note", "halbe Pause"],
  qd: ["punktierte Viertelnote", "punktierte Viertelpause"],
  q: ["Viertelnote", "Viertelpause"],
  "8d": ["punktierte Achtelnote", "punktierte Achtelpause"],
  "8": ["Achtelnote", "Achtelpause"],
  "16": ["Sechzehntelnote", "Sechzehntelpause"],
};

function nameOf(event: RhythmEvent): string {
  const name = NOTE_NAMES[event.value][event.isRest ? 1 : 0];
  return event.tupletId !== undefined ? `Triolen-${name}` : name;
}

/** Das Notenbild ist für Screenreader unsichtbar, dies ist sein Text. */
export function describeFigure(figure: Figure): string {
  const { numerator, denominator } = figure.timeSignature;
  const bars = figure.bars.map((events, index) => {
    const list = events.map(nameOf).join(", ");
    return figure.bars.length > 1 ? `Takt ${index + 1}: ${list}` : list;
  });
  return `${numerator}/${denominator}-Takt: ${bars.join(". ")}.`;
}
