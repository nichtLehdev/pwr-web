import { describe, expect, it } from "@jest/globals";
import {
  answerLayoutForPitches,
  buildAnswerLabelsForLayout,
} from "../note-generator";
import { buildNotenRun, NOTEN_PATH } from "../path-stages";
import { labelsMatchAnswer } from "../pitch";
import { pitchKey } from "../ranges";
import { INSTRUMENTS } from "../types";

const IDS = [
  ...NOTEN_PATH.stages.map((stage) => stage.id),
  ...NOTEN_PATH.sections.map((section) =>
    NOTEN_PATH.challengeId(section.index),
  ),
];

describe.each(INSTRUMENTS.map((i) => [i.label, i.id] as const))(
  "%s",
  (_, id) => {
    it.each(IDS)("%s has enough notes and an answer for each", (stageId) => {
      const run = buildNotenRun(stageId, id);
      expect(run.pitches.length).toBeGreaterThanOrEqual(3);
      const layout = answerLayoutForPitches(run.pitches);
      for (const pitch of run.pitches) {
        const labels = buildAnswerLabelsForLayout(pitch, layout);
        expect(labels.some((label) => labelsMatchAnswer(label, pitch))).toBe(
          true,
        );
      }
    });

    it("gets harder: a challenge holds all earlier notes", () => {
      const first = buildNotenRun("linien", id).pitches.map(pitchKey);
      const challenge = buildNotenRun(
        NOTEN_PATH.challengeId(1),
        id,
      ).pitches.map(pitchKey);
      for (const key of first) expect(challenge).toContain(key);
      expect(challenge.length).toBeGreaterThan(first.length);
    });

    it("keeps sharps and flats out until they are taught", () => {
      for (const stage of NOTEN_PATH.sections
        .slice(0, 2)
        .flatMap((s) => s.stages)) {
        expect(
          buildNotenRun(stage.id, id).pitches.every((p) => p.alter === 0),
        ).toBe(true);
      }
    });
  },
);

describe("staff places", () => {
  it("knows lines and spaces in the treble clef", () => {
    const names = (stage: string) =>
      buildNotenRun(stage, "trumpet_c").pitches.map(
        (p) => `${p.letter}${p.octave}`,
      );
    expect(names("linien")).toEqual(["E4", "G4", "H4", "D5", "F5"]);
    expect(names("zwischenraeume")).toEqual(["F4", "A4", "C5", "E5"]);
  });

  it("knows lines in the bass clef", () => {
    expect(
      buildNotenRun("linien", "tuba").pitches.map(
        (p) => `${p.letter}${p.octave}`,
      ),
    ).toEqual(["G2", "H2", "D3", "F3", "A3"]);
  });
});
