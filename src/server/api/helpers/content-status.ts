import { ContentStatus } from "~/generated/prisma/client";

/**
 * Statuswechsel, die ein Autor ohne Freigabe-Berechtigung selbst fahren darf.
 *
 * Autoren schieben ihre Inhalte zwischen Entwurf und „Zur Prüfung“ hin und her
 * und dürfen nach einer Ablehnung wieder einen Entwurf daraus machen. Auf
 * `APPROVED` oder `REJECTED` zu wechseln ist dagegen die Freigabe selbst — das
 * bleibt der Redaktion vorbehalten, egal über welchen Weg der Wechsel kommt.
 *
 * Die Einzelformulare prüften das schon; die Mehrfachauswahl im Dashboard
 * nicht, sodass sich ein Autor seine eigenen Inhalte dort freigeben konnte.
 */
export function authorMayChangeStatus(
  from: ContentStatus,
  to: ContentStatus,
): boolean {
  if (from === to) return true;
  if (
    to === ContentStatus.PENDING &&
    (from === ContentStatus.DRAFT || from === ContentStatus.REJECTED)
  ) {
    return true;
  }
  return to === ContentStatus.DRAFT && from === ContentStatus.REJECTED;
}
