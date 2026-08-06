import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, rateLimitedPublicProcedure } from "../trpc";
import { sendContactMessageEmail } from "@/server/email";
import { CONTACT_SUBJECTS, CONTACT_SUBJECT_KEYS } from "@/lib/contact-subjects";
import { env } from "@/env";

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
      }),
    )
    .mutation(async ({ input }) => {
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
        console.error("[Contact] Failed to send contact message:", error);
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
