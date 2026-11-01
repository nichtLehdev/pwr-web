import { createHash, randomBytes } from "node:crypto";

/**
 * Zufälliger Token für einen Nachmeldelink. Gespeichert wird nur sein Hash: Wer
 * die Datenbank liest, kann damit keine Anmeldung nach der Frist abschicken.
 */
export function createLateRegistrationToken(): {
  token: string;
  tokenHash: string;
} {
  const token = randomBytes(24).toString("base64url");
  return { token, tokenHash: hashLateRegistrationToken(token) };
}

export function hashLateRegistrationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
