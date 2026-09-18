import { InvoiceStatus } from "~/generated/prisma/enums";
import { Tag, type TagTone } from "@/app/_components/programmheft/tag";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Entwurf",
  PUBLISHED: "Ausgestellt",
  CANCELLED: "Storniert",
};

// Entwurf umrandet, ausgestellt gefüllt. Nicht `inverse` für den Entwurf: im
// Hellmodus nicht von `ink` zu unterscheiden.
const TONE: Record<InvoiceStatus, TagTone> = {
  DRAFT: "muted",
  PUBLISHED: "ink",
  CANCELLED: "cancelled",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Tag tone={TONE[status]}>{INVOICE_STATUS_LABELS[status]}</Tag>;
}
