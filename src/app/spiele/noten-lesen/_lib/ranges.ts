import type { DifficultyId, InstrumentId, WrittenPitch } from "./types";
import { writtenPitchToMidi } from "./pitch";

/** Enharmonisch zu den Flachschreibweisen (Des, Es, …): Cis, Dis, Fis, Gis, Ais. */
function midiToWrittenPitchSharpEnharmonic(midi: number): WrittenPitch | null {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  switch (pc) {
    case 1:
      return { letter: "C", octave, alter: 1 };
    case 3:
      return { letter: "D", octave, alter: 1 };
    case 6:
      return { letter: "F", octave, alter: 1 };
    case 8:
      return { letter: "G", octave, alter: 1 };
    case 10:
      return { letter: "A", octave, alter: 1 };
    default:
      return null;
  }
}

const trumpetBeginnerLo: WrittenPitch = { letter: "E", octave: 4, alter: 0 };
const trumpetBeginnerHi: WrittenPitch = { letter: "G", octave: 5, alter: 0 };

const trumpetIntermediateLo: WrittenPitch = { letter: "C", octave: 4, alter: 0 };
const trumpetIntermediateHi: WrittenPitch = { letter: "C", octave: 6, alter: 0 };

/** Horn in F (geschrieben): tieferer Einstieg als Trompete, größerer Mittel-/Tieflage-Anteil. */
const hornBeginnerLo: WrittenPitch = { letter: "G", octave: 3, alter: 0 };
const hornBeginnerHi: WrittenPitch = { letter: "G", octave: 5, alter: 0 };
const hornIntermediateLo: WrittenPitch = { letter: "F", octave: 3, alter: 0 };
const hornIntermediateHi: WrittenPitch = { letter: "A", octave: 5, alter: 0 };

/** Fortgeschritten: großer geschriebener Blech-Tonumfang (chromatisch). */
const TRUMPET_ADV_LO_MIDI = 54; // Fis3
const TRUMPET_ADV_HI_MIDI = 86; // D6

/** Horn in F: chromatisch geschrieben, etwas mehr Tiefe als Trompete, hoher Kantilene-Bereich. */
const HORN_ADV_LO_MIDI = 50; // D3
const HORN_ADV_HI_MIDI = 84; // C6

const bassBeginnerLo: WrittenPitch = { letter: "E", octave: 3, alter: 0 };
/** Bis d′ (D4), wie in der Vorgabe — oberhalb des Systems mit einer Hilfslinie. */
const bassBeginnerHi: WrittenPitch = { letter: "D", octave: 4, alter: 0 };

const bassIntermediateLo: WrittenPitch = { letter: "C", octave: 3, alter: 0 };
const bassIntermediateHi: WrittenPitch = { letter: "F", octave: 4, alter: 0 };

/** C-Schlüssel üben: diatonisch, nur Naturtöne (alter 0). */
const altoLearnBeginnerLo: WrittenPitch = { letter: "C", octave: 4, alter: 0 };
const altoLearnBeginnerHi: WrittenPitch = { letter: "G", octave: 4, alter: 0 };
const altoLearnIntermediateLo: WrittenPitch = { letter: "A", octave: 3, alter: 0 };
const altoLearnIntermediateHi: WrittenPitch = { letter: "C", octave: 5, alter: 0 };

const tenorLearnBeginnerLo: WrittenPitch = { letter: "C", octave: 4, alter: 0 };
const tenorLearnBeginnerHi: WrittenPitch = { letter: "G", octave: 4, alter: 0 };
const tenorLearnIntermediateLo: WrittenPitch = { letter: "F", octave: 3, alter: 0 };
const tenorLearnIntermediateHi: WrittenPitch = { letter: "A", octave: 4, alter: 0 };

const BASS_ADV_LO_MIDI = 34; // H1 / tiefer noch möglich — praktischer Tuba-Umfang
const BASS_ADV_HI_MIDI = 77; // F5

/** Experte: Union aus Bass- und Violinschlüssel-Fortgeschritten-Umfang (geschrieben). */
const EXPERT_LO_MIDI = Math.min(BASS_ADV_LO_MIDI, TRUMPET_ADV_LO_MIDI);
const EXPERT_HI_MIDI = Math.max(BASS_ADV_HI_MIDI, TRUMPET_ADV_HI_MIDI);

function stepUp(
  letter: WrittenPitch["letter"],
  octave: number,
): [WrittenPitch["letter"], number] {
  switch (letter) {
    case "E":
      return ["F", octave];
    case "F":
      return ["G", octave];
    case "G":
      return ["A", octave];
    case "A":
      return ["H", octave];
    case "H":
      return ["C", octave + 1];
    case "C":
      return ["D", octave];
    case "D":
      return ["E", octave];
  }
}

function walkDiatonicRange(lo: WrittenPitch, hi: WrittenPitch): WrittenPitch[] {
  const out: WrittenPitch[] = [];
  let cur: WrittenPitch = { letter: lo.letter, octave: lo.octave, alter: 0 };
  const midiHi = writtenPitchToMidi(hi);
  const max = 200;
  let guard = 0;
  while (writtenPitchToMidi(cur) <= midiHi && guard < max) {
    out.push({ ...cur });
    if (cur.letter === hi.letter && cur.octave === hi.octave) break;
    const [nl, no] = stepUp(cur.letter, cur.octave);
    cur = { letter: nl, octave: no, alter: 0 };
    guard++;
  }
  return out;
}

/**
 * Chromatische Umschrift (Fortgeschritten): deutsche **-es**-Namen wo üblich
 * (Des, Es, Ges, As, B), daneben **-is** (Cis, Dis, Fis, Gis, Ais).
 * Passt zu `answerLabelForPitch` (Des, Ges, As, …).
 */
export function midiToWrittenPitch(midi: number): WrittenPitch {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;

  switch (pc) {
    case 0:
      return { letter: "C", octave, alter: 0 };
    case 1:
      return { letter: "D", octave, alter: -1 };
    case 2:
      return { letter: "D", octave, alter: 0 };
    case 3:
      return { letter: "E", octave, alter: -1 };
    case 4:
      return { letter: "E", octave, alter: 0 };
    case 5:
      return { letter: "F", octave, alter: 0 };
    case 6:
      return { letter: "G", octave, alter: -1 };
    case 7:
      return { letter: "G", octave, alter: 0 };
    case 8:
      return { letter: "A", octave, alter: -1 };
    case 9:
      return { letter: "A", octave, alter: 0 };
    case 10:
      return { letter: "H", octave, alter: -1 };
    case 11:
      return { letter: "H", octave, alter: 0 };
    default:
      return { letter: "C", octave, alter: 0 };
  }
}

export function chromaticBetween(loMidi: number, hiMidi: number): WrittenPitch[] {
  const byKey = new Map<string, WrittenPitch>();
  const add = (p: WrittenPitch) => {
    byKey.set(pitchKey(p), p);
  };
  for (let m = loMidi; m <= hiMidi; m++) {
    add(midiToWrittenPitch(m));
    const sharp = midiToWrittenPitchSharpEnharmonic(m);
    if (sharp) add(sharp);
  }
  return [...byKey.values()];
}

export function clefForInstrument(id: InstrumentId): "treble" | "bass" {
  return id === "trombone" || id === "tuba" ? "bass" : "treble";
}

export function pitchPool(
  instrument: InstrumentId,
  difficulty: DifficultyId,
): WrittenPitch[] {
  const isLow = instrument === "trombone" || instrument === "tuba";
  const isHorn = instrument === "horn_f";

  if (difficulty === "beginner") {
    if (isLow) return walkDiatonicRange(bassBeginnerLo, bassBeginnerHi);
    if (isHorn) return walkDiatonicRange(hornBeginnerLo, hornBeginnerHi);
    return walkDiatonicRange(trumpetBeginnerLo, trumpetBeginnerHi);
  }
  if (difficulty === "intermediate") {
    if (isLow) return walkDiatonicRange(bassIntermediateLo, bassIntermediateHi);
    if (isHorn) return walkDiatonicRange(hornIntermediateLo, hornIntermediateHi);
    return walkDiatonicRange(trumpetIntermediateLo, trumpetIntermediateHi);
  }

  if (difficulty === "alto_beginner") {
    return walkDiatonicRange(altoLearnBeginnerLo, altoLearnBeginnerHi);
  }
  if (difficulty === "alto_intermediate") {
    return walkDiatonicRange(altoLearnIntermediateLo, altoLearnIntermediateHi);
  }
  if (difficulty === "tenor_beginner") {
    return walkDiatonicRange(tenorLearnBeginnerLo, tenorLearnBeginnerHi);
  }
  if (difficulty === "tenor_intermediate") {
    return walkDiatonicRange(tenorLearnIntermediateLo, tenorLearnIntermediateHi);
  }

  if (difficulty === "expert" || difficulty === "hardcore") {
    return chromaticBetween(EXPERT_LO_MIDI, EXPERT_HI_MIDI);
  }

  if (isLow) {
    return chromaticBetween(BASS_ADV_LO_MIDI, BASS_ADV_HI_MIDI);
  }
  if (isHorn) {
    return chromaticBetween(HORN_ADV_LO_MIDI, HORN_ADV_HI_MIDI);
  }
  return chromaticBetween(TRUMPET_ADV_LO_MIDI, TRUMPET_ADV_HI_MIDI);
}

export function pitchKey(p: WrittenPitch): string {
  return `${p.letter}${p.octave}${p.alter}`;
}
