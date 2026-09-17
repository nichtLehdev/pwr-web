import { render } from "@react-email/components";
import { sendEmail } from "./send-email";
import {
  WaitlistPromotionOffer,
  WaitlistPromotionOfferExpired,
  WaitlistPromotionOfferExpiringTeam,
  type WaitlistPromotionOfferExpiredProps,
  type WaitlistPromotionOfferExpiringTeamProps,
  type WaitlistPromotionOfferProps,
} from "./templates/waitlist-promotion-offer";

/** Angebot an die Anmeldenden, einen Teil ihrer Teilnehmer nachrücken zu lassen. */
export async function sendWaitlistPromotionOfferEmail({
  email,
  ...props
}: WaitlistPromotionOfferProps & { email: string }) {
  const html = await render(WaitlistPromotionOffer(props));
  return sendEmail({
    to: email,
    subject: `Plätze frei geworden: ${props.courseTitle} - Posaunenwerk Rheinland`,
    html,
  });
}

/** Das Angebot ist ohne Antwort abgelaufen. */
export async function sendWaitlistPromotionOfferExpiredEmail({
  email,
  ...props
}: WaitlistPromotionOfferExpiredProps & { email: string }) {
  const html = await render(WaitlistPromotionOfferExpired(props));
  return sendEmail({
    to: email,
    subject: `Platzangebot abgelaufen: ${props.courseTitle} - Posaunenwerk Rheinland`,
    html,
  });
}

/** Erinnerung ans Kursteam, eine Mail je Empfänger. */
export async function sendWaitlistPromotionOfferExpiringTeamEmail({
  recipients,
  ...props
}: WaitlistPromotionOfferExpiringTeamProps & { recipients: string[] }) {
  const html = await render(WaitlistPromotionOfferExpiringTeam(props));
  for (const to of recipients) {
    await sendEmail({
      to,
      subject: `Nachrück-Angebot läuft bald ab: ${props.courseTitle} - Posaunenwerk Rheinland`,
      html,
    });
  }
}
