import {
  createLearningPath,
  type PathStage,
} from "../../../_lib/learning-path";
import { writtenPitchToMidi } from "./pitch";
import { clefForInstrument, pitchKey, pitchPool } from "./ranges";
import type { ClefKind, InstrumentId, WrittenPitch } from "./types";

const LETTERS: WrittenPitch["letter"][] = ["C", "D", "E", "F", "G", "A", "H"];
/** Unterste Linie je Schlüssel. */
const BOTTOM_LINE: Record<"treble" | "bass", WrittenPitch> = {
  treble: { letter: "E", octave: 4, alter: 0 },
  bass: { letter: "G", octave: 2, alter: 0 },
};
const LEDGER_NOTES = 4;

function diatonic(pitch: WrittenPitch): number {
  return pitch.octave * 7 + LETTERS.indexOf(pitch.letter);
}

/** 0 = unterste Linie, 1 = Zwischenraum darüber, 8 = oberste Linie. */
function staffStep(pitch: WrittenPitch, clef: "treble" | "bass"): number {
  return diatonic(pitch) - diatonic(BOTTOM_LINE[clef]);
}

function byHeight(pitches: WrittenPitch[]): WrittenPitch[] {
  return [...pitches].sort(
    (a, b) => writtenPitchToMidi(a) - writtenPitchToMidi(b),
  );
}

type Places = {
  naturals: WrittenPitch[];
  all: WrittenPitch[];
  clef: "treble" | "bass";
  inStaff: (pitch: WrittenPitch) => boolean;
};

function placesFor(instrument: InstrumentId): Places {
  const clef = clefForInstrument(instrument);
  const all = pitchPool(instrument, "advanced");
  return {
    all,
    clef,
    naturals: byHeight(all.filter((pitch) => pitch.alter === 0)),
    inStaff: (pitch) => {
      const step = staffStep(pitch, clef);
      return step >= 0 && step <= 8;
    },
  };
}

function ledgerBelow({ naturals, clef }: Places): WrittenPitch[] {
  return naturals
    .filter((pitch) => staffStep(pitch, clef) < 0)
    .slice(-LEDGER_NOTES);
}

function ledgerAbove({ naturals, clef }: Places): WrittenPitch[] {
  return naturals
    .filter((pitch) => staffStep(pitch, clef) > 8)
    .slice(0, LEDGER_NOTES);
}

export type NotenStage = PathStage & {
  pool: (places: Places) => WrittenPitch[];
};

export const NOTEN_PATH = createLearningPath<NotenStage>([
  {
    title: "Im Notensystem",
    hint: "Fünf Linien, vier Zwischenräume.",
    stages: [
      {
        id: "linien",
        title: "Auf den Linien",
        hint: "Nur Noten, die auf einer Linie sitzen",
        pool: ({ naturals, clef, inStaff }) =>
          naturals.filter(
            (pitch) => inStaff(pitch) && staffStep(pitch, clef) % 2 === 0,
          ),
      },
      {
        id: "zwischenraeume",
        title: "In den Zwischenräumen",
        hint: "Nur Noten zwischen den Linien",
        pool: ({ naturals, clef, inStaff }) =>
          naturals.filter(
            (pitch) => inStaff(pitch) && staffStep(pitch, clef) % 2 !== 0,
          ),
      },
      {
        id: "im-system",
        title: "Alle zusammen",
        hint: "Das ganze Notensystem gemischt",
        pool: ({ naturals, inStaff }) => naturals.filter(inStaff),
      },
    ],
  },
  {
    title: "Hilfslinien",
    hint: "Wenn die fünf Linien nicht reichen.",
    stages: [
      {
        id: "unten",
        title: "Unter dem System",
        hint: "Die Töne unterhalb der untersten Linie",
        pool: ledgerBelow,
      },
      {
        id: "oben",
        title: "Über dem System",
        hint: "Die Töne oberhalb der obersten Linie",
        pool: ledgerAbove,
      },
      {
        id: "alle-naturtoene",
        title: "Oben und unten",
        hint: "Das System samt Hilfslinien",
        pool: (places) => [
          ...ledgerBelow(places),
          ...places.naturals.filter(places.inStaff),
          ...ledgerAbove(places),
        ],
      },
    ],
  },
  {
    title: "Vorzeichen",
    hint: "Kreuz und B verändern den Ton.",
    stages: [
      {
        id: "kreuze",
        title: "Kreuze",
        hint: "Cis, Dis, Fis, Gis und Ais",
        pool: ({ all, inStaff }) =>
          all.filter((pitch) => pitch.alter === 1 && inStaff(pitch)),
      },
      {
        id: "bes",
        title: "Bs",
        hint: "Des, Es, Ges, As und B",
        pool: ({ all, inStaff }) =>
          all.filter((pitch) => pitch.alter === -1 && inStaff(pitch)),
      },
      {
        id: "vorzeichen-alle",
        title: "Alles im System",
        hint: "Mit und ohne Vorzeichen",
        pool: ({ all, inStaff }) => all.filter(inStaff),
      },
    ],
  },
  {
    title: "Der ganze Umfang",
    hint: "Alles, was dein Instrument kann.",
    stages: [
      {
        id: "umfang-naturtoene",
        title: "Von ganz tief bis ganz hoch",
        hint: "Der volle Umfang ohne Vorzeichen",
        pool: ({ naturals }) => naturals,
      },
      {
        id: "umfang-alle",
        title: "Alle Töne",
        hint: "Der volle Umfang mit Vorzeichen",
        pool: ({ all }) => all,
      },
    ],
  },
]);

const LESSON_NOTES = 10;
const CHALLENGE_NOTES = 15;

export type NotenRun = {
  id: string;
  pitches: WrittenPitch[];
  clef: ClefKind;
  total: number;
  challengeSection: number | null;
};

/** Eine Challenge zieht aus allen bisherigen Stufen. */
export function buildNotenRun(id: string, instrument: InstrumentId): NotenRun {
  const places = placesFor(instrument);
  const challengeSection = NOTEN_PATH.parseChallengeId(id);
  const stages =
    challengeSection !== null
      ? NOTEN_PATH.sections
          .slice(0, challengeSection + 1)
          .flatMap((section) => section.stages)
      : [NOTEN_PATH.stageById(id) ?? NOTEN_PATH.stages[0]!];
  const unique = new Map<string, WrittenPitch>();
  for (const stage of stages) {
    for (const pitch of stage.pool(places)) unique.set(pitchKey(pitch), pitch);
  }
  return {
    id,
    pitches: [...unique.values()],
    clef: places.clef,
    total: challengeSection !== null ? CHALLENGE_NOTES : LESSON_NOTES,
    challengeSection,
  };
}
