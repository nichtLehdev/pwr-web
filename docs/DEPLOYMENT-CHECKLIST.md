# Deployment-Checkliste

Diese Checkliste deckt die beiden Deploy-Wege ab, die es tatsächlich gibt:

| Umgebung        | Ziel                    | Konfiguration              | Auslöser                        |
| --------------- | ----------------------- | -------------------------- | ------------------------------- |
| **Produktion**  | mittwald Container-Stack | `deploy/stack.yaml`        | GitHub-Release (**kein** Pre-Release) |
| **Vorabversion** | alter Server, `pwr.lehdev.de` | `docker-compose.prod.yml` | jedes Release, auch Pre-Release |

Beide bekommen dasselbe Image (`ghcr.io/nichtlehdev/pwr-web`). Unterschieden
werden sie über `APP_ENV`: nur `production` ist die öffentliche Seite, alles
andere blendet das Beta-Banner ein.

---

## Was beim Deploy automatisch läuft

Der Startbefehl des App-Containers (siehe `deploy/stack.yaml`) erledigt in
dieser Reihenfolge:

1. `prisma migrate deploy` — bis zu 30 Versuche im 5-Sekunden-Abstand, danach
   bricht der Container ab. **Das ist der einzige Schritt, der den Start
   verhindern kann.**
2. `prisma/post-migration-setup.ts` — legt Permissions, System-Rollen und die
   13 Bezirke an, weist `ADMIN_EMAIL` die Administrator-Rolle zu.
3. `prisma/backfill-slugs.ts` — füllt fehlende Slugs für Beiträge, Chöre,
   Termine und Kurse.
4. `prisma/backfill-phone-format.ts` — normalisiert Telefonnummern.

Schritte 2–4 sind bewusst **non-fatal**: Schlagen sie fehl, startet die App
trotzdem. Der Fehler steht dann nur im Container-Log. Nach einem Deploy also
kurz reinschauen — siehe „Nach dem Deployment".

Migrationen und Drift werden seit `CI - Database Validation` auch in der CI auf
einer leeren Datenbank durchgespielt, inklusive der beiden Backfills. Ein
Deploy, der an Schritt 1 scheitert, sollte damit nicht mehr überraschend kommen.

---

## Vor dem Deployment

### 1. Code-Qualität

- [ ] `pnpm run check` (Lint + Typecheck)
- [ ] `pnpm test`
- [ ] CI auf `main` ist grün

### 2. Migrationen

- [ ] Alle Migrationen sind committed: `git status prisma/migrations/`
- [ ] `CI - Database Validation` ist für den letzten Commit grün — der Job
      `Migrations & Drift` fährt alle Migrationen auf einer leeren Datenbank
      hoch und prüft, ob `schema.prisma` und Migrationsstand auseinanderlaufen.

Lokal dasselbe nachstellen:

```bash
pnpm prisma migrate deploy
pnpm prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
```

### 3. Datenbank-Backup

- **mittwald**: Backups laufen über die Plattform (mStudio). Vor einem Release
  mit Migrationen dort kurz prüfen, dass ein aktueller Stand vorliegt, und im
  Zweifel manuell eines anstoßen.
- **docker compose**: der `db-backup`-Service sichert nach `BACKUP_SCHEDULE`.
  Manuell:

  ```bash
  docker compose -f docker-compose.prod.yml exec db-backup /scripts/backup-db.sh /backups
  ```

- [ ] Aktuelles Backup vorhanden und nicht leer

### 4. GitHub-Konfiguration prüfen

Der Job `deploy-production` füllt jeden `{{ .Env.* }}`-Platzhalter aus
`deploy/stack.yaml`. Fehlt einer, startet der Stack mit leerem Wert.

**Environment `production` → Secrets:**

- [ ] `MITTWALD_API_TOKEN`
- [ ] `POSTGRES_PASSWORD`
- [ ] `BETTER_AUTH_SECRET` (min. 32 Zeichen)
- [ ] `SMTP_PASSWORD`
- [ ] `CRON_SECRET` (min. 16 Zeichen)
- [ ] `ADMIN_EMAIL`

**Environment `production` → Variables:**

- [ ] `MITTWALD_STACK_ID`
- [ ] `APP_URL` — **die endgültige öffentliche Domain**, nicht die der
      Vorabversion. Der Wert wird zu `NEXT_PUBLIC_APP_URL` *und*
      `BETTER_AUTH_URL`; er landet damit in Canonicals, Open-Graph-URLs,
      Bestätigungs- und Passwort-Reset-Links.
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_FROM`

---

## Deployment

1. [ ] GitHub → Releases → „Draft a new release"
2. [ ] Tag vergeben (z. B. `v1.2.3`)
3. [ ] Release-Notes schreiben
4. [ ] **Nicht** als Pre-Release markieren — sonst geht es nur auf die
       Vorabversion und *nicht* auf die Produktion
5. [ ] Release veröffentlichen
6. [ ] Workflow `Release & Deploy` beobachten: `build-and-push` →
       `deploy-production` → `Verify deployment`

Der Verify-Schritt pollt `APP_URL` bis zu zehnmal. Läuft er auf einen Fehler,
steht die App nicht — dann direkt ins Container-Log.

---

## Nach dem Deployment

### 1. Logs prüfen

Im mStudio das Log des App-Containers öffnen und nach den vier Startschritten
sehen. Besonders auf die non-fatalen achten:

- [ ] `All migrations have been successfully applied.`
- [ ] `✅ Post-migration setup completed successfully!`
- [ ] Kein `Slug backfill failed` / `Phone format backfill failed`

### 2. Admin-Zugang

`post-migration-setup.ts` weist die Administrator-Rolle nur zu, wenn unter
`ADMIN_EMAIL` **bereits ein registrierter Benutzer existiert**. Auf einer
frischen Datenbank ist das nicht der Fall — der Schritt wird dann übersprungen
und niemand kommt ins Dashboard.

Reihenfolge beim ersten Deploy auf eine leere Datenbank:

1. [ ] Deploy läuft, Seite ist erreichbar
2. [ ] Über `/register` mit genau der Adresse aus `ADMIN_EMAIL` registrieren
3. [ ] Setup erneut anstoßen — am einfachsten durch einen Neustart des
       App-Containers im mStudio (das Startskript ruft es ohnehin bei jedem
       Start auf, und es ist wiederholbar)
4. [ ] Einloggen und Dashboard-Zugriff prüfen

### 3. Cronjobs (mStudio)

Die geplanten Jobs laufen auf mittwald **nicht** im Stack, sondern als
mStudio-Cronjobs. Sie müssen dort einmalig angelegt sein — ohne sie werden
keine Anmeldeschluss-Mails verschickt und unbestätigte Newsletter-Anmeldungen
nie gelöscht (was die Datenschutzerklärung mit 30 Tagen zusagt).

- [ ] `registration-closed` — ruft `POST /api/cron/registration-closed` auf
      (Vorschlag: alle 6 Stunden), Skript `scripts/trigger-registration-closed.mjs`
- [ ] `newsletter-cleanup` — ruft `POST /api/cron/newsletter-cleanup` auf
      (Vorschlag: täglich), Skript `scripts/trigger-newsletter-cleanup.mjs`

Beide brauchen `Authorization: Bearer $CRON_SECRET` — ohne den Header
antworten die Routen mit 401. Einmal von Hand testen:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<APP_URL>/api/cron/registration-closed
```

### 4. Funktionale Stichproben

- [ ] Startseite lädt
- [ ] **Kein Beta-Banner** (sonst steht `APP_ENV` nicht auf `production`)
- [ ] Login funktioniert
- [ ] `/termine` und eine Kurs-Detailseite
- [ ] `/ueber-uns/bezirke` — Karte lädt, Obleute erscheinen
- [ ] Dashboard erreichbar, Rollen greifen
- [ ] Eine Test-E-Mail versenden (z. B. Passwort-Reset)
- [ ] `robots.txt` und `sitemap.xml` zeigen auf die richtige Domain

---

## Fehlerbehebung

### Migration schlägt fehl (P3009)

`migrate found failed migrations in the target database`

Migration war bereits angewendet:

```bash
pnpm prisma migrate resolve --applied <migration-name>
```

Migration war nicht angewendet:

```bash
pnpm prisma migrate resolve --rolled-back <migration-name>
```

Auf mittwald läuft beides über eine Shell im App-Container. Kein `pnpm` im
Image — Binaries direkt aufrufen:

```bash
node node_modules/prisma/build/index.js migrate resolve --applied <migration-name>
```

### Niemand kommt ins Dashboard

Meist ist Schritt 2 des Startskripts übersprungen worden, weil es den Benutzer
zu `ADMIN_EMAIL` nicht gab. Siehe „Admin-Zugang" oben. Manuell nachziehen:

```sql
SELECT id, email FROM "user" WHERE email = 'deine-email@example.com';
SELECT id FROM "role" WHERE name = 'Administrator';

INSERT INTO "user_role_assignment" (id, "userId", "roleId", "createdAt")
VALUES (gen_random_uuid(), '<user-id>', '<role-id>', NOW());
```

### Slugs fehlen (URLs zeigen UUIDs)

Harmlos — die Routen fallen auf die UUID zurück. Nachziehen:

```bash
node node_modules/tsx/dist/cli.mjs prisma/backfill-slugs.ts
```

Import und Duplizieren lassen den Slug absichtlich `NULL`; zwischen zwei
Deployments können also neue Zeilen ohne Slug entstehen.

> Skripte unter `prisma/`, die im Container laufen, dürfen nur `src/`-Dateien
> importieren, die das Dockerfile ins Runner-Image kopiert. Aktuell:
> `server/db.ts`, `lib/permissions.ts`, `lib/bezirke.ts`, `lib/slug.ts`.

### Rollback

Im mStudio die vorherige Image-Version des Stacks auswählen (bzw.
`RELEASE_VERSION` auf den alten Tag setzen und neu deployen).

**Achtung:** Ein Rollback des Images macht keine Migration rückgängig. Wenn das
neue Release eine Migration mitgebracht hat, die das alte Image nicht versteht,
muss das Datenbank-Backup zurückgespielt werden.

---

## Sicherheits-Checkliste

- [ ] Keine Secrets im Code — alles über GitHub Secrets bzw. `.env`
- [ ] `BETTER_AUTH_SECRET` ist nicht der Beispielwert und wurde nie committed
- [ ] `CRON_SECRET` gesetzt (sonst laufen die Jobs nie)
- [ ] HTTPS aktiv (die App schickt HSTS mit `preload`)
- [ ] Dependabot-PRs abgearbeitet

---

**Letzte Aktualisierung**: 2026-09-10
