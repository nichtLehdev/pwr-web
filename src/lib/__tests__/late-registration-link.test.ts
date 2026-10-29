import { describe, expect, it } from "@jest/globals";
import {
  lateRegistrationLinkExpiry,
  lateRegistrationLinkState,
} from "@/lib/late-registration-link";

describe("lateRegistrationLinkState", () => {
  const now = new Date("2026-10-29T12:00:00Z");
  const future = "2026-11-05T12:00:00Z";

  it("ist offen, solange er weder benutzt, widerrufen noch abgelaufen ist", () => {
    expect(
      lateRegistrationLinkState(
        { usedAt: null, revokedAt: null, expiresAt: future },
        now,
      ),
    ).toBe("open");
  });

  it("gilt ab dem Ablaufzeitpunkt als abgelaufen", () => {
    expect(
      lateRegistrationLinkState(
        { usedAt: null, revokedAt: null, expiresAt: now },
        now,
      ),
    ).toBe("expired");
  });

  it("zeigt eine Benutzung auch nach Ablauf oder Widerruf als benutzt", () => {
    expect(
      lateRegistrationLinkState(
        {
          usedAt: "2026-10-20T12:00:00Z",
          revokedAt: "2026-10-21T12:00:00Z",
          expiresAt: "2026-10-22T12:00:00Z",
        },
        now,
      ),
    ).toBe("used");
  });

  it("geht bei Widerruf dem Ablauf vor", () => {
    expect(
      lateRegistrationLinkState(
        {
          usedAt: null,
          revokedAt: "2026-10-21T12:00:00Z",
          expiresAt: "2026-10-22T12:00:00Z",
        },
        now,
      ),
    ).toBe("revoked");
  });
});

describe("lateRegistrationLinkExpiry", () => {
  const now = new Date("2026-10-29T12:00:00Z");

  it("läuft nach der gewählten Zahl von Tagen ab", () => {
    expect(
      lateRegistrationLinkExpiry(7, "2026-12-31T12:00:00Z", now).toISOString(),
    ).toBe("2026-11-05T12:00:00.000Z");
  });

  it("gilt höchstens bis Kursende", () => {
    expect(
      lateRegistrationLinkExpiry(30, "2026-11-01T16:00:00Z", now).toISOString(),
    ).toBe("2026-11-01T16:00:00.000Z");
  });
});
