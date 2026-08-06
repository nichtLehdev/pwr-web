import { describe, expect, it } from "@jest/globals";
import { parseDeadlineEndOfDay, toLocalDateInputValue } from "../date-input";
import { safeInternalPath } from "../safe-redirect";
import { isParticipantUnder18 } from "../participant-utils";

describe("parseDeadlineEndOfDay", () => {
  it("parses a date-only string as local end of day", () => {
    const deadline = parseDeadlineEndOfDay("2026-05-31");
    expect(deadline.getFullYear()).toBe(2026);
    expect(deadline.getMonth()).toBe(4);
    expect(deadline.getDate()).toBe(31);
    expect(deadline.getHours()).toBe(23);
    expect(deadline.getMinutes()).toBe(59);
  });

  it("accepts registrations throughout the deadline day", () => {
    const deadline = parseDeadlineEndOfDay("2026-05-31");
    const sameDayEvening = new Date(2026, 4, 31, 20, 0, 0);
    expect(sameDayEvening <= deadline).toBe(true);
  });
});

describe("toLocalDateInputValue", () => {
  it("formats in local time, not UTC", () => {
    // Just before local midnight — a UTC-based split("T")[0] would shift the day
    const date = new Date(2026, 4, 31, 0, 30, 0);
    expect(toLocalDateInputValue(date)).toBe("2026-05-31");
  });

  it("round-trips with parseDeadlineEndOfDay", () => {
    const parsed = parseDeadlineEndOfDay("2026-12-01");
    expect(toLocalDateInputValue(parsed)).toBe("2026-12-01");
  });
});

describe("safeInternalPath", () => {
  it("passes through internal paths", () => {
    expect(safeInternalPath("/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/termine?x=1")).toBe("/termine?x=1");
  });

  it("falls back for absolute URLs", () => {
    expect(safeInternalPath("https://evil.example")).toBe("/");
    expect(safeInternalPath("http://evil.example/x")).toBe("/");
  });

  it("falls back for protocol-relative escapes", () => {
    expect(safeInternalPath("//evil.example")).toBe("/");
    expect(safeInternalPath("/\\evil.example")).toBe("/");
  });

  it("falls back for empty values", () => {
    expect(safeInternalPath(null)).toBe("/");
    expect(safeInternalPath(undefined)).toBe("/");
    expect(safeInternalPath("")).toBe("/");
  });

  it("honors a custom fallback", () => {
    expect(safeInternalPath("//x", "/start")).toBe("/start");
  });
});

describe("isParticipantUnder18", () => {
  const reference = new Date(2026, 8, 1); // 2026-09-01

  it("is true just before the 18th birthday", () => {
    const birth = new Date(2008, 8, 2); // turns 18 on 2026-09-02
    expect(isParticipantUnder18(birth, reference)).toBe(true);
  });

  it("is false on the 18th birthday", () => {
    const birth = new Date(2008, 8, 1); // turns 18 exactly on reference day
    expect(isParticipantUnder18(birth, reference)).toBe(false);
  });

  it("is false for missing birth dates", () => {
    expect(isParticipantUnder18(null, reference)).toBe(false);
    expect(isParticipantUnder18(undefined, reference)).toBe(false);
  });
});
