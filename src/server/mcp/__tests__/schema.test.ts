import { describe, expect, it } from "@jest/globals";
import { z } from "zod";

import { reviveDates, toToolInputSchema } from "../schema";

const courseLike = z
  .object({
    title: z.string().min(1),
    startDate: z.date(),
    endDate: z.date(),
    registrationDeadline: z.date().optional().nullable(),
    registrationOpen: z.boolean().default(false),
    priceOptions: z
      .array(z.object({ label: z.string(), validUntil: z.date().optional() }))
      .optional(),
  })
  .refine((data) => data.endDate >= data.startDate, { path: ["endDate"] });

describe("toToolInputSchema", () => {
  it("beschreibt Datumsfelder als date-time-Text", () => {
    const schema = toToolInputSchema(courseLike);
    expect(schema.type).toBe("object");
    expect(schema.properties?.startDate).toMatchObject({
      type: "string",
      format: "date-time",
    });
  });

  it("verlangt Felder mit Voreinstellung nicht", () => {
    const schema = toToolInputSchema(courseLike);
    expect(schema.required).toEqual(
      expect.arrayContaining(["title", "startDate", "endDate"]),
    );
    expect(schema.required).not.toContain("registrationOpen");
  });

  it("liefert ein leeres Objekt ohne Eingabe", () => {
    expect(toToolInputSchema(undefined)).toEqual({
      type: "object",
      properties: {},
    });
  });
});

describe("reviveDates", () => {
  it("macht aus ISO-Text ein Date, auch in Arrays und hinter Hüllen", () => {
    const revived = reviveDates(courseLike, {
      title: "Bläserlehrgang",
      startDate: "2026-11-14T10:00:00+01:00",
      endDate: "2026-11-15T16:00:00+01:00",
      registrationDeadline: "2026-11-01T23:59:59+01:00",
      priceOptions: [{ label: "Regulär", validUntil: "2026-10-31T00:00:00Z" }],
    });

    const parsed = courseLike.parse(revived);
    expect(parsed.startDate).toEqual(new Date("2026-11-14T09:00:00Z"));
    expect(parsed.registrationDeadline).toBeInstanceOf(Date);
    expect(parsed.priceOptions?.[0]?.validUntil).toBeInstanceOf(Date);
  });

  it("lässt null, fremde Felder und Nicht-Datumstext unverändert", () => {
    const revived = reviveDates(courseLike, {
      title: "2026-11-14T10:00:00Z",
      registrationDeadline: null,
      extra: "2026-11-14T10:00:00Z",
    }) as Record<string, unknown>;

    expect(revived.title).toBe("2026-11-14T10:00:00Z");
    expect(revived.registrationDeadline).toBeNull();
    expect(revived.extra).toBe("2026-11-14T10:00:00Z");
  });

  it("lässt ungültige Datumsangaben für die Validierung stehen", () => {
    const revived = reviveDates(courseLike, {
      startDate: "nächsten Samstag",
    }) as Record<string, unknown>;
    expect(revived.startDate).toBe("nächsten Samstag");
  });
});
