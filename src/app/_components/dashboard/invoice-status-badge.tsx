import { InvoiceStatus } from "~/generated/prisma/enums";
import { Tag, type TagTone } from "@/app/_components/programmheft/tag";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Entwurf",
  PUBLISHED: "Ausgestellt",
  CANCELLED: "Storniert",
};

// Der Ton trägt die Dringlichkeit: Ein Entwurf verlangt nichts und bleibt
// umrandet, eine ausgestellte Rechnung ist verbindlich und steht gefüllt, eine
// Stornierung ist ein negativer Abschluss. Vorher lag der Entwurf auf
// `inverse` — im Hellmodus nicht von `ink` zu unterscheiden, beide Zustände
// sahen also gleich aus.
const TONE: Record<InvoiceStatus, TagTone> = {
  DRAFT: "muted",
  PUBLISHED: "ink",
  CANCELLED: "cancelled",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Tag tone={TONE[status]}>{INVOICE_STATUS_LABELS[status]}</Tag>;
}
