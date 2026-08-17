import { describe, expect, it } from "@jest/globals";
import { createHmac } from "crypto";
import {
  createNewsletterConfirmToken,
  verifyNewsletterConfirmToken,
} from "../newsletter-confirm-token";
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "../unsubscribe-token";
import { createRegistrationAccessToken } from "../registration-access-token";

const EMAIL = "person@example.org";

describe("newsletter confirmation tokens", () => {
  it("round-trips a freshly created token", () => {
    const token = createNewsletterConfirmToken(EMAIL);
    expect(verifyNewsletterConfirmToken(EMAIL, token)).toBe(true);
  });

  it("is case-insensitive on the e-mail address", () => {
    const token = createNewsletterConfirmToken("Person@Example.org");
    expect(verifyNewsletterConfirmToken(EMAIL, token)).toBe(true);
  });

  it("rejects a token issued for a different address", () => {
    const token = createNewsletterConfirmToken(EMAIL);
    expect(verifyNewsletterConfirmToken("other@example.org", token)).toBe(
      false,
    );
  });

  it("rejects tampered signatures and expiries", () => {
    const token = createNewsletterConfirmToken(EMAIL);
    const [expiry, signature] = token.split(".");
    const flipped =
      signature!.slice(0, -1) + (signature!.endsWith("a") ? "b" : "a");
    const farFuture = Date.now() + 100 * 365 * 24 * 60 * 60 * 1000;

    expect(verifyNewsletterConfirmToken(EMAIL, `${expiry}.${flipped}`)).toBe(
      false,
    );
    expect(
      verifyNewsletterConfirmToken(EMAIL, `${farFuture}.${signature}`),
    ).toBe(false);
  });

  it("rejects expired tokens even when correctly signed", () => {
    const past = Date.now() - 1000;
    const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
      .update(`newsletter-confirm|${EMAIL}|${past}`)
      .digest("hex");
    expect(verifyNewsletterConfirmToken(EMAIL, `${past}.${signature}`)).toBe(
      false,
    );
  });

  it("rejects garbage", () => {
    expect(verifyNewsletterConfirmToken(EMAIL, "")).toBe(false);
    expect(verifyNewsletterConfirmToken(EMAIL, "not-a-token")).toBe(false);
    expect(verifyNewsletterConfirmToken(EMAIL, "123.abc")).toBe(false);
  });
});

describe("purpose separation", () => {
  // All three e-mail links are signed with the same secret; only the purpose
  // baked into the payload keeps one flow's token from acting in another.
  it("an unsubscribe token cannot confirm a subscription", () => {
    const token = createUnsubscribeToken(EMAIL);
    expect(verifyNewsletterConfirmToken(EMAIL, token)).toBe(false);
  });

  it("a confirmation token cannot unsubscribe", () => {
    const token = createNewsletterConfirmToken(EMAIL);
    expect(verifyUnsubscribeToken(EMAIL, token)).toBe(false);
  });

  it("a registration magic link cannot confirm a subscription", () => {
    const token = createRegistrationAccessToken("some-registration", EMAIL);
    expect(verifyNewsletterConfirmToken(EMAIL, token)).toBe(false);
  });
});
