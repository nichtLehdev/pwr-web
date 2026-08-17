# DSGVO Compliance Guide für Administratoren

Dieses Dokument beschreibt, welche Tools und Funktionen Ihnen als Administrator zur Verfügung stehen, um DSGVO-Anfragen (GDPR-Anfragen) zu bearbeiten, und was noch implementiert werden sollte.

## Aktuelle Funktionen

### ✅ Verfügbare Admin-Funktionen

#### 1. Datenexport (Bulk-Export)
Als Administrator können Sie verschiedene Datentypen exportieren:

**Verfügbare Export-Typen:**
- `/api/export/posts` - Alle Posts/Beiträge
- `/api/export/events` - Alle Veranstaltungen
- `/api/export/courses` - Alle Kurse/Lehrgänge
- `/api/export/ensembles` - Alle Ensembles
- `/api/export/media` - Alle Medien-Dateien
- `/api/export/downloads` - Alle Downloads
- `/api/export/blaeserhefte` - Alle Bläserhefte

**Verwendung:**
- Diese Endpunkte sind nur für Benutzer mit `USERS_MANAGE` Berechtigung verfügbar
- Exportiert werden ZIP-Dateien mit JSON-Daten und zugehörigen Medien-Dateien
- Format: `{type}-export-{datum}.zip`

#### 2. Benutzer löschen
- **Ort:** Dashboard → Benutzer → [Benutzer auswählen] → Löschen
- **Funktion:** `api.users.delete`
- **Einschränkungen:** 
  - Benutzer mit aktiven Mitgliedschaften (Team, Vorstand, etc.) können nicht gelöscht werden
  - Benutzer mit erstellten Inhalten (Events, Kurse, Posts) können nicht gelöscht werden
  - Zuerst müssen Mitgliedschaften entfernt und Inhalte neu zugewiesen werden

#### 3. Kurs-Teilnehmer Export
- **Ort:** Dashboard → Kurse → [Kurs auswählen] → Teilnehmer → Export
- **Formate:** CSV, Excel, JSON
- **Enthält:** Teilnehmerdaten, Anmeldedaten, Preise, Custom Fields

#### 4. Benutzer-Liste und Suche
- **Ort:** Dashboard → Benutzer
- **Funktionen:** 
  - Suche nach Name, E-Mail, Benutzername
  - Sortierung nach Name, E-Mail, Erstellungsdatum
  - Paginierung

### ✅ Verfügbare Benutzer-Funktionen

#### 1. Gespeicherte Teilnehmer löschen
- **Ort:** Einstellungen → Gespeicherte Teilnehmer
- Benutzer können ihre eigenen gespeicherten Teilnehmer löschen

#### 2. Tracking-Einstellungen ändern
- **Ort:** Einstellungen → Nutzungsstatistik
- Benutzer können ihre Einwilligung zur Datenerfassung ändern oder widerrufen

#### 3. Anmeldung ohne Benutzerkonto verwalten (Magic Link)
- **Ort:** Link in der Anmelde-Bestätigungsmail, oder `/anmeldung-verwalten`
- Wer sich ohne Konto zu einem Kurs anmeldet, erhält einen signierten,
  personalisierten Link zu seiner Anmeldung. Damit sind Auskunft (Art. 15),
  Berichtigung (Art. 16) und Stornierung ohne Kontaktaufnahme möglich.
- Der Link ist an Anmeldung **und** hinterlegte E-Mail-Adresse gebunden, läuft
  nach 180 Tagen ab und wird nur an die gespeicherte Adresse verschickt —
  über `/anmeldung-verwalten` kann sich niemand Links zu fremden Anmeldungen
  schicken lassen.
- Fristen bleiben unverändert: Bearbeiten ist nur bis Anmeldeschluss bzw.
  Kursbeginn möglich, unabhängig von der Gültigkeit des Links.

## Fehlende Funktionen für vollständige DSGVO-Compliance

### 🔴 Kritisch - Muss implementiert werden

#### 1. Benutzer-Datenexport (Art. 20 DSGVO - Recht auf Datenübertragbarkeit)
**Status:** ❌ Nicht implementiert

**Was benötigt wird:**
- Endpunkt: `/api/export/user/[userId]` oder `/api/users/[userId]/export`
- Sollte alle personenbezogenen Daten eines Benutzers exportieren:
  - Benutzerprofil-Daten
  - Kursanmeldungen mit Teilnehmerdaten
  - Gespeicherte Teilnehmer
  - Newsletter-Abonnement-Status
  - Session-Daten (optional)
  - Feedback-Einträge
  - Page View Tracking-Daten (falls Einwilligung erteilt wurde)
  - Hochgeladene Medien
  - Erstellte Inhalte (Events, Kurse, Posts) - falls relevant

**Format:** JSON oder strukturiertes Format (z.B. JSON-LD)

#### 2. Benutzer-Konto löschen (Art. 17 DSGVO - Recht auf Löschung)
**Status:** ⚠️ Button vorhanden, aber nicht implementiert

**Ort:** Einstellungen → Gefahrenzone → "Konto löschen"

**Was benötigt wird:**
- Funktion zum vollständigen Löschen des Benutzerkontos
- Berücksichtigung von:
  - Abhängigkeiten (Kursanmeldungen, erstellte Inhalte)
  - Gesetzliche Aufbewahrungspflichten (Rechnungen: 10 Jahre)
  - Anonymisierung statt Löschung bei gesetzlich erforderlichen Daten

#### 3. Admin: Benutzer-Datenexport für DSGVO-Anfragen
**Status:** ❌ Nicht implementiert

**Was benötigt wird:**
- Admin-Tool zum Exportieren aller Daten eines spezifischen Benutzers
- Sollte alle oben genannten Daten enthalten
- Format: Strukturiertes JSON mit Metadaten

#### 4. Admin: Kursanmeldungen-Export mit Teilnehmerdaten
**Status:** ⚠️ Teilweise vorhanden (nur pro Kurs)

**Was benötigt wird:**
- Export aller Kursanmeldungen mit Teilnehmerdaten
- Filter nach Anmelder-E-Mail
- Export aller Anmeldungen eines bestimmten Benutzers

#### 5. Admin: Newsletter-Abonnenten-Verwaltung
**Status:** ✅ Vorhanden

**Ort:** Dashboard → Newsletter → Abonnenten

**Verfügbare Funktionen:**
- Abonnenten anzeigen
- Abonnenten löschen
- Status ändern (aktiv/inaktiv)

### 🟡 Wichtig - Sollte implementiert werden

#### 6. Admin: Datenzugriff-Anfragen bearbeiten (Art. 15 DSGVO)
**Status:** ❌ Nicht implementiert

**Was benötigt wird:**
- Workflow-System für DSGVO-Anfragen
- Möglichkeit, Anfragen zu dokumentieren
- Automatische Generierung von Datenexporten
- Nachweis der Bearbeitung

#### 7. Admin: Datenberichtigung (Art. 16 DSGVO)
**Status:** ⚠️ Teilweise vorhanden (manuelle Bearbeitung möglich)

**Was benötigt wird:**
- Strukturierter Workflow für Berichtigungsanfragen
- Nachweis der Berichtigung
- Benachrichtigung des Benutzers

#### 8. Admin: Einschränkung der Verarbeitung (Art. 18 DSGVO)
**Status:** ❌ Nicht implementiert

**Was benötigt wird:**
- Möglichkeit, Verarbeitung bestimmter Daten zu sperren
- Flag im Benutzerprofil
- Automatische Einhaltung der Einschränkung

#### 9. Admin: Widerspruch gegen Verarbeitung (Art. 21 DSGVO)
**Status:** ⚠️ Teilweise vorhanden (Newsletter-Abmeldung)

**Was benötigt wird:**
- Zentrale Verwaltung von Widersprüchen
- Tracking von Widersprüchen gegen verschiedene Verarbeitungszwecke

## Aktuelle Workarounds für DSGVO-Anfragen

### Recht auf Auskunft (Art. 15 DSGVO)

**Manuelle Vorgehensweise:**

1. **Benutzer identifizieren:**
   - Dashboard → Benutzer → Suche nach E-Mail oder Name

2. **Daten manuell sammeln:**
   - Benutzerprofil anzeigen (Dashboard → Benutzer → [Benutzer])
   - Kursanmeldungen finden:
     - Dashboard → Kurse → [Kurs] → Teilnehmer
     - Nach Anmelder-E-Mail suchen
   - Newsletter-Status prüfen:
     - Dashboard → Newsletter → Abonnenten
   - Gespeicherte Teilnehmer:
     - Datenbank-Abfrage erforderlich (kein Admin-UI verfügbar)

3. **Daten zusammenstellen:**
   - Manuell in strukturiertem Format (z.B. JSON oder PDF)
   - Alle relevanten Daten auflisten

### Recht auf Löschung (Art. 17 DSGVO)

**Aktuelle Möglichkeiten:**

1. **Benutzerkonto löschen:**
   - Dashboard → Benutzer → [Benutzer] → Löschen
   - ⚠️ Funktioniert nur, wenn keine Abhängigkeiten bestehen

2. **Gespeicherte Teilnehmer löschen:**
   - Als Admin: Datenbank-Zugriff erforderlich
   - Als Benutzer: Einstellungen → Gespeicherte Teilnehmer

3. **Newsletter-Abonnement löschen:**
   - Dashboard → Newsletter → Abonnenten → [Abonnent] → Löschen

**Einschränkungen:**
- Kursanmeldungen können nicht gelöscht werden (gesetzliche Aufbewahrungspflicht)
- Erstellte Inhalte müssen manuell neu zugewiesen werden

### Recht auf Datenübertragbarkeit (Art. 20 DSGVO)

**Aktuelle Möglichkeiten:**

1. **Manueller Export:**
   - Benutzerdaten aus Dashboard kopieren
   - Kursanmeldungen exportieren (pro Kurs)
   - Manuell zusammenstellen

2. **Datenbank-Zugriff:**
   - Direkte SQL-Abfragen für vollständigen Export
   - Erfordert technisches Wissen

## Empfohlene Implementierungen

### Priorität 1 (Kritisch für DSGVO-Compliance)

1. **Benutzer-Datenexport-Funktion**
   ```typescript
   // Neuer Endpunkt: /api/users/[userId]/export
   // Oder: /api/export/user/[userId]
   // Sollte alle personenbezogenen Daten exportieren
   ```

2. **Benutzer-Konto-Löschung**
   ```typescript
   // Implementierung in: src/app/settings/page.tsx
   // Button "Konto löschen" funktionsfähig machen
   // Berücksichtigung von Abhängigkeiten und Aufbewahrungspflichten
   ```

3. **Admin: DSGVO-Anfragen-Verwaltung**
   ```typescript
   // Neues Dashboard: /dashboard/dsgvo-requests
   // Workflow für Anfragen-Verwaltung
   // Automatische Generierung von Exports
   ```

### Priorität 2 (Wichtig für effiziente Bearbeitung)

4. **Admin: Benutzer-Datenexport-Tool**
   ```typescript
   // In: src/app/dashboard/users/[id]/page.tsx
   // Button "Daten exportieren" hinzufügen
   // Generiert strukturierten Export
   ```

5. **Admin: Alle Kursanmeldungen eines Benutzers anzeigen**
   ```typescript
   // In: src/app/dashboard/users/[id]/page.tsx
   // Sektion "Kursanmeldungen" hinzufügen
   ```

6. **Admin: Gespeicherte Teilnehmer anzeigen**
   ```typescript
   // In: src/app/dashboard/users/[id]/page.tsx
   // Sektion "Gespeicherte Teilnehmer" hinzufügen
   ```

### Priorität 3 (Nice-to-have)

7. **Automatisierte DSGVO-Anfragen-Verarbeitung**
8. **E-Mail-Templates für DSGVO-Antworten**
9. **Audit-Log für DSGVO-Anfragen**

## Checkliste für DSGVO-Anfragen

### Bei einer Auskunftsanfrage (Art. 15):

- [ ] Benutzer identifizieren (E-Mail oder Name)
- [ ] Alle gespeicherten Daten sammeln:
  - [ ] Benutzerprofil-Daten
  - [ ] Kursanmeldungen
  - [ ] Teilnehmerdaten
  - [ ] Gespeicherte Teilnehmer
  - [ ] Newsletter-Status
  - [ ] Session-Daten (falls relevant)
  - [ ] Tracking-Daten (falls Einwilligung erteilt)
- [ ] Daten in strukturiertem Format zusammenstellen
- [ ] Innerhalb von 30 Tagen antworten
- [ ] Nachweis der Bearbeitung dokumentieren

### Bei einer Löschungsanfrage (Art. 17):

- [ ] Benutzer identifizieren
- [ ] Prüfen, ob Löschung möglich ist:
  - [ ] Keine gesetzlichen Aufbewahrungspflichten
  - [ ] Keine aktiven Mitgliedschaften
  - [ ] Keine erstellten Inhalte (oder neu zugewiesen)
- [ ] Daten löschen oder anonymisieren
- [ ] Bestätigung an Benutzer senden
- [ ] Innerhalb von 30 Tagen antworten

### Bei einer Datenübertragbarkeits-Anfrage (Art. 20):

- [ ] Benutzer identifizieren
- [ ] Alle Daten exportieren (sobald Funktion verfügbar)
- [ ] In strukturiertem, maschinenlesbarem Format bereitstellen
- [ ] Innerhalb von 30 Tagen antworten

## Kontakt für DSGVO-Anfragen

**E-Mail:** info@posaunenwerk-rheinland.de

**Bearbeitungsfrist:** 30 Tage gemäß DSGVO Art. 12 Abs. 3

## Rechtliche Hinweise

- Alle DSGVO-Anfragen müssen innerhalb von 30 Tagen bearbeitet werden
- Bei komplexen Anfragen kann die Frist um weitere 2 Monate verlängert werden (mit Begründung)
- Bei Löschungsanfragen müssen gesetzliche Aufbewahrungspflichten beachtet werden (z.B. Rechnungen: 10 Jahre)
- Alle Anfragen sollten dokumentiert werden (Wer, Was, Wann)

## Nächste Schritte

1. ✅ Datenschutzerklärung aktualisiert (Februar 2026)
2. ⏳ Benutzer-Datenexport implementieren
3. ⏳ Benutzer-Konto-Löschung implementieren
4. ⏳ Admin-Dashboard für DSGVO-Anfragen erstellen
5. ⏳ Workflow für Anfragen-Verwaltung einrichten

---

**Stand:** Februar 2026
**Nächste Überprüfung:** Vor Produktions-Release
