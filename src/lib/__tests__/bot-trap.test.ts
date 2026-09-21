import { describe, expect, it } from "@jest/globals";

import {
  BOT_TRAP_ELAPSED_HEADER,
  BOT_TRAP_HEADER,
  MIN_FILL_TIME_MS,
  botTrapFromHeaders,
  inspectBotTrap,
} from "../bot-trap";

describe("inspectBotTrap", () => {
  it("accepts an empty trap and a plausible fill time", () => {
    expect(inspectBotTrap({ trap: "", elapsedMs: MIN_FILL_TIME_MS })).toBe(
      "ok",
    );
  });

  it("rejects a filled honeypot even when the timing looks human", () => {
    expect(
      inspectBotTrap({ trap: "https://spam.example", elapsedMs: 30_000 }),
    ).toBe("honeypot");
  });

  it("ignores whitespace in the honeypot", () => {
    expect(inspectBotTrap({ trap: "   ", elapsedMs: 30_000 })).toBe("ok");
  });

  it("rejects a submission faster than a person can type", () => {
    expect(inspectBotTrap({ trap: "", elapsedMs: MIN_FILL_TIME_MS - 1 })).toBe(
      "too-fast",
    );
  });

  it("reports a missing measurement separately from a fast one", () => {
    expect(inspectBotTrap({ trap: "", elapsedMs: null })).toBe("missing");
    expect(inspectBotTrap({ trap: undefined, elapsedMs: undefined })).toBe(
      "missing",
    );
    expect(inspectBotTrap({ trap: "", elapsedMs: Number.NaN })).toBe("missing");
    expect(inspectBotTrap({ trap: "", elapsedMs: -1 })).toBe("missing");
  });
});

describe("botTrapFromHeaders", () => {
  it("reads both signals from the request headers", () => {
    const headers = new Headers({
      [BOT_TRAP_HEADER]: "",
      [BOT_TRAP_ELAPSED_HEADER]: String(MIN_FILL_TIME_MS + 500),
    });
    expect(botTrapFromHeaders(headers)).toBe("ok");
  });

  it("treats a request without headers as not coming from the form", () => {
    expect(botTrapFromHeaders(new Headers())).toBe("missing");
  });

  it("does not read an empty header as zero milliseconds", () => {
    const headers = new Headers({ [BOT_TRAP_ELAPSED_HEADER]: "  " });
    expect(botTrapFromHeaders(headers)).toBe("missing");
  });

  it("catches the honeypot in a header", () => {
    const headers = new Headers({
      [BOT_TRAP_HEADER]: "spam",
      [BOT_TRAP_ELAPSED_HEADER]: "60000",
    });
    expect(botTrapFromHeaders(headers)).toBe("honeypot");
  });
});
