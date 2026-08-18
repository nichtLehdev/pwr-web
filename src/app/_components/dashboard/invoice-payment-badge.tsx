import {
  invoicePaymentState,
  invoicePaymentStateLabels,
  registrationPaymentState,
  type InvoicePaymentInput,
  type InvoicePaymentState,
} from "@/lib/invoice-payment";

const badgeClasses: Record<InvoicePaymentState, string> = {
  NOT_APPLICABLE: "",
  OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  PARTIAL: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
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
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClasses[state]} ${className}`}
    >
      {invoicePaymentStateLabels[state]}
    </span>
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
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        state === "NOT_APPLICABLE"
          ? "bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300"
          : badgeClasses[state]
      } ${className}`}
    >
      {state === "NOT_APPLICABLE"
        ? "Keine Rechnung"
        : invoicePaymentStateLabels[state]}
    </span>
  );
}
