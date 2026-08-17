import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret)
    throw new Error(
      "BETTER_AUTH_SECRET is required for registration access tokens",
    );
  return secret;
}

const PURPOSE = "registration-access";

/**
 * Magic links let people without an account manage the anmeldung they made
 * through the public form. Courses are announced months ahead, so the link has
 * to outlive the gap between anmeldung and kursbeginn — but not forever, and
 * the edit deadline (registration deadline / course start) still gates every
 * write regardless of how long the token itself is valid.
 */
const TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function payloadFor(
  registrationId: string,
  email: string,
  expiresAt: number,
): string {
  return `${PURPOSE}|${registrationId}|${email.toLowerCase()}|${expiresAt}`;
}

/**
 * Token format: "<expiryEpochMs>.<hmac(purpose|registrationId|email|expiry)>".
 *
 * Binding the signature to the registrant's e-mail means a link only ever
 * works for the address it was sent to: changing the address on a
 * registration silently invalidates links mailed to the previous one.
 */
export function createRegistrationAccessToken(
  registrationId: string,
  email: string,
): string {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  return `${expiresAt}.${sign(payloadFor(registrationId, email, expiresAt))}`;
}

export function verifyRegistrationAccessToken(
  registrationId: string,
  email: string,
  token: string,
): boolean {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return false;

  const expiresAt = Number(token.slice(0, dotIndex));
  const signature = token.slice(dotIndex + 1);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  return safeCompare(
    sign(payloadFor(registrationId, email, expiresAt)),
    signature,
  );
}
