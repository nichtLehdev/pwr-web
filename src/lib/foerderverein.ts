import type { FoerdervereinRole } from "~/generated/prisma/client";

/** Deutsche Bezeichnung der Vereinsrolle; öffentlich und im Dashboard gleich. */
export const FOERDERVEREIN_ROLE_LABELS: Record<FoerdervereinRole, string> = {
  VORSITZENDER: "Vorsitzender",
  STELLVERTRETER: "Stellvertreter",
  SCHATZMEISTER: "Schatzmeister",
  SCHRIFTFUEHRER: "Schriftführer",
  BEISITZER: "Beisitzer",
  MITGLIED: "Mitglied",
};

/** Für Stellen, an denen die Rolle nur als String vorliegt. */
export function foerdervereinRoleLabel(role: string): string {
  return (FOERDERVEREIN_ROLE_LABELS as Record<string, string>)[role] ?? role;
}
