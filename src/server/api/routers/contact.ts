import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, rateLimitedPublicProcedure } from "../trpc";
import { sendContactMessageEmail } from "@/server/email";
import { CONTACT_SUBJECTS, CONTACT_SUBJECT_KEYS } from "@/lib/contact-subjects";
import {
  BOT_TRAP_ELAPSED_FIELD,
  BOT_TRAP_FIELD,
  inspectBotTrap,
} from "@/lib/bot-trap";
import { isDeliverableDomain } from "@/server/utils/email-domain";
import { clientKeyFromHeaders } from "@/server/utils/rate-limit";
import { env } from "@/env";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Contact");

const DEFAULT_CONTACT_EMAIL = "info@posaunenwerk-rheinland.de";

export const contactRouter = createTRPCRouter({
  // Anonymous endpoint that sends e-mail — throttle hard so the form can't
  // be used to spam the office inbox.
  send: rateLimitedPublicProcedure("contact.send", {
    maxRequests: 3,
    windowMs: 15 * 60 * 1000,
  })
    .input(
      z.object({
        name: z.string().trim().min(1).max(100),
        email: z.string().trim().email(),
        phone: z.string().trim().max(50).optional(),
        subject: z.enum(CONTACT_SUBJECT_KEYS),
        message: z.string().trim().min(10).max(5000),
        privacyAccepted: z.literal(true),
        [BOT_TRAP_FIELD]: z.string().max(200).optional(),
        [BOT_TRAP_ELAPSED_FIELD]: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const verdict = inspectBotTrap({
        trap: input[BOT_TRAP_FIELD],
        elapsedMs: input[BOT_TRAP_ELAPSED_FIELD],
      });

      if (verdict === "honeypot" || verdict === "too-fast") {
        // Beides kann eine Person nicht auslösen: Das Feld ist unsichtbar, und
        // Betreff, Nachricht und Einwilligung dauern länger als zwei Sekunden.
        // Deshalb still abweisen — wer nichts erfährt, passt nichts an.
        log.warn(
          `Contact message rejected (${verdict}) from ${clientKeyFromHeaders(ctx.headers)}`,
        );
        return { success: true };
      }

      if (verdict === "missing") {
        // Kommt nur bei einer veralteten Seite vor. Eine still verschluckte
        // Nachricht wäre hier schlimmer als eine Fehlermeldung: Am anderen Ende
        // sitzt jemand, der eine Antwort erwartet.
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Die Nachricht konnte nicht geprüft werden. Bitte lade die Seite neu und sende sie noch einmal.",
        });
      }

      // Auf eine erfundene Absenderadresse kann das Büro nicht antworten.
      if (!(await isDeliverableDomain(input.email))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Zu dieser E-Mail-Adresse gibt es keinen Posteingang. Bitte prüfe die Schreibweise — sonst erreicht dich unsere Antwort nicht.",
        });
      }

      try {
        await sendContactMessageEmail({
          to: env.CONTACT_EMAIL ?? DEFAULT_CONTACT_EMAIL,
          name: input.name,
          email: input.email,
          phone: input.phone,
          subjectLabel: CONTACT_SUBJECTS[input.subject],
          message: input.message,
        });
      } catch (error) {
        log.error("Failed to send contact message:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Die Nachricht konnte nicht gesendet werden. Bitte versuche es später erneut oder schreibe direkt an " +
            (env.CONTACT_EMAIL ?? DEFAULT_CONTACT_EMAIL) +
            ".",
        });
      }

      return { success: true };
    }),
});
