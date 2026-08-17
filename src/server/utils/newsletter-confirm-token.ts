import { createSignedToken, verifySignedToken } from "./signed-token";

const PURPOSE = "newsletter-confirm";

/**
 * Double opt-in: the link proves the person who typed the address into the
 * form can also read that mailbox. Short-lived on purpose — an unconfirmed
 * subscription is not a standing invitation, and anyone can simply sign up
 * again to get a fresh link.
 */
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
