import { describe, expect, it } from "@jest/globals";
import { createHmac } from "crypto";
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "../unsubscribe-token";

const EMAIL = "person@example.org";

describe("unsubscribe tokens", () => {
  it("round-trips a freshly created token", () => {
    const token = createUnsubscribeToken(EMAIL);
    expect(verifyUnsubscribeToken(EMAIL, token)).toBe(true);
  });

  it("is case-insensitive on the e-mail address", () => {
    const token = createUnsubscribeToken("Person@Example.org");
    expect(verifyUnsubscribeToken("person@example.org", token)).toBe(true);
  });

  it("rejects a token for a different address", () => {
    const token = createUnsubscribeToken(EMAIL);
    expect(verifyUnsubscribeToken("other@example.org", token)).toBe(false);
  });

  it("rejects tampered signatures", () => {
    const token = createUnsubscribeToken(EMAIL);
    const [expiry, signature] = token.split(".");
    const flipped =
      signature!.slice(0, -1) + (signature!.endsWith("a") ? "b" : "a");
    expect(verifyUnsubscribeToken(EMAIL, `${expiry}.${flipped}`)).toBe(false);
  });

  it("rejects tampered expiry timestamps", () => {
    const token = createUnsubscribeToken(EMAIL);
    const [, signature] = token.split(".");
    const farFuture = Date.now() + 100 * 365 * 24 * 60 * 60 * 1000;
    expect(verifyUnsubscribeToken(EMAIL, `${farFuture}.${signature}`)).toBe(
      false,
    );
  });

  it("rejects expired tokens", () => {
    const past = Date.now() - 1000;
    // Even a correctly signed token must fail once expired.
    const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
      .update(`newsletter-unsubscribe|${EMAIL}|${past}`)
      .digest("hex");
    expect(verifyUnsubscribeToken(EMAIL, `${past}.${signature}`)).toBe(false);
  });

  it("still accepts legacy tokens (bare hmac of the e-mail)", () => {
    const legacy = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
      .update(EMAIL.toLowerCase())
      .digest("hex");
    expect(verifyUnsubscribeToken(EMAIL, legacy)).toBe(true);
  });

  it("rejects garbage", () => {
    expect(verifyUnsubscribeToken(EMAIL, "")).toBe(false);
    expect(verifyUnsubscribeToken(EMAIL, "not-a-token")).toBe(false);
    expect(verifyUnsubscribeToken(EMAIL, "123.abc")).toBe(false);
  });
});
