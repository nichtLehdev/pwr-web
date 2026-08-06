import { describe, expect, it } from "@jest/globals";
import { computeCourseCapacity } from "../course-capacity";

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
