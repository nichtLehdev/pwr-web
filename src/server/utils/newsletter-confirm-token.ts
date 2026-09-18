import { createSignedToken, verifySignedToken } from "./signed-token";

const PURPOSE = "newsletter-confirm";

/** Double opt-in link, short-lived on purpose: signing up again yields a fresh one. */
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createNewsletterConfirmToken(email: string): string {
  return createSignedToken(PURPOSE, email.toLowerCase(), TOKEN_TTL_MS);
}

export function verifyNewsletterConfirmToken(
  email: string,
  token: string,
): boolean {
  return verifySignedToken(PURPOSE, email.toLowerCase(), token);
}
