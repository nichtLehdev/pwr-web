import { createHmac } from "crypto";

function getSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required for unsubscribe tokens");
  return secret;
}

export function createUnsubscribeToken(email: string): string {
  return createHmac("sha256", getSecret())
    .update(email.toLowerCase())
    .digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = createUnsubscribeToken(email);
  if (expected.length !== token.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return mismatch === 0;
}
