import { createHmac, timingSafeEqual } from "crypto";

/**
 * Token: `"<expiryEpochMs>.<hmac(purpose|subject|expiry)>"`. The signed purpose
 * blocks replay across flows; the signed expiry cannot be stretched.
 */

function getSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret)
    throw new Error("BETTER_AUTH_SECRET is required to sign e-mail links");
  return secret;
}

export function signPayload(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function createSignedToken(
  purpose: string,
  subject: string,
  ttlMs: number,
): string {
  const expiresAt = Date.now() + ttlMs;
  return `${expiresAt}.${signPayload(`${purpose}|${subject}|${expiresAt}`)}`;
}

export function verifySignedToken(
  purpose: string,
  subject: string,
  token: string,
): boolean {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return false;

  const expiresAt = Number(token.slice(0, dotIndex));
  const signature = token.slice(dotIndex + 1);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  return safeCompare(
    signPayload(`${purpose}|${subject}|${expiresAt}`),
    signature,
  );
}
