import { describe, expect, it } from "@jest/globals";
import { createHmac } from "crypto";
import {
  createRegistrationAccessToken,
  verifyRegistrationAccessToken,
} from "../registration-access-token";

const REGISTRATION_ID = "0f1b2c3d-4e5f-6071-8293-a4b5c6d7e8f9";
const EMAIL = "person@example.org";

function signPayload(payload: string): string {
  return createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
    .update(payload)
    .digest("hex");
}

describe("registration access tokens", () => {
  it("round-trips a freshly created token", () => {
    const token = createRegistrationAccessToken(REGISTRATION_ID, EMAIL);
    expect(verifyRegistrationAccessToken(REGISTRATION_ID, EMAIL, token)).toBe(
      true,
    );
  });

  it("is case-insensitive on the e-mail address", () => {
    const token = createRegistrationAccessToken(
      REGISTRATION_ID,
      "Person@Example.org",
    );
    expect(verifyRegistrationAccessToken(REGISTRATION_ID, EMAIL, token)).toBe(
      true,
    );
  });

  it("rejects a token issued for another registration", () => {
    const token = createRegistrationAccessToken(REGISTRATION_ID, EMAIL);
    expect(
      verifyRegistrationAccessToken("some-other-registration", EMAIL, token),
    ).toBe(false);
  });

  it("rejects a token once the registrant's address changed", () => {
    const token = createRegistrationAccessToken(REGISTRATION_ID, EMAIL);
    expect(
      verifyRegistrationAccessToken(
        REGISTRATION_ID,
        "other@example.org",
        token,
      ),
    ).toBe(false);
  });

  it("rejects tampered signatures", () => {
    const token = createRegistrationAccessToken(REGISTRATION_ID, EMAIL);
    const [expiry, signature] = token.split(".");
    const flipped =
      signature!.slice(0, -1) + (signature!.endsWith("a") ? "b" : "a");
    expect(
      verifyRegistrationAccessToken(
        REGISTRATION_ID,
        EMAIL,
        `${expiry}.${flipped}`,
      ),
    ).toBe(false);
  });

  it("rejects tampered expiry timestamps", () => {
    const token = createRegistrationAccessToken(REGISTRATION_ID, EMAIL);
    const [, signature] = token.split(".");
    const farFuture = Date.now() + 100 * 365 * 24 * 60 * 60 * 1000;
    expect(
      verifyRegistrationAccessToken(
        REGISTRATION_ID,
        EMAIL,
        `${farFuture}.${signature}`,
      ),
    ).toBe(false);
  });

  it("rejects expired tokens even when correctly signed", () => {
    const past = Date.now() - 1000;
    const signature = signPayload(
      `registration-access|${REGISTRATION_ID}|${EMAIL}|${past}`,
    );
    expect(
      verifyRegistrationAccessToken(
        REGISTRATION_ID,
        EMAIL,
        `${past}.${signature}`,
      ),
    ).toBe(false);
  });

  it("rejects a signature made for a different purpose", () => {
    const expiresAt = Date.now() + 60_000;
    // A newsletter unsubscribe token must not double as a registration key.
    const signature = signPayload(
      `newsletter-unsubscribe|${EMAIL}|${expiresAt}`,
    );
    expect(
      verifyRegistrationAccessToken(
        REGISTRATION_ID,
        EMAIL,
        `${expiresAt}.${signature}`,
      ),
    ).toBe(false);
  });

  it("rejects garbage", () => {
    expect(verifyRegistrationAccessToken(REGISTRATION_ID, EMAIL, "")).toBe(
      false,
    );
    expect(
      verifyRegistrationAccessToken(REGISTRATION_ID, EMAIL, "not-a-token"),
    ).toBe(false);
    expect(
      verifyRegistrationAccessToken(REGISTRATION_ID, EMAIL, "123.abc"),
    ).toBe(false);
  });
});
