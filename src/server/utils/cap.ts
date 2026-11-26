import "server-only";

import { createHash, createHmac } from "node:crypto";
import {
  generateChallenge,
  validateChallenge,
  type ChallengeResult,
  type ValidateChallengeBody,
} from "capjs-core";
import { env } from "@/env";
import { createLogger } from "@/server/utils/logger";

/**
 * Cap (https://trycap.dev): Proof-of-Work-Captcha ohne Drittanbieter. Cap Core
 * läuft direkt in dieser App: Die Challenges sind signiert und zustandslos, nur
 * verbrauchte Signaturen und ausgegebene Tokens liegen hier im Speicher — wie
 * das Rate-Limit, das ebenfalls von einer einzigen Instanz ausgeht. Ein
 * Neustart verwirft offene Tokens; wer gerade das Formular ausfüllt, löst die
 * Aufgabe dann einfach erneut.
 */

const log = createLogger("Cap");

/** Ein Formular, ein Scope: Ein Token aus einem Formular gilt nicht im anderen. */
export type CapScope = "newsletter";

/** Zeit zwischen Lösen und Absenden. Großzügig für langsames Tippen. */
const TOKEN_TTL_MS = 20 * 60 * 1000;

/**
 * Eigenes Geheimnis, wenn gesetzt; sonst aus dem better-auth-Geheimnis
 * abgeleitet, damit kein Deployment eine weitere Variable braucht. Die
 * Ableitung sorgt dafür, dass das Captcha-Geheimnis nichts über das
 * Sitzungsgeheimnis verrät.
 */
const secret =
  env.CAP_SECRET ??
  createHmac("sha256", env.BETTER_AUTH_SECRET).update("cap-captcha").digest();

/** Signatur → Ablauf. Eine gelöste Challenge lässt sich nur einmal einlösen. */
const usedSignatures = new Map<string, number>();
/** Token-Schlüssel (Hash) → Ablauf. Ein Token gilt für genau eine Anmeldung. */
const issuedTokens = new Map<
  string,
  { scope: string | null; expires: number }
>();

setInterval(() => {
  const now = Date.now();
  for (const [key, expires] of usedSignatures) {
    if (expires < now) usedSignatures.delete(key);
  }
  for (const [key, token] of issuedTokens) {
    if (token.expires < now) issuedTokens.delete(key);
  }
}, 60_000).unref();

function consumeNonce(signature: string, ttlMs: number): boolean {
  const expires = usedSignatures.get(signature);
  if (expires !== undefined && expires >= Date.now()) return false;
  usedSignatures.set(signature, Date.now() + ttlMs);
  return true;
}

export function createCapChallenge(scope: CapScope): Promise<ChallengeResult> {
  return generateChallenge(secret, { scope });
}

/**
 * Prüft die Lösung des Widgets und gibt das Token aus, das das Formular beim
 * Absenden mitschickt.
 */
export async function redeemCapChallenge(
  scope: CapScope,
  body: unknown,
): Promise<
  { success: true; token: string; expires: number } | { success: false }
> {
  const result = await validateChallenge(
    secret,
    body as ValidateChallengeBody,
    { scope, consumeNonce, tokenTtlMs: TOKEN_TTL_MS },
  );

  if (!result.success || !result.tokenKey) {
    if (!result.success) log.warn(`Cap redeem rejected: ${result.reason}`);
    return { success: false };
  }

  issuedTokens.set(result.tokenKey, {
    scope: result.scope,
    expires: result.expires,
  });
  return { success: true, token: result.token, expires: result.expires };
}

/**
 * Verbraucht das Token aus dem Formular. Nur einmal gültig, nur im eigenen
 * Scope und nur bis zum Ablauf; alles andere ist `false`.
 */
export function consumeCapToken(scope: CapScope, token: unknown): boolean {
  if (typeof token !== "string" || token.length > 200) return false;

  const [id, verifier, extra] = token.split(":");
  if (!id || !verifier || extra !== undefined) return false;

  const key = `${id}:${createHash("sha256").update(verifier).digest("hex")}`;
  const entry = issuedTokens.get(key);
  if (!entry) return false;

  // Vor jeder weiteren Prüfung entfernen: auch ein falscher Versuch verbraucht es.
  issuedTokens.delete(key);
  return entry.scope === scope && entry.expires >= Date.now();
}
