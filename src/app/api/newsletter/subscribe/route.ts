import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  clientKeyFromHeaders,
  rateLimit,
  rateLimitResponse,
} from "@/server/utils/rate-limit";
import { getBaseUrl } from "@/server/utils/get-base-url";
import { createNewsletterConfirmToken } from "@/server/utils/newsletter-confirm-token";
import { clientIpFromHeaders } from "@/server/utils/client-ip";
import { isDeliverableDomain } from "@/server/utils/email-domain";
import { NEWSLETTER_CONSENT_VERSION } from "@/lib/newsletter-consent";
import {
  BOT_TRAP_ELAPSED_FIELD,
  BOT_TRAP_FIELD,
  inspectBotTrap,
} from "@/lib/bot-trap";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Newsletter");

/**
 * Gleiche Antwort für echte Anmeldungen und abgewiesene Bots: Ein Bot soll aus
 * der Antwort nicht lernen, welche Eingabe ihn verraten hat.
 */
const PENDING_RESPONSE = {
  success: true,
  pending: true,
  message:
    "Fast geschafft: Bitte bestätige deine Anmeldung über den Link in der E-Mail, die wir dir gerade geschickt haben.",
};

/**
 * Double opt-in, step one: the row stays unconfirmed until the mailed link is
 * clicked. The response never reveals whether the address was already listed.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 },
      );
    }

    // Vor allem anderen: ohne die Signale des Formulars entsteht weder ein
    // Datensatz noch eine Mail. Das Formular schickt sie immer mit.
    const verdict = inspectBotTrap({
      trap: body[BOT_TRAP_FIELD],
      elapsedMs: body[BOT_TRAP_ELAPSED_FIELD],
    });
    if (verdict !== "ok") {
      log.warn(
        `Newsletter sign-up rejected (${verdict}) from ${clientKeyFromHeaders(request.headers)}`,
      );
      return NextResponse.json(PENDING_RESPONSE);
    }

    // Zwei Töpfe: pro Adresse gegen wiederholte Mails an dieselbe Person, pro
    // Herkunft gegen den Bot, der für jede Anfrage eine neue Adresse erfindet.
    const perIp = rateLimit(
      `newsletter-subscribe-ip:${clientKeyFromHeaders(request.headers)}`,
      { maxRequests: 5, windowMs: 60 * 60 * 1000 },
    );
    if (!perIp.success) return rateLimitResponse();

    const rl = rateLimit(`newsletter-subscribe:${email.toLowerCase()}`, {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.success) return rateLimitResponse();

    if (email.length > 254) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 },
      );
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 },
      );
    }

    // Erfundene Domains gar nicht erst anschreiben: jede Bestätigungsmail an
    // eine solche Adresse ist ein Bounce auf unserem Absender.
    if (!(await isDeliverableDomain(email))) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Zu dieser E-Mail-Adresse gibt es keinen Posteingang. Bitte prüfe die Schreibweise.",
        },
        { status: 400 },
      );
    }

    const subscriberName =
      typeof name === "string" && name.trim()
        ? name.trim().slice(0, 100)
        : null;

    // Nachweis der Einwilligung: wer, wann, und zu welchem Text.
    const signupIp = clientIpFromHeaders(request.headers);

    const existing = await db.newsletterSubscriber.findUnique({
      where: { email },
    });

    const alreadySubscribed = !!existing?.isActive && !!existing.confirmedAt;

    if (!existing) {
      await db.newsletterSubscriber.create({
        data: {
          email,
          name: subscriberName,
          isActive: true,
          signupIp,
          consentVersion: NEWSLETTER_CONSENT_VERSION,
        },
      });
    } else if (!alreadySubscribed) {
      // Pending or previously unsubscribed: back to square one, so consent is
      // always the fresh click and never an old row lying around.
      await db.newsletterSubscriber.update({
        where: { email },
        data: {
          isActive: true,
          confirmedAt: null,
          name: subscriberName ?? existing.name,
          subscribedAt: new Date(),
          unsubscribedAt: null,
          // Die neue Anmeldung ist die neue Einwilligung — der alte Nachweis
          // gehört nicht dazu und wird überschrieben, nicht ergänzt.
          signupIp,
          confirmIp: null,
          consentVersion: NEWSLETTER_CONSENT_VERSION,
        },
      });
    }

    // Sent even to existing subscribers: a missing mail would reveal that the
    // address is on the list.
    const confirmUrl = `${getBaseUrl()}/newsletter/bestaetigen?email=${encodeURIComponent(
      email,
    )}&token=${createNewsletterConfirmToken(email)}`;

    const emailService = await import("@/server/email");
    if (emailService.isEmailConfigured()) {
      try {
        await emailService.sendNewsletterConfirmEmail(
          email,
          confirmUrl,
          subscriberName ?? existing?.name ?? undefined,
        );
      } catch (error) {
        log.error("Failed to send newsletter confirmation email:", error);
        return NextResponse.json(
          {
            success: false,
            message:
              "Die Bestätigungs-E-Mail konnte nicht versendet werden. Bitte versuche es später erneut.",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      ...PENDING_RESPONSE,
      pending: !alreadySubscribed,
    });
  } catch (error) {
    log.error("Error subscribing to newsletter:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
