import { describe, expect, it } from "@jest/globals";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import {
  assertDistrictChangeAllowed,
  districtFieldState,
  districtAllowed,
  districtScopeFilter,
  districtScopeFor,
  type DistrictScope,
} from "@/lib/district-scope";

const perms = (...keys: PermissionKey[]) => new Set<PermissionKey>(keys);

const unrestricted: DistrictScope = { unrestricted: true };
const bezirk12: DistrictScope = { unrestricted: false, bezirkIds: ["b12"] };
const noBezirk: DistrictScope = { unrestricted: false, bezirkIds: [] };

describe("districtScopeFor", () => {
  // The approve permission is what separates the reviewing side (Admin, LPW,
  // RPW) from an Obmann — not a role name, so custom roles work too.
  it("is unrestricted for anyone who may approve the resource", () => {
    expect(
      districtScopeFor(perms(PERMISSIONS.EVENTS_APPROVE), "events", ["b12"]),
    ).toEqual({ unrestricted: true });
  });

  it("scopes per resource, not globally", () => {
    const eventReviewer = perms(PERMISSIONS.EVENTS_APPROVE);
    expect(
      districtScopeFor(eventReviewer, "events", ["b12"]).unrestricted,
    ).toBe(true);
    expect(districtScopeFor(eventReviewer, "posts", ["b12"]).unrestricted).toBe(
      false,
    );
  });

  it("scopes a creator to their own district", () => {
    expect(
      districtScopeFor(perms(PERMISSIONS.POSTS_CREATE), "posts", ["b12"]),
    ).toEqual({ unrestricted: false, bezirkIds: ["b12"] });
  });

  it("carries every scoped district, not just the first", () => {
    expect(
      districtScopeFor(perms(PERMISSIONS.EVENTS_CREATE), "events", [
        "b03",
        "b12",
      ]),
    ).toEqual({ unrestricted: false, bezirkIds: ["b03", "b12"] });
  });

  it("yields an empty scope when the user has no district", () => {
    expect(districtScopeFor(perms(), "courses", [])).toEqual({
      unrestricted: false,
      bezirkIds: [],
    });
  });
});

describe("districtAllowed", () => {
  it("lets the reviewing side use any district", () => {
    expect(districtAllowed(unrestricted, "b12")).toBe(true);
    expect(districtAllowed(unrestricted, "b03")).toBe(true);
    expect(districtAllowed(unrestricted, null)).toBe(true);
  });

  it("keeps a scoped user inside their own district", () => {
    expect(districtAllowed(bezirk12, "b12")).toBe(true);
    expect(districtAllowed(bezirk12, "b03")).toBe(false);
  });

  // "Übergreifend" content shows up under every district filter, so it belongs
  // to the reviewing side — an Obmann must not reach it by clearing the field.
  it("refuses cross-district content for a scoped user", () => {
    expect(districtAllowed(bezirk12, null)).toBe(false);
    expect(districtAllowed(bezirk12, undefined)).toBe(false);
  });

  // An account that may create but was never assigned a Bezirk has nowhere to
  // put its content; better a clear refusal than a silent cross-district post.
  it("refuses everything when the user has no district at all", () => {
    expect(districtAllowed(noBezirk, "b12")).toBe(false);
    expect(districtAllowed(noBezirk, null)).toBe(false);
  });
});

describe("districtScopeFilter", () => {
  it("returns no filter for the reviewing side", () => {
    expect(districtScopeFilter(unrestricted, "u1")).toBeNull();
  });

  // Own drafts stay visible even when they carry no district yet, otherwise a
  // half-filled draft would disappear from its author's own dashboard.
  it("keeps own content visible alongside the district", () => {
    expect(districtScopeFilter(bezirk12, "u1")).toEqual({
      OR: [{ createdById: "u1" }, { bezirkId: { in: ["b12"] } }],
    });
  });

  it("falls back to own content when the user has no district", () => {
    expect(districtScopeFilter(noBezirk, "u1")).toEqual({
      OR: [{ createdById: "u1" }, { bezirkId: { in: [] } }],
    });
  });
});

describe("assertDistrictChangeAllowed", () => {
  // The edit forms submit their whole state, so the district arrives on every
  // save. Checking the value would block saves rather than moves — and it would
  // hit exactly the people who reached the record another way: the author of a
  // legacy item and a delegated course organizer from a different Bezirk.
  it("passes when the district is submitted unchanged", () => {
    expect(() =>
      assertDistrictChangeAllowed(bezirk12, "b03", "b03"),
    ).not.toThrow();
    expect(() =>
      assertDistrictChangeAllowed(bezirk12, null, null),
    ).not.toThrow();
  });

  it("passes when the field was not submitted at all", () => {
    expect(() =>
      assertDistrictChangeAllowed(bezirk12, undefined, "b03"),
    ).not.toThrow();
  });

  it("refuses moving content into another district", () => {
    expect(() => assertDistrictChangeAllowed(bezirk12, "b03", "b12")).toThrow();
  });

  // Clearing the field turns a district item into a cross-district one.
  it("refuses clearing the district", () => {
    expect(() => assertDistrictChangeAllowed(bezirk12, null, "b12")).toThrow();
  });

  it("allows pulling content into the own district", () => {
    expect(() =>
      assertDistrictChangeAllowed(bezirk12, "b12", "b03"),
    ).not.toThrow();
  });

  it("lets the reviewing side move anything anywhere", () => {
    expect(() =>
      assertDistrictChangeAllowed(unrestricted, "b03", "b12"),
    ).not.toThrow();
    expect(() =>
      assertDistrictChangeAllowed(unrestricted, null, "b12"),
    ).not.toThrow();
  });
});

describe("districtFieldState", () => {
  it("leaves the field open for the reviewing side", () => {
    expect(districtFieldState(true, [])).toEqual({
      lockedBezirkId: null,
      hasNoDistrict: false,
      selectableBezirkIds: null,
    });
  });

  // One responsibility means there is nothing to pick — show it locked rather
  // than a one-entry dropdown.
  it("locks the field to a single responsibility", () => {
    expect(districtFieldState(false, ["b12"])).toEqual({
      lockedBezirkId: "b12",
      hasNoDistrict: false,
      selectableBezirkIds: ["b12"],
    });
  });

  it("offers a choice between several responsibilities", () => {
    expect(districtFieldState(false, ["b03", "b12"])).toEqual({
      lockedBezirkId: null,
      hasNoDistrict: false,
      selectableBezirkIds: ["b03", "b12"],
    });
  });

  it("flags an account with no responsibility at all", () => {
    expect(districtFieldState(false, [])).toEqual({
      lockedBezirkId: null,
      hasNoDistrict: true,
      selectableBezirkIds: [],
    });
  });
});
