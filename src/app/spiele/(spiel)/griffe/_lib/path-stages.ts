import {
  createLearningPath,
  DAILY_ID,
  finishedStages,
  type PathProgress,
  type PathStage,
} from "../../../_lib/learning-path";
import { pitchKey } from "../../noten-lesen/_lib/ranges";
import type { WrittenPitch } from "../../noten-lesen/_lib/types";
import { getRawFingeringEntry } from "./fingering-lookup";
import { displayPitchForInstrument } from "./pick-pitch";
import {
  griffeAdvancedDisplayMidiRange,
  griffePitchPool,
  spellingsForMidi,
} from "./pitch-range";
import type { GriffeInstrumentId } from "./types";

export type GriffeStage = PathStage & {
  pool: (instrument: GriffeInstrumentId) => WrittenPitch[];
};

function basics(instrument: GriffeInstrumentId) {
  return griffePitchPool(instrument, "beginner").map((pitch) =>
    displayPitchForInstrument(instrument, pitch),
  );
}

function wider(instrument: GriffeInstrumentId) {
  return griffePitchPool(instrument, "intermediate").map((pitch) =>
    displayPitchForInstrument(instrument, pitch),
  );
}

function chromatic(
  instrument: GriffeInstrumentId,
  part: "low" | "high" | "all",
) {
  const { lo, hi } = griffeAdvancedDisplayMidiRange(instrument);
  const middle = Math.floor((lo + hi) / 2);
  const from = part === "high" ? middle + 1 : lo;
  const to = part === "low" ? middle : hi;
  return Array.from({ length: to - from + 1 }, (_, i) => from + i).flatMap(
    spellingsForMidi,
  );
}

export const GRIFFE_PATH = createLearningPath<GriffeStage>([
  {
    title: "Die ersten Griffe",
    hint: "Fünf Töne, mit denen fast alles anfängt.",
    stages: [
      {
        id: "erste-drei",
        title: "Die ersten drei",
        hint: "Drei Töne, die sich gut unterscheiden",
        pool: (instrument) => {
          const notes = basics(instrument);
          return instrument === "trombone"
            ? [notes[0]!, notes[2]!, notes[4]!]
            : [notes[0]!, notes[3]!, notes[4]!];
        },
      },
      {
        id: "alle-fuenf",
        title: "Alle fünf",
        hint: "Die zwei übrigen kommen dazu",
        pool: basics,
      },
    ],
  },
  {
    title: "Höher hinaus",
    hint: "Die nächsten Töne nach oben.",
    stages: [
      {
        id: "neue-toene",
        title: "Neue Töne",
        hint: "Nur die, die du noch nicht kennst",
        pool: (instrument) => {
          const known = new Set(basics(instrument).map(pitchKey));
          return wider(instrument).filter(
            (pitch) => !known.has(pitchKey(pitch)),
          );
        },
      },
      {
        id: "alle-zusammen",
        title: "Alle zusammen",
        hint: "Alte und neue Töne gemischt",
        pool: wider,
      },
    ],
  },
  {
    title: "Alle Griffe",
    hint: "Der ganze Umfang mit Vorzeichen.",
    stages: [
      {
        id: "tiefe-haelfte",
        title: "Die tiefe Hälfte",
        hint: "Alle Halbtöne von unten bis zur Mitte",
        pool: (instrument) => chromatic(instrument, "low"),
      },
      {
        id: "hohe-haelfte",
        title: "Die hohe Hälfte",
        hint: "Alle Halbtöne von der Mitte nach oben",
        pool: (instrument) => chromatic(instrument, "high"),
      },
      {
        id: "voller-umfang",
        title: "Der volle Umfang",
        hint: "Alles gemischt, auch Alternativ-Griffe zählen",
        pool: (instrument) => chromatic(instrument, "all"),
      },
    ],
  },
]);

const LESSON_NOTES = 10;
const CHALLENGE_NOTES = 15;

export type GriffeRun = {
  id: string;
  pitches: WrittenPitch[];
  total: number;
  challengeSection: number | null;
  daily: boolean;
  /** Bestenliste: Die Noten kommen vom Server. */
  ranked?: boolean;
};

/** Nur Töne mit bekanntem Griff; eine Challenge zieht aus allen bisherigen Stufen. */
export function buildGriffeRun(
  id: string,
  instrument: GriffeInstrumentId,
  progress: PathProgress = {},
): GriffeRun {
  const daily = id === DAILY_ID;
  const challengeSection = GRIFFE_PATH.parseChallengeId(id);
  const stages = daily
    ? finishedStages(GRIFFE_PATH, progress)
    : challengeSection !== null
      ? GRIFFE_PATH.sections
          .slice(0, challengeSection + 1)
          .flatMap((section) => section.stages)
      : [GRIFFE_PATH.stageById(id) ?? GRIFFE_PATH.stages[0]!];
  const unique = new Map<string, WrittenPitch>();
  for (const stage of stages) {
    for (const pitch of stage.pool(instrument)) {
      if (getRawFingeringEntry(instrument, pitch)) {
        unique.set(pitchKey(pitch), pitch);
      }
    }
  }
  return {
    id,
    pitches: [...unique.values()],
    total: challengeSection !== null ? CHALLENGE_NOTES : LESSON_NOTES,
    challengeSection,
    daily,
  };
}
