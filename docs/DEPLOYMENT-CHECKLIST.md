# Deployment-Checkliste

Diese Checkliste hilft dir dabei, alle Änderungen sicher auf deinem Server zu deployen.

## ⚠️ KRITISCHER HINWEIS FÜR DIESES DEPLOYMENT

**Das Permission-System wurde komplett refactored!** Nach der Migration hat **NIEMAND** mehr Rechte, bis das Post-Migration-Setup ausgeführt wurde.

**Du MUSST nach dem Deployment folgendes ausführen** (auf dem Server reichen `.env` + `docker-compose.prod.yml` – der Befehl läuft im Container; das Image enthält tsconfig + nötige `src`-Dateien für Path-Aliase wie `@/`).

**Variante A – mit Profil (empfohlen):** E-Mail in `.env` setzen (`ADMIN_EMAIL=deine-email@example.com`), dann:
```bash
docker compose -f docker-compose.prod.yml --profile post-migration run --rm post-migration-setup
```

**Variante B – E-Mail als Argument:** (kein Repo auf dem Server nötig, läuft im App-Image):
```bash
docker compose -f docker-compose.prod.yml run --rm app pnpm tsx prisma/post-migration-setup.ts deine-email@example.com
```

Dieses Skript:
- ✅ Erstellt alle System-Permissions
- ✅ Erstellt alle System-Rollen
- ✅ Weist dir automatisch die Administrator-Rolle zu

**Ohne diesen Schritt kannst du nicht auf das Dashboard zugreifen!**

## 📋 Vor dem Deployment

### 1. Code-Qualität prüfen
- [ ] **Linter-Fehler beheben**: `pnpm run lint`
- [ ] **TypeScript-Fehler prüfen**: `pnpm run typecheck`
- [ ] **Tests ausführen** (falls vorhanden)
- [ ] **Code-Review durchführen** (falls im Team)

### 2. Datenbank-Migrationen prüfen
- [ ] **Alle Migrationen sind committed**:
  ```bash
  git status prisma/migrations/
  ```
- [ ] **Migrationen lokal testen**:
  ```bash
  # Lokale Datenbank zurücksetzen und Migrationen testen
  pnpm prisma migrate reset
  pnpm prisma migrate deploy
  ```
- [ ] **Prisma Client generieren**:
  ```bash
  pnpm prisma generate
  ```

### 2b. Slug-Backfill (einmalig nach dem Slug-Deployment)
- [ ] **Nach `migrate deploy` einmalig ausführen**:
  ```bash
  pnpm backfill:slugs
  ```
  Die Migration `20260808000051_add_post_and_ensemble_slug` legt die Spalte
  nur an — gefüllt wird sie von diesem Skript. Ohne den Backfill bleibt die
  Seite voll funktionsfähig (Detailseiten fallen auf die UUID zurück), aber
  die sprechenden URLs fehlen. Das Skript überspringt Zeilen, die schon einen
  Slug haben, und ist damit gefahrlos wiederholbar.

### 3. Wichtige Änderungen seit letztem Deployment

#### Permission-System Refactoring
- [ ] **UserRole Enum entfernt**: Alle Referenzen zu `UserRole` wurden entfernt
- [ ] **Neues Permission-System**: Custom Roles und Permissions sind implementiert
- [ ] **Migrationen vorhanden**:
  - `20260216141710_add_custom_permissions`
  - `20260216151701_remove_userrole_add_district_role`
  - `20260216162645_add_role_hierarchy`
- [ ] **⚠️ KRITISCH: Post-Migration-Setup erforderlich**:
  - Permissions müssen geseedet werden
  - Rollen müssen erstellt werden
  - Admin-User muss Administrator-Rolle zugewiesen bekommen
  - Siehe Schritt 4 unten

#### Bezirksobleute-Filterung
- [ ] **tRPC Queries gefiltert**: Nur User mit `districtRoleName` werden angezeigt
- [ ] **Betroffene Routen**:
  - `src/server/api/routers/bezirke.ts` - `getAll`, `getById`, `getByNumber`, `getStatistics`

### 4. Admin-User vorbereiten
**⚠️ WICHTIG: Nach der Migration hast du keine Rechte mehr, wenn du keine Rolle zugewiesen bekommst!**

- [ ] **Deine E-Mail-Adresse notieren**: Diese wird benötigt, um dir die Admin-Rolle zuzuweisen
- [ ] **ADMIN_EMAIL Environment Variable setzen** (optional, kann auch beim Skript-Aufruf übergeben werden):
  ```bash
  # Auf dem Server in .env oder docker-compose.prod.yml
  ADMIN_EMAIL=deine-email@example.com
  ```

### 4. Datenbank-Backup erstellen
**⚠️ KRITISCH: Immer vor Deployment ein Backup erstellen!**

```bash
# Auf dem Server (via SSH)
cd /path/to/project
docker compose -f docker-compose.prod.yml exec db-backup /scripts/backup-db.sh /backups

# Oder manuell
docker compose -f docker-compose.prod.yml exec db-backup pg_dump -U postgres posaunenwerk | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

- [ ] **Backup erfolgreich erstellt**
- [ ] **Backup-Datei lokal gesichert** (falls möglich)
- [ ] **Backup-Verifizierung**: Prüfe, ob Backup-Datei existiert und nicht leer ist

### 5. Environment Variables prüfen
- [ ] **Alle benötigten ENV-Variablen sind gesetzt**:
  - `DATABASE_URL`
  - `BETTER_AUTH_SECRET`
  - `BETTER_AUTH_URL`
  - `NEXT_PUBLIC_APP_URL`
  - `GITHUB_TOKEN` (falls verwendet)
  - `SMTP_*` (falls E-Mail verwendet wird)

### 6. Git-Status prüfen
- [ ] **Alle Änderungen committed**:
  ```bash
  git status
  ```
- [ ] **Auf dem richtigen Branch** (z.B. `main` oder `master`)
- [ ] **Keine uncommitted Änderungen**

## 🚀 Deployment-Prozess

### Option A: Automatisches Deployment via GitHub Release

1. **Release erstellen**:
   - [ ] Gehe zu GitHub → Releases → "Draft a new release"
   - [ ] Tag-Version erstellen (z.B. `v1.2.3`)
   - [ ] Release-Notes schreiben
   - [ ] **NICHT als Pre-Release markieren** (sonst wird nicht deployed)
   - [ ] Release veröffentlichen

2. **GitHub Actions überwachen**:
   - [ ] Workflow `Release & Deploy` startet automatisch
   - [ ] Build-Job erfolgreich
   - [ ] Deploy-Job erfolgreich
   - [ ] Verification erfolgreich

### Option B: Manuelles Deployment

1. **Auf dem Server einloggen**:
   ```bash
   ssh user@your-server
   cd /path/to/project
   ```

2. **Aktuelle Container stoppen** (optional, für Zero-Downtime):
   ```bash
   docker compose -f docker-compose.prod.yml pull
   ```

3. **Neue Images pullen**:
   ```bash
   docker login ghcr.io -u nichtlehdev
   docker pull ghcr.io/nichtlehdev/pwr-web:latest
   docker pull ghcr.io/nichtlehdev/pwr-backup:latest
   ```

4. **Container aktualisieren**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

## ✅ Nach dem Deployment

### 1. Migrationen prüfen
- [ ] **Migration-Container erfolgreich**:
  ```bash
  docker compose -f docker-compose.prod.yml logs db-migrate
  ```
- [ ] **Keine Fehler in Migration-Logs**
- [ ] **Falls Migration fehlgeschlagen**: Siehe "Fehlerbehebung" unten

### 2. Post-Migration-Setup ausführen
**⚠️ KRITISCH: Dieser Schritt ist ESSENTIELL, sonst hast du keinen Zugriff!**
(Kein Repo auf dem Server nötig – Skript liegt im App-Image.)

- [ ] **Permissions und Rollen erstellen**:
  ```bash
  # E-Mail als Argument (empfohlen)
  docker compose -f docker-compose.prod.yml run --rm app pnpm tsx prisma/post-migration-setup.ts deine-email@example.com
  ```
  Oder mit Profil (wenn ADMIN_EMAIL in .env gesetzt ist):
  ```bash
  docker compose -f docker-compose.prod.yml --profile post-migration run --rm post-migration-setup
  ```

- [ ] **Skript erfolgreich ausgeführt**:
  - ✓ Permissions erstellt
  - ✓ Rollen erstellt
  - ✓ Admin-Rolle zugewiesen

- [ ] **Falls User nicht gefunden**: Skript zeigt verfügbare User an

### 3. Container-Status prüfen
- [ ] **Alle Container laufen**:
  ```bash
  docker compose -f docker-compose.prod.yml ps
  ```
- [ ] **App-Container ist "healthy"**
- [ ] **Database-Container ist "healthy"**

### 4. Application-Logs prüfen
- [ ] **Keine kritischen Fehler**:
  ```bash
  docker compose -f docker-compose.prod.yml logs app --tail 100
  ```
- [ ] **Prisma Client erfolgreich generiert**
- [ ] **Server startet erfolgreich**

### 5. Funktionale Tests
- [ ] **Homepage lädt**: `https://pwr.lehdev.de`
- [ ] **Login funktioniert**
- [ ] **Bezirke-Seite funktioniert**: `/ueber-uns/bezirke`
  - [ ] Karte wird angezeigt
  - [ ] Hover zeigt Haupt-Obleute an
  - [ ] Nur User mit `districtRoleName` werden angezeigt
- [ ] **Dashboard funktioniert** (falls Zugriff vorhanden)
- [ ] **Permission-System funktioniert**: Rollen und Permissions werden korrekt angewendet

### 6. Datenbank-Status prüfen
- [ ] **Datenbank-Verbindung funktioniert**:
  ```bash
  docker compose -f docker-compose.prod.yml exec db pg_isready
  ```
- [ ] **Migrationen sind angewendet**:
  ```bash
  docker compose -f docker-compose.prod.yml exec db psql -U postgres -d posaunenwerk -c "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"
  ```

### 7. Performance-Monitoring
- [ ] **Seiten laden schnell** (< 3 Sekunden)
- [ ] **Keine Memory-Leaks** (Container-Speicher stabil)
- [ ] **Keine CPU-Spitzen**

## 🔧 Fehlerbehebung

### Migration-Fehler

**Problem**: `migrate found failed migrations in the target database` (P3009)

**Lösung Option A** - Migration wurde bereits angewendet:
```bash
docker compose -f docker-compose.prod.yml run --rm db-migrate pnpm prisma migrate resolve --applied <migration-name>
```

**Lösung Option B** - Migration wurde nicht angewendet:
```bash
docker compose -f docker-compose.prod.yml run --rm db-migrate pnpm prisma migrate resolve --rolled-back <migration-name>
docker compose -f docker-compose.prod.yml up -d
```

### Container startet nicht

1. **Logs prüfen**:
   ```bash
   docker compose -f docker-compose.prod.yml logs app
   ```

2. **Environment Variables prüfen**:
   ```bash
   docker compose -f docker-compose.prod.yml config
   ```

3. **Datenbank-Verbindung testen**:
   ```bash
   docker compose -f docker-compose.prod.yml exec app pnpm prisma db pull
   ```

### Rollback (falls nötig)

1. **Altes Image wiederherstellen**:
   ```bash
   # Bestimmte Version pullen
   docker pull ghcr.io/nichtlehdev/pwr-web:v1.2.2

   # docker-compose.prod.yml anpassen (Image-Tag ändern)
   # Oder direkt:
   docker tag ghcr.io/nichtlehdev/pwr-web:v1.2.2 ghcr.io/nichtlehdev/pwr-web:latest
   docker compose -f docker-compose.prod.yml up -d
   ```

2. **Datenbank-Rollback** (nur wenn Migration rückgängig gemacht werden muss):
   ```bash
   # ⚠️ VORSICHT: Nur wenn absolut notwendig!
   # Backup wiederherstellen
   docker compose -f docker-compose.prod.yml exec db-backup /scripts/restore-db.sh /backups/backup_YYYYMMDD_HHMMSS.sql.gz
   ```

## 📝 Spezielle Hinweise für aktuelle Änderungen

### Permission-System Migration

Die Migrationen entfernen das alte `UserRole` Enum und führen ein neues Permission-System ein:

1. **⚠️ KRITISCH**: Nach der Migration hat NIEMAND mehr Rechte!
2. **Post-Migration-Setup MUSS ausgeführt werden** (läuft im Container, kein Repo auf dem Server nötig):
   ```bash
   docker compose -f docker-compose.prod.yml run --rm app pnpm tsx prisma/post-migration-setup.ts deine-email@example.com
   ```
3. **Dieses Skript**:
   - Erstellt alle System-Permissions
   - Erstellt alle System-Rollen (Administrator, Landesposaunenwart, etc.)
   - Weist deinem User automatisch die Administrator-Rolle zu
4. **Falls du ausgesperrt bist**:
   - Skript erneut ausführen mit deiner E-Mail
   - Oder manuell über Datenbank:
     ```sql
     -- Finde deine User-ID
     SELECT id, email FROM "User" WHERE email = 'deine-email@example.com';

     -- Finde Administrator-Rollen-ID
     SELECT id FROM "Role" WHERE name = 'Administrator';

     -- Weise Rolle zu
     INSERT INTO "user_role_assignment" (id, "userId", "roleId", "createdAt")
     VALUES (gen_random_uuid(), 'DEINE_USER_ID', 'ADMIN_ROLE_ID', NOW());
     ```

### Bezirksobleute-Filterung

Die Filterung zeigt nur User mit `districtRoleName` an:

1. **Prüfe Datenbank**: Stelle sicher, dass alle Bezirksobleute ein `districtRoleName` haben:
   ```sql
   SELECT b.number, b.shortName, u.displayName, u.districtRoleName
   FROM "Bezirk" b
   LEFT JOIN "User" u ON u."bezirkId" = b.id
   WHERE u."districtRoleName" IS NOT NULL;
   ```

2. **Falls User fehlen**: Diese müssen über das Dashboard mit `districtRoleName` zugewiesen werden

## 🔐 Sicherheits-Checkliste

- [ ] **Keine Secrets im Code** (nur in Environment Variables)
- [ ] **Docker Images sind aktuell** (keine bekannten Vulnerabilities)
- [ ] **SSL/TLS ist aktiviert** (HTTPS)
- [ ] **Backups sind verschlüsselt** (falls möglich)
- [ ] **Zugriffsrechte sind korrekt** (SSH-Keys, etc.)

## 📞 Support & Dokumentation

- **Deployment-Dokumentation**: `docs/deployment.md`
- **Backup-Dokumentation**: `docs/backups.md`
- **Migration-Dokumentation**: `docs/permissions-migration.md`

---

**Letzte Aktualisierung**: 2026-02-16
**Version**: 1.0
