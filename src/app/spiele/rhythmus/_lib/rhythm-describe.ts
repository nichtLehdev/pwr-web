import type { GeneratedRhythm, RhythmEvent } from "./types";
import { splitEventsIntoBars } from "./rhythm-arithmetic";

/** Deutsche Namen der Notenwerte für die Screenreader-Beschreibung. */
function noteValueNameGerman(e: RhythmEvent): string {
  const tuplet = e.tupletGroupId !== undefined ? "Triolen-" : "";
  switch (e.noteValue) {
    case "w":
      return e.isRest ? "ganze Pause" : "ganze Note";
    case "h":
      return e.isRest ? "halbe Pause" : "halbe Note";
    case "qd":
      return e.isRest ? "punktierte Viertelpause" : "punktierte Viertelnote";
    case "q":
      return e.isRest ? "Viertelpause" : "Viertelnote";
    case "8":
      return e.isRest ? `${tuplet}Achtelpause` : `${tuplet}Achtelnote`;
    case "16":
      return e.isRest ? "Sechzehntelpause" : "Sechzehntelnote";
    default:
      return e.isRest ? "Pause" : "Note";
  }
}

/**
 * Textbeschreibung der Figur für Screenreader, z. B.
 * „4/4-Takt, 1 Takt: Viertelnote, Viertelnote, halbe Pause.“
 */
export function describeRhythmGerman(rhythm: GeneratedRhythm): string {
  const ts = `${rhythm.timeSignature.numerator}/${rhythm.timeSignature.denominator}`;
  const barWord = rhythm.bars === 1 ? "1 Takt" : `${rhythm.bars} Takte`;
  const barTexts = splitEventsIntoBars(rhythm).map((events, i) => {
    const list = events.map(noteValueNameGerman).join(", ");
    return rhythm.bars > 1 ? `Takt ${i + 1}: ${list}` : list;
  });
  return `${ts}-Takt, ${barWord}: ${barTexts.join(". ")}.`;
}
