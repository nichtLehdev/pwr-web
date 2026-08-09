import { InvoiceStatus } from "~/generated/prisma/enums";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Entwurf",
  PUBLISHED: "Ausgestellt",
  CANCELLED: "Storniert",
};

const badgeClasses: Record<InvoiceStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-200",
  PUBLISHED:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClasses[status]}`}
    >
      {INVOICE_STATUS_LABELS[status]}
    </span>
  );
}
