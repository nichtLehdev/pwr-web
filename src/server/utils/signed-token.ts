import { createHmac, timingSafeEqual } from "crypto";

/**
 * The one signing primitive behind every link we mail out that has to work
 * without a login: newsletter confirmation and unsubscribe, magic links to a
 * course registration.
 *
 * A token is `"<expiryEpochMs>.<hmac(purpose|subject|expiry)>"`. It carries no
 * secret of its own and needs no database row — the signature over the purpose
 * is what keeps a token minted for one flow from being replayed in another,
 * and the expiry is inside the signed payload so it cannot be stretched.
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
