import { describe, expect, it } from "@jest/globals";
import { changesRestrictedFlag } from "../restricted-flag";

describe("changesRestrictedFlag", () => {
  it("is false when the field was not submitted at all", () => {
    expect(changesRestrictedFlag(undefined, false)).toBe(false);
    expect(changesRestrictedFlag(undefined, true)).toBe(false);
  });

  // The regression: the course edit form always submits every field, so an
  // unchanged value used to make the whole save fail for anyone lacking the
  // permission — including users who never touched the setting.
  it("is false when the submitted value matches what is stored", () => {
    expect(changesRestrictedFlag(false, false)).toBe(false);
    expect(changesRestrictedFlag(true, true)).toBe(false);
  });

  it("is true when the flag is switched on", () => {
    expect(changesRestrictedFlag(true, false)).toBe(true);
  });

  // The other direction matters just as much: a form that hardcodes `false`
  // for users without the permission would otherwise silently switch an active
  // setting off.
  it("is true when the flag is switched off", () => {
    expect(changesRestrictedFlag(false, true)).toBe(true);
  });
});
