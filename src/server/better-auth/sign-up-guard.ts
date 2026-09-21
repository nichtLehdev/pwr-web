import { APIError, createAuthMiddleware } from "better-auth/api";

import { botTrapFromHeaders, type BotTrapVerdict } from "@/lib/bot-trap";
import { isDeliverableDomain } from "@/server/utils/email-domain";
import { clientKeyFromHeaders } from "@/server/utils/rate-limit";
import { createLogger } from "@/server/utils/logger";

const log = createLogger("Sign-up Guard");

/**
 * Anders als beim Newsletter wird hier nicht stillschweigend abgewiesen: ein
 * scheinbar angelegtes Konto, das es nicht gibt, wäre für eine zu Unrecht
 * abgewiesene Person nicht zu durchschauen. Honigtopf und fehlendes Signal
 * teilen sich den Text — welches der beiden ausgelöst hat, geht Bots nichts an.
 */
const REJECTION: Record<Exclude<BotTrapVerdict, "ok">, string> = {
  honeypot:
    "Die Registrierung konnte nicht geprüft werden. Bitte lade die Seite neu und fülle das Formular erneut aus.",
  "too-fast":
    "Das ging zu schnell. Bitte warte einen Moment und sende das Formular noch einmal ab.",
  missing:
    "Die Registrierung konnte nicht geprüft werden. Bitte lade die Seite neu und fülle das Formular erneut aus.",
};

/**
 * Bots sprechen `/sign-up/email` direkt an, am Formular vorbei. Deshalb gilt
 * hier umgekehrt: ohne die Signale unseres Formulars kein Konto.
 */
export const signUpGuard = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== "/sign-up/email") return;

  const headers = ctx.headers ?? new Headers();
  const verdict = botTrapFromHeaders(headers);

  if (verdict !== "ok") {
    log.warn(
      `Sign-up rejected (${verdict}) from ${clientKeyFromHeaders(headers)}`,
    );
    throw new APIError("BAD_REQUEST", {
      code: "FORM_CHECK_FAILED",
      message: REJECTION[verdict],
    });
  }

  const email = ctx.body?.email;
  if (typeof email === "string" && !(await isDeliverableDomain(email))) {
    log.warn(
      `Sign-up rejected (no mail exchanger) from ${clientKeyFromHeaders(headers)}`,
    );
    throw new APIError("BAD_REQUEST", {
      code: "EMAIL_DOMAIN_UNDELIVERABLE",
      message:
        "Zu dieser E-Mail-Adresse gibt es keinen Posteingang. Bitte prüfe die Schreibweise.",
    });
  }
});
