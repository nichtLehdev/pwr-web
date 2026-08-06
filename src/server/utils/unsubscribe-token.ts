import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret)
    throw new Error("BETTER_AUTH_SECRET is required for unsubscribe tokens");
  return secret;
}

const PURPOSE = "newsletter-unsubscribe";
/** Newsletter links live in inboxes for a long time — 1 year of validity. */
const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Token format: "<expiryEpochMs>.<hmac(purpose|email|expiry)>" — scoped to
 * its purpose and expiring, so a leaked link is not a forever-credential.
 */
export function createUnsubscribeToken(email: string): string {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const signature = sign(`${PURPOSE}|${email.toLowerCase()}|${expiresAt}`);
  return `${expiresAt}.${signature}`;
}

function verifyLegacyToken(email: string, token: string): boolean {
  // Tokens issued before expiry support: bare hmac over the e-mail. Accepted
  // for backward compatibility so old newsletter links keep working.
  return safeCompare(sign(email.toLowerCase()), token);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) {
    return verifyLegacyToken(email, token);
  }

  const expiresAtRaw = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  return safeCompare(
    sign(`${PURPOSE}|${email.toLowerCase()}|${expiresAt}`),
    signature,
  );
}
