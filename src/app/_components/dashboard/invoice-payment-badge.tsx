import {
  invoicePaymentState,
  invoicePaymentStateLabels,
  registrationPaymentState,
  type InvoicePaymentInput,
  type InvoicePaymentState,
} from "@/lib/invoice-payment";
import { Tag, type TagTone } from "@/app/_components/programmheft/tag";

// Die Füllung gehört dem, was noch etwas von dir will: OPEN ist die lauteste
// Forderung (Orange), PARTIAL steht noch offen und bleibt gefüllt (Tinte),
// PAID ist erledigt und tritt als umrandetes Etikett zurück.
//
// Vorher war es umgekehrt — der stärkste Ton lag auf „Bezahlt", während
// „Teilweise" leiser stand und im Hellmodus ohnehin identisch aussah. Eine
// Rechnungsliste soll auf einen Blick zeigen, wo Geld fehlt, nicht wo keines
// mehr fehlt.
const TONE: Record<Exclude<InvoicePaymentState, "NOT_APPLICABLE">, TagTone> = {
  OPEN: "orange",
  PARTIAL: "ink",
  PAID: "muted",
};

/**
 * Zahlungsstand einer Rechnung. Rendert nichts für Entwürfe und Stornos — an
 * denen gibt es keinen Zahlungsstand, und ein „Offen"-Badge am Entwurf würde
 * eine Forderung suggerieren, die noch gar nicht gestellt wurde.
 */
export function InvoicePaymentBadge({
  invoice,
  className = "",
}: {
  invoice: InvoicePaymentInput;
  className?: string;
}) {
  const state = invoicePaymentState(invoice);
  if (state === "NOT_APPLICABLE") return null;

  return (
    <Tag tone={TONE[state]} className={className}>
      {invoicePaymentStateLabels[state]}
    </Tag>
  );
}

/**
 * Zahlungsstand einer Anmeldung über alle ihre Rechnungen. Ohne ausgestellte
 * Rechnung steht hier bewusst „Keine Rechnung" und nicht „Offen": es besteht
 * noch keine Forderung, die offen sein könnte.
 */
export function RegistrationPaymentBadge({
  invoices,
  className = "",
}: {
  invoices: InvoicePaymentInput[];
  className?: string;
}) {
  const state = registrationPaymentState(invoices);

  return (
    <Tag
      tone={state === "NOT_APPLICABLE" ? "muted" : TONE[state]}
      className={className}
    >
      {state === "NOT_APPLICABLE"
        ? "Keine Rechnung"
        : invoicePaymentStateLabels[state]}
    </Tag>
  );
}
