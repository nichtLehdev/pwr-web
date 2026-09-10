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

#### 2. Eigene Daten exportieren (Art. 20 DSGVO)
- **Ort:** Einstellungen → Daten exportieren
- Lädt alle zur Person gespeicherten Daten als JSON herunter
- Technisch: `GET /api/users/<userId>/export` bzw. `api.users.exportData`

#### 3. Eigenes Konto löschen (Art. 17 DSGVO)
- **Ort:** Einstellungen → Gefahrenzone → Konto löschen
- Bestätigung durch Eingabe der eigenen E-Mail-Adresse
- Blockiert, solange Abhängigkeiten bestehen: aktive Mitgliedschaften (Team,
  Vorstand, Posaunenrat, Förderverein), selbst erstellte Inhalte oder
  Kursanmeldungen mit Rechnung (gesetzliche Aufbewahrung). Die Meldung nennt
  den Grund; solche Fälle brauchen Anonymisierung durch einen Admin.

#### 4. Tracking-Einstellungen ändern
- **Ort:** Einstellungen → Nutzungsstatistik
- Benutzer können ihre Einwilligung zur Datenerfassung ändern oder widerrufen

#### 5. Anmeldung ohne Benutzerkonto verwalten (Magic Link)
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

> Stand: 2026-09-10. Die früher hier als kritisch gelisteten Punkte
> (Benutzer-Datenexport, Konto-Löschung) sind inzwischen umgesetzt und stehen
> jetzt oben unter „Aktuelle Funktionen".

### 🟡 Wichtig - Sollte implementiert werden

#### 1. Kursanmeldungen-Export über Kursgrenzen hinweg
**Status:** ⚠️ Teilweise vorhanden

Pro Kurs gibt es den Teilnehmer-Export. Was fehlt, ist ein Export *aller*
Anmeldungen einer Person über alle Kurse hinweg. Für eine Auskunftsanfrage ist
das nicht blockierend — der Benutzer-Datenexport (siehe oben) enthält die
Anmeldungen bereits vollständig.

#### 2. Datenzugriff-Anfragen dokumentieren (Art. 15 DSGVO)
**Status:** ❌ Nicht implementiert

Es gibt kein Workflow-System, das eingegangene Anfragen und ihre Bearbeitung
protokolliert. Der Nachweis muss außerhalb der Anwendung geführt werden.

#### 3. Datenberichtigung (Art. 16 DSGVO)
**Status:** ⚠️ Teilweise vorhanden

Berichtigungen sind über das Dashboard möglich; ein strukturierter Workflow mit
Nachweis und Benachrichtigung fehlt. Änderungen an Benutzerdaten landen
allerdings im Audit-Log.

#### 4. Einschränkung der Verarbeitung (Art. 18 DSGVO)
**Status:** ❌ Nicht implementiert

Es gibt kein Flag, das die Verarbeitung einzelner Datensätze sperrt.

#### 5. Widerspruch gegen Verarbeitung (Art. 21 DSGVO)
**Status:** ⚠️ Teilweise vorhanden

Newsletter-Abmeldung und Tracking-Einstellung decken die beiden Fälle ab, in
denen überhaupt auf Einwilligung bzw. berechtigtem Interesse verarbeitet wird.
Eine zentrale Verwaltung von Widersprüchen gibt es nicht.

## Aktuelle Workarounds für DSGVO-Anfragen

### Recht auf Auskunft (Art. 15 DSGVO)

**Der Datenexport deckt das vollständig ab** — die frühere Sammelarbeit von
Hand ist nicht mehr nötig.

1. Benutzer-ID ermitteln: Dashboard → Benutzer → Suche nach E-Mail oder Name
2. `GET /api/users/<userId>/export` aufrufen (als angemeldeter Admin mit
   `USERS_MANAGE`; im Browser reicht der Aufruf der URL)
3. Die JSON-Datei enthält Profil, Kursanmeldungen mit Teilnehmerdaten,
   gespeicherte Teilnehmer, Newsletter-Status, Rechnungen und Seitenaufrufe
4. Antwort innerhalb von 30 Tagen, Bearbeitung dokumentieren

Benutzer können denselben Export selbst ziehen: Einstellungen → Daten
exportieren.

> Ein Knopf dafür auf der Admin-Benutzerseite fehlt noch (siehe „Empfohlene
> Implementierungen"); bis dahin die URL direkt aufrufen.

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

### Priorität 1

1. **Admin-Knopf „Daten exportieren" auf der Benutzerseite**
   Der Endpunkt kann das längst (`/api/users/[userId]/export` akzeptiert eine
   fremde `userId`, wenn die Berechtigung stimmt) — es fehlt nur der Knopf in
   `src/app/dashboard/users/[id]/page.tsx`. Bis dahin muss die URL von Hand
   aufgerufen werden.

2. **DSGVO-Anfragen-Verwaltung**
   Dashboard-Bereich, in dem eingegangene Anfragen samt Bearbeitung
   dokumentiert werden (Nachweispflicht).

### Priorität 2

3. **Kursanmeldungen und gespeicherte Teilnehmer auf der Benutzerseite**
   Beides steckt bereits im Export, ist im Dashboard aber nicht sichtbar.

4. **Verarbeitungseinschränkung (Art. 18 DSGVO)**
   Flag am Benutzerprofil, das die weitere Verarbeitung sperrt.

### Priorität 3

5. Automatisierte Verarbeitung von DSGVO-Anfragen
6. E-Mail-Vorlagen für DSGVO-Antworten
7. Audit-Log speziell für DSGVO-Anfragen

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
- [ ] Alle Daten exportieren über `/api/users/<userId>/export`
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
