import {
  createSignedToken,
  safeCompare,
  signPayload,
  verifySignedToken,
} from "./signed-token";

const PURPOSE = "newsletter-unsubscribe";
/** Newsletter links live in inboxes for a long time — 1 year of validity. */
const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Token format: "<expiryEpochMs>.<hmac(purpose|email|expiry)>" — scoped to
 * its purpose and expiring, so a leaked link is not a forever-credential.
 */
export function createUnsubscribeToken(email: string): string {
  return createSignedToken(PURPOSE, email.toLowerCase(), TOKEN_TTL_MS);
}

function verifyLegacyToken(email: string, token: string): boolean {
  // Tokens issued before expiry support: bare hmac over the e-mail. Accepted
  // for backward compatibility so old newsletter links keep working.
  return safeCompare(signPayload(email.toLowerCase()), token);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (token.indexOf(".") === -1) {
    return verifyLegacyToken(email, token);
  }
  return verifySignedToken(PURPOSE, email.toLowerCase(), token);
}
