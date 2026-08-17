import { createSignedToken, verifySignedToken } from "./signed-token";

const PURPOSE = "registration-access";

/**
 * Magic links let people without an account manage the anmeldung they made
 * through the public form. Courses are announced months ahead, so the link has
 * to outlive the gap between anmeldung and kursbeginn — but not forever, and
 * the edit deadline (registration deadline / course start) still gates every
 * write regardless of how long the token itself is valid.
 */
const TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000;

function subject(registrationId: string, email: string): string {
  return `${registrationId}|${email.toLowerCase()}`;
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
