import { describe, expect, it } from "@jest/globals";
import { getRawFingeringEntry } from "../fingering-lookup";
import { buildGriffeRun, GRIFFE_PATH } from "../path-stages";
import { GRIFFE_INSTRUMENTS } from "../types";

const IDS = [
  ...GRIFFE_PATH.stages.map((stage) => stage.id),
  ...GRIFFE_PATH.sections.map((section) =>
    GRIFFE_PATH.challengeId(section.index),
  ),
];

describe.each(GRIFFE_INSTRUMENTS.map((i) => [i.label, i.id] as const))(
  "%s",
  (_, instrument) => {
    it.each(IDS)("%s has playable notes", (id) => {
      const run = buildGriffeRun(id, instrument);
      expect(run.pitches.length).toBeGreaterThanOrEqual(3);
      for (const pitch of run.pitches) {
        expect(getRawFingeringEntry(instrument, pitch)).not.toBeNull();
      }
    });

    it("starts with three notes and adds the rest step by step", () => {
      const first = buildGriffeRun("erste-drei", instrument).pitches;
      const five = buildGriffeRun("alle-fuenf", instrument).pitches;
      expect(first).toHaveLength(3);
      expect(five).toHaveLength(5);
      expect(five).toEqual(expect.arrayContaining(first));
    });

    it("keeps the first section free of accidental spellings it did not teach", () => {
      const challenge = buildGriffeRun(GRIFFE_PATH.challengeId(0), instrument);
      expect(challenge.pitches).toHaveLength(5);
    });
  },
);
