import { describe, expect, it } from "@jest/globals";
import { LEVELS } from "../../../../_lib/rhythm/levels";
import { RHYTHM_PATH, SECTIONS } from "../path";

describe("one Rhythmus map", () => {
  it("keeps every level as a Nachspielen stage, in order", () => {
    const answers = RHYTHM_PATH.stages.filter((s) => s.mode === "answer");
    expect(answers.map((s) => s.level.id)).toEqual(LEVELS.map((l) => l.id));
  });

  it("offers Notenband only as a bonus in the first two sections", () => {
    for (const section of SECTIONS.slice(0, 2)) {
      expect(section.stages.every((s) => s.mode === "answer")).toBe(true);
      expect(section.bonus?.map((s) => s.mode)).toEqual(["band"]);
      for (const bonus of section.bonus!) {
        expect(RHYTHM_PATH.isBonus(bonus)).toBe(true);
      }
    }
  });

  it("puts Notenband stages on the path later, always after their level", () => {
    for (const section of SECTIONS.slice(2)) {
      expect(section.bonus ?? []).toHaveLength(0);
      section.stages.forEach((stage, i) => {
        if (stage.mode !== "band") return;
        expect(stage.badge).toBe("read");
        expect(section.stages[i - 1]?.level).toBe(stage.level);
      });
      expect(section.stages.at(-1)?.mode).toBe("band");
    }
  });

  it("gives every stage its own id", () => {
    const ids = RHYTHM_PATH.allStages.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
