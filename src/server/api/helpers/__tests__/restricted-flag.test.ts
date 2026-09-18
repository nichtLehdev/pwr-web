import { describe, expect, it } from "@jest/globals";
import { changesRestrictedFlag } from "../restricted-flag";

describe("changesRestrictedFlag", () => {
  it("is false when the field was not submitted at all", () => {
    expect(changesRestrictedFlag(undefined, false)).toBe(false);
    expect(changesRestrictedFlag(undefined, true)).toBe(false);
  });

  // The edit form submits every field; an unchanged value must not fail the
  // save for users lacking the permission.
  it("is false when the submitted value matches what is stored", () => {
    expect(changesRestrictedFlag(false, false)).toBe(false);
    expect(changesRestrictedFlag(true, true)).toBe(false);
  });

  it("is true when the flag is switched on", () => {
    expect(changesRestrictedFlag(true, false)).toBe(true);
  });

  // Otherwise a form hardcoding `false` would silently switch the setting off.
  it("is true when the flag is switched off", () => {
    expect(changesRestrictedFlag(false, true)).toBe(true);
  });
});
