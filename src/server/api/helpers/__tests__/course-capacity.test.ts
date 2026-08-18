import { describe, expect, it } from "@jest/globals";
import {
  assertPriceTierCapacity,
  computeCourseCapacity,
} from "../course-capacity";

describe("computeCourseCapacity", () => {
  it("returns Infinity for a course with no limits at all", () => {
    expect(
      computeCourseCapacity({ maxParticipants: null, priceOptions: [] }),
    ).toBe(Infinity);
  });

  it("returns Infinity when there is an unlimited tier and no course max", () => {
    expect(
      computeCourseCapacity({
        maxParticipants: null,
        priceOptions: [
          { label: "A", maxParticipants: 10 },
          { label: "B", maxParticipants: null },
        ],
      }),
    ).toBe(Infinity);
  });

  it("uses course max when tiers include an unlimited one", () => {
    expect(
      computeCourseCapacity({
        maxParticipants: 30,
        priceOptions: [
          { label: "A", maxParticipants: 10 },
          { label: "B", maxParticipants: null },
        ],
      }),
    ).toBe(30);
  });

  it("uses the tier sum when it is below the course max", () => {
    expect(
      computeCourseCapacity({
        maxParticipants: 30,
        priceOptions: [
          { label: "A", maxParticipants: 10 },
          { label: "B", maxParticipants: 5 },
        ],
      }),
    ).toBe(15);
  });

  it("uses the course max when it is below the tier sum", () => {
    expect(
      computeCourseCapacity({
        maxParticipants: 12,
        priceOptions: [
          { label: "A", maxParticipants: 10 },
          { label: "B", maxParticipants: 5 },
        ],
      }),
    ).toBe(12);
  });

  it("uses the tier sum when there is no course max", () => {
    expect(
      computeCourseCapacity({
        maxParticipants: null,
        priceOptions: [
          { label: "A", maxParticipants: 10 },
          { label: "B", maxParticipants: 5 },
        ],
      }),
    ).toBe(15);
  });

  it("does not treat a course without price options as full (old reduce bug)", () => {
    expect(
      computeCourseCapacity({ maxParticipants: 25, priceOptions: [] }),
    ).toBe(25);
  });

  it("treats a stored 0 as 0, not unlimited", () => {
    expect(
      computeCourseCapacity({ maxParticipants: 0, priceOptions: [] }),
    ).toBe(0);
  });
});

describe("assertPriceTierCapacity", () => {
  const priceOptions = [
    {
      id: "wasserburg",
      label: "Erwachsene Einzelzimmer",
      maxParticipants: 6,
    },
    { id: "marienau", label: "Erwachsene Einzelzimmer", maxParticipants: 30 },
    { id: "kinder", label: "Kinder und Jugendliche", maxParticipants: 50 },
  ];

  /** Minimaler Prisma-Stub: merkt sich das where und liefert einen Zählwert. */
  const dbWith = (count: number) => {
    const seen: unknown[] = [];
    return {
      db: {
        participant: {
          count: (args: { where: unknown }) => {
            seen.push(args.where);
            return Promise.resolve(count);
          },
        },
      } as never,
      seen,
    };
  };

  it("checks a tier against its own limit, not a same-named tier's", async () => {
    // 10 gebuchte Marienau-Plätze passen in dessen Limit 30 — über das Label
    // wäre gegen Wasserburgs Limit 6 geprüft und die Buchung abgelehnt worden.
    const { db } = dbWith(10);
    await expect(
      assertPriceTierCapacity(db, "course", priceOptions, { marienau: 1 }),
    ).resolves.toBeUndefined();
  });

  it("still rejects once the tier's own limit is reached", async () => {
    const { db } = dbWith(6);
    await expect(
      assertPriceTierCapacity(db, "course", priceOptions, { wasserburg: 1 }),
    ).rejects.toThrow("Erwachsene Einzelzimmer");
  });

  it("counts legacy label-only participants when the label is unique", async () => {
    const { db, seen } = dbWith(0);
    await assertPriceTierCapacity(db, "course", priceOptions, { kinder: 1 });
    expect(JSON.stringify(seen[0])).toContain("Kinder und Jugendliche");
  });

  it("ignores legacy label-only participants for duplicated labels", async () => {
    const { db, seen } = dbWith(0);
    await assertPriceTierCapacity(db, "course", priceOptions, { marienau: 1 });
    // Nur der id-Zweig, kein Label-Fallback — sonst zählten Wasserburgs
    // Altbestände gegen Marienaus Limit.
    expect(JSON.stringify(seen[0])).not.toContain("Erwachsene Einzelzimmer");
  });

  it("skips tiers without a limit", async () => {
    const { db, seen } = dbWith(999);
    await assertPriceTierCapacity(
      db,
      "course",
      [{ id: "offen", label: "Offen", maxParticipants: null }],
      { offen: 5 },
    );
    expect(seen).toHaveLength(0);
  });
});
