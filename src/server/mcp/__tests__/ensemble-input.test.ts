import { describe, expect, it } from "@jest/globals";
import { z } from "zod";

import { restrictEnsembleInput } from "../ensemble-input";
import { toToolInputSchema } from "../schema";

// Ausschnitt der Eingabe von `ensembles.create`.
const procedureInput = z.object({
  name: z.string().min(1),
  rehearsalDay: z.string().max(50).optional(),
  rehearsalTime: z.string().max(50).optional(),
  rehearsalSchedules: z
    .array(z.object({ day: z.string(), time: z.string() }))
    .optional(),
});
const input = restrictEnsembleInput(procedureInput);

describe("restrictEnsembleInput", () => {
  it("nimmt Wochentag und Probenbeginn wie im Formular an", () => {
    const parsed = input.parse({
      name: "Posaunenchor",
      rehearsalSchedules: [
        { day: "Dienstag", time: "19:30" },
        { day: "Freitag", time: "08:05" },
      ],
    });
    expect(parsed.rehearsalSchedules).toEqual([
      { day: "Dienstag", time: "19:30" },
      { day: "Freitag", time: "08:05" },
    ]);
  });

  it.each(["19:30 - 21:30", "19:30 Uhr", "19.30", "7:30", "24:00"])(
    "lehnt %s als Probenbeginn ab",
    (time) => {
      expect(
        input.safeParse({
          name: "Posaunenchor",
          rehearsalSchedules: [{ day: "Dienstag", time }],
        }).success,
      ).toBe(false);
    },
  );

  it("lehnt Tage außerhalb der Liste ab", () => {
    expect(
      input.safeParse({
        name: "Posaunenchor",
        rehearsalSchedules: [{ day: "Di", time: "19:30" }],
      }).success,
    ).toBe(false);
  });

  it("verwirft die Altfelder rehearsalDay/rehearsalTime", () => {
    const parsed = input.parse({
      name: "Posaunenchor",
      rehearsalDay: "Dienstag",
      rehearsalTime: "19:30 - 21:30 Uhr",
    });
    expect(parsed).toEqual({ name: "Posaunenchor" });
  });

  it("zeigt die Vorgaben im Schema für den Client", () => {
    const schema = toToolInputSchema(input);
    expect(schema.properties).not.toHaveProperty("rehearsalTime");
    const text = JSON.stringify(schema.properties?.rehearsalSchedules);
    expect(text).toContain('"Sonntag"');
    expect(text).toContain("HH:MM");
    expect(text).toContain('"pattern"');
  });
});
