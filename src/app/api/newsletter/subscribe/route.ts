import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { rateLimit, rateLimitResponse } from "@/server/utils/rate-limit";
import { getBaseUrl } from "@/server/utils/get-base-url";
import { createNewsletterConfirmToken } from "@/server/utils/newsletter-confirm-token";
import { clientIpFromHeaders } from "@/server/utils/client-ip";
import { NEWSLETTER_CONSENT_VERSION } from "@/lib/newsletter-consent";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Newsletter");

/**
 * Newsletter sign-up, step one of two.
 *
 * Nothing is ever sent to an address on the strength of this request alone:
 * the row is created unconfirmed and only a click on the mailed link makes it
 * a recipient. That keeps anyone from signing up an address they do not own.
 *
 * The response never says whether the address was already on the list —
 * "we sent you a mail" either way, so the endpoint cannot be used to test
 * which addresses subscribe to us.
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

    // Sent in every case — including to someone already subscribed, whose
    // click simply confirms again. Staying silent there would leak, through
    // the missing mail, that the address is on the list.
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
      success: true,
      pending: !alreadySubscribed,
      message:
        "Fast geschafft: Bitte bestätige deine Anmeldung über den Link in der E-Mail, die wir dir gerade geschickt haben.",
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
