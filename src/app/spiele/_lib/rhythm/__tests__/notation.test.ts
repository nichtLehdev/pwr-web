import { describe, expect, it } from "@jest/globals";
import { generateBar } from "../generator";
import { LEVELS } from "../levels";
import { sumTicks, TICKS_PER_QUARTER } from "../ticks";

/** VexFlow rechnet mit 4096 Ticks je Viertel: Das Spiel darf davon nicht abweichen. */
const VEX_PER_TICK = 4096 / TICKS_PER_QUARTER;

describe.each(LEVELS.map((l) => [l.id, l] as const))("%s", (_, level) => {
  it("uses values that fit VexFlow's tick grid", () => {
    for (let run = 0; run < 100; run++) {
      for (const ts of level.meters) {
        const bar = generateBar(level, ts);
        const vexTicks = sumTicks(bar) * VEX_PER_TICK;
        expect(vexTicks).toBe((4096 * 4 * ts.numerator) / ts.denominator);
      }
    }
  });
});
