# MCP-Server (KI-Assistenten)

Unter `/api/mcp` läuft ein [MCP](https://modelcontextprotocol.io)-Server, über den
KI-Assistenten wie Claude Beiträge, Termine, Kurse, Ensembles und Orte pflegen
können. Jede Verbindung handelt im Namen einer angemeldeten Person und darf genau
das, was diese Person auch auf der Webseite darf.

## Verbinden

- **Claude (Web, Desktop, App):** Einstellungen → Konnektoren → Benutzerdefinierten
  Konnektor hinzufügen → `https://<domain>/api/mcp`
- **Claude Code:** `claude mcp add --transport http posaunenwerk https://<domain>/api/mcp`,
  dann `/mcp` und anmelden.

Beim ersten Verbinden öffnet sich die Anmeldung der Webseite (inkl. 2FA) und danach
die Zustimmungsseite `/oauth/zustimmung`. Verbundene Anwendungen sieht und trennt
man unter **Einstellungen → KI-Verbindungen** (`/settings/ki-verbindungen`).

## Aufbau

| Teil                                        | Ort                                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------------------- |
| OAuth 2.1 Autorisierungsserver              | `@better-auth/oauth-provider` + `jwt`-Plugin in `src/server/better-auth/config.ts` |
| Discovery (RFC 8414 / 9728)                 | `src/app/.well-known/*`                                                            |
| MCP-Endpunkt (Streamable HTTP, zustandslos) | `src/app/api/mcp/route.ts`                                                         |
| Token-Prüfung                               | `src/server/mcp/auth.ts`                                                           |
| Werkzeuge                                   | `src/server/mcp/tools.ts`                                                          |
| Verbindungen verwalten                      | tRPC `oauthConnections`                                                            |

- **Werkzeuge = tRPC-Prozeduren.** Jedes Werkzeug in `tools.ts` verweist auf eine
  bestehende Prozedur (`posts.create` usw.). Eingabeschema und Rechteprüfung
  kommen unverändert von dort; `z.date()` wird für JSON als ISO-Text beschrieben
  und vor dem Aufruf zurückverwandelt (`src/server/mcp/schema.ts`). Neues
  Werkzeug = eine Zeile in `MCP_TOOLS`.
- **Umfänge:** `mcp:read` (Lesewerkzeuge) und `mcp:write` (alles, was ändert). Eine
  Verbindung ohne `mcp:write` sieht die Schreibwerkzeuge nicht.
- **Token:** JWT-Zugriffstoken (1 h) mit `aud` = `https://<domain>/api/mcp`, dazu
  Refresh-Token (`offline_access`). Der Server verlangt zusätzlich eine bestehende
  Zustimmung; wer die Verbindung trennt, sperrt damit auch noch laufende Token.
- **Client-Registrierung:** offen (RFC 7591), wie MCP es vorsieht. Lokale Clients,
  die nur `http://localhost…`-Rückleitungen angeben, gelten als `native`
  (`src/server/better-auth/native-loopback.ts`); sonst verlangt better-auth https.

## Betrieb

- `BETTER_AUTH_URL` muss die öffentliche Adresse sein: daraus ergeben sich Issuer
  und Ressourcen-Kennung. Ändert sie sich, müssen sich Clients neu verbinden.
- Die Signierschlüssel (Tabelle `jwks`) legt better-auth beim ersten Token selbst an.
- Im Wartungsmodus bleiben `/api/mcp`, `/oauth` und `/.well-known` erreichbar
  (wie das Dashboard); geändert wird nur mit gültigem Token.
