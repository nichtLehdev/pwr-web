import { describe, expect, it } from "@jest/globals";
import { figureKey } from "../../../../_lib/rhythm/ticks";
import {
  buildDictationRun,
  createRound,
  DICTATION_PATH,
} from "../dictation-path";

describe("dictation path", () => {
  it.each(DICTATION_PATH.stages.map((s) => s.id))(
    "%s offers distinct answers with the right one among them",
    (id) => {
      const run = buildDictationRun(id);
      for (let i = 0; i < 40; i++) {
        const round = createRound(run.levels[0]!, run.options, new Set());
        const keys = round.options.map(figureKey);
        expect(new Set(keys).size).toBe(keys.length);
        expect(keys.length).toBeGreaterThanOrEqual(2);
        expect(keys[round.correctIndex]).toBe(figureKey(round.target));
      }
    },
  );

  it("challenges cover the section and earlier ones", () => {
    DICTATION_PATH.sections.forEach((section) => {
      const run = buildDictationRun(DICTATION_PATH.challengeId(section.index));
      expect(run.levels).toHaveLength(10);
      for (const stage of section.stages) {
        expect(run.levels).toContain(stage.level);
      }
    });
  });
});
