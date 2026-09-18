import {
  invoicePaymentState,
  invoicePaymentStateLabels,
  registrationPaymentState,
  type InvoicePaymentInput,
  type InvoicePaymentState,
} from "@/lib/invoice-payment";
import { Tag, type TagTone } from "@/app/_components/programmheft/tag";

// Gefüllt ist, was noch Geld will (OPEN orange, PARTIAL Tinte); PAID tritt als
// umrandetes Etikett zurück.
const TONE: Record<Exclude<InvoicePaymentState, "NOT_APPLICABLE">, TagTone> = {
  OPEN: "orange",
  PARTIAL: "ink",
  PAID: "muted",
};

/** Zahlungsstand einer Rechnung; nichts für Entwürfe und Stornos, die keine Forderung sind. */
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
 * Zahlungsstand einer Anmeldung über alle Rechnungen. Ohne Rechnung bewusst „Keine Rechnung“,
 * nicht „Offen“: es besteht noch keine Forderung.
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
