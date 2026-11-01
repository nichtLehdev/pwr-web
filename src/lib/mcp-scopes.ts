/**
 * Berechtigungsumfänge, die ein KI-Client am MCP-Server anfragen kann. Sie
 * begrenzen nur, was der Client tun darf; was die Person selbst darf, regeln
 * weiter ihre Rollen und Rechte.
 */
export const MCP_SCOPES = {
  READ: "mcp:read",
  WRITE: "mcp:write",
} as const;

export type McpScope = (typeof MCP_SCOPES)[keyof typeof MCP_SCOPES];

/** Für die Zustimmungsseite; unbekannte Umfänge erscheinen mit ihrem Namen. */
export const OAUTH_SCOPE_LABELS: Record<string, string> = {
  openid: "Dein Konto erkennen",
  profile: "Deinen Namen sehen",
  email: "Deine E-Mail-Adresse sehen",
  offline_access: "Angemeldet bleiben, ohne dass du dich neu anmeldest",
  [MCP_SCOPES.READ]:
    "Beiträge, Termine, Kurse, Ensembles und weitere Inhalte lesen, die du sehen darfst",
  [MCP_SCOPES.WRITE]:
    "Inhalte anlegen, ändern und löschen – nur, soweit deine Rechte das erlauben",
};
