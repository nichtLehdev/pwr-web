import { createSignedToken, verifySignedToken } from "./signed-token";

const PURPOSE = "registration-access";

/**
 * Courses are announced months ahead, so the link must outlive that gap. Every
 * write is still gated by the edit deadline, regardless of token validity.
 */
const TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000;

function subject(registrationId: string, email: string): string {
  return `${registrationId}|${email.toLowerCase()}`;
}

/**
 * Signature is bound to the e-mail: changing the address invalidates links
 * mailed to the previous one.
 */
export function createRegistrationAccessToken(
  registrationId: string,
  email: string,
): string {
  return createSignedToken(
    PURPOSE,
    subject(registrationId, email),
    TOKEN_TTL_MS,
  );
}

export function verifyRegistrationAccessToken(
  registrationId: string,
  email: string,
  token: string,
): boolean {
  return verifySignedToken(PURPOSE, subject(registrationId, email), token);
}
