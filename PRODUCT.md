# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Installierbare PWA mit handgeschriebenem Service Worker und Offline-Seite; Spiele laufen im Standalone-Modus mit Safe-Area-Unterstützung. Es gibt keine native App.)

## Users

**Hauptzielgruppe: aktive Chormitglieder.** Bläserinnen und Bläser sowie Chorleitungen aus den Posaunenchören der Evangelischen Kirche im Rheinland (13 Bezirke). Sie kommen mit einer konkreten Aufgabe: einen Termin nachsehen, sich zu einem Lehrgang anmelden (inkl. Anzahlung und Rechnung), die eigene Anmeldung verwalten, Materialien und Noten finden, das Rheinische Blechblatt lesen oder mit den Spielen üben. Viele nutzen die Seite unterwegs auf dem Handy, und die Altersspanne reicht von Jungbläser:innen bis zu langjährigen, älteren Mitgliedern.

Weitere bestätigte Zielgruppen, bei Designentscheidungen nachrangig:

- **Neue und Interessierte** (Eltern, Kinder und Jugendliche, Wiedereinsteiger:innen), die über „Mitmachen“ einen Chor in der Nähe, die Jungbläserarbeit oder Bildungsangebote finden.
- **Das Dashboard-Team:** Landesposaunenwarte, Regionalposaunenwarte, die Geschäftsstelle, Obleute und Ehrenamtliche. Sie pflegen Termine, Kurse, Beiträge, Ensembles, Personen, Newsletter, Rechnungen und Anmeldungen und geben Inhalte frei.
- **Förderer:** Mitglieder und mögliche Mitglieder des Fördervereins Rheinisches Posaunenwerk.

## Product Purpose

Die Plattform ist das Zuhause der evangelischen Bläserarbeit im Rheinland. Sie verbindet den öffentlichen Auftritt des Posaunenwerks (Termine, Lehrgänge, Aktuelles, Materialien, Struktur, Prävention, Förderverein) mit den Werkzeugen, mit denen der Verband seine Arbeit organisiert.

Erfolg bemisst sich an vier gleichrangigen Zielen:

1. **Lehrgangsanmeldungen:** mehr und reibungslosere Anmeldungen zu Kursen und Lehrgängen, von der Anmeldung über die Anzahlung bis zur Rechnung.
2. **Nachwuchs und Chorsuche:** mehr Menschen finden einen Posaunenchor und steigen in die Bläserarbeit ein, besonders Kinder und Jugendliche.
3. **Weniger Verwaltungsaufwand:** Geschäftsstelle und Ehrenamtliche sparen Zeit beim Pflegen, Freigeben und Kommunizieren.
4. **Sichtbarkeit und Bindung:** Aktuelles, Newsletter, Blechblatt, Spiele und Förderverein halten die Gemeinschaft über die Bezirke hinweg zusammen.

## Positioning

Die offizielle Plattform des Posaunenwerks der Evangelischen Kirche im Rheinland e.V. Andere Musikseiten können das nicht glaubwürdig nachahmen: Termine, Lehrgänge, Chorverzeichnis, Bezirksstruktur, Materialien des Verbands und die Lern-Spiele für Blechbläser kommen aus einer Hand und aus derselben Datenbank, gepflegt von den Menschen, die die Bläserarbeit tatsächlich tragen. Die Plattform ist zugleich Schaufenster und Arbeitsmittel des Verbands. Leitmotiv laut Startseite: „Gemeinsam Musik machen, Glauben leben“.

## Operating Context

- **Öffentliche Seite (Deutsch, `lang="de"`):** Start, Termine, Aktuelles, Mitmachen (Chor finden mit Karte, Aus- und Weiterbildung, Jungbläserarbeit, Ehrenamt), Materialien (Rheinisches Blechblatt, Literatur & CDs), Spiele, Über uns (Struktur & Geschichte, Vorstand, Posaunenwarte, Bezirke & Obleute, Auswahlchöre, Posaunenrat), Förderverein, Prävention, Newsletter, Suche, Kontakt, Impressum, Datenschutz, Lizenzen.
- **Konto-Bereich:** Registrierung, Login mit Zwei-Faktor-Authentifizierung, eigene Anmeldungen, Anmeldung per Link verwalten (`/anmeldung-verwalten`), Einstellungen.
- **Dashboard:** Inhaltspflege für alle Entitäten, Freigabe-Workflow (DRAFT → PENDING → APPROVED), Kursverwaltung mit Teilnehmenden, individuellen Anmeldefeldern, Preisoptionen, Anzahlungen, Rechnungen und Kurs-Mails, Newsletter, Medienbibliothek mit Freigabe, Startseiten-Karussell, Statistik, Audit-Log, Rollen und Rechte (hierarchische Rollen, Bezirks-Zuständigkeiten), Export/Import, Wartungsmodus, Social-Media-Export für Instagram.
- **Spiele:** Rhythmus, Noten lesen, Griffe (Ventile/Zugpositionen) und Notenwaage, kostenlos im Browser und offline nutzbar. Die Statistik liegt zuerst lokal und wird bei Anmeldung synchronisiert. Öffentliche Notensets gibt es auch.
- **Rituale und Kanäle:** Lehrgangssaison mit Anmeldefristen und Anzahlungen, Fördervereinstag, Rheinisches Blechblatt als Magazin, Newsletter mit Double-Opt-in, RSS-Feed für Aktuelles, Social Media (Facebook, Instagram, YouTube).
- **Umgebungen:** Die Produktion läuft auf mittwald. Eine Vorab-Umgebung zeigt ein Beta-Banner (`APP_ENV` ≠ `production`), auf ihr ist die Feedback-Seite aktiv.

## Capabilities and Constraints

- **Stack (bestehend):** Next.js 16 (App Router, Turbopack), TypeScript, tRPC, Prisma/PostgreSQL, Better Auth, Tailwind CSS 4, React Query. Tiptap für Rich-Text, Leaflet für Karten, Recharts für Statistiken, VexFlow (nur `vexflow/bravura`) für Notensatz.
- **Hell- und Dunkelmodus** werden beide unterstützt (Systemeinstellung oder manuelle Wahl).
- **DSGVO:** Tracking nur mit Einwilligung, Datenexport und Löschwege für Admins (siehe `docs/DSGVO-COMPLIANCE.md`).
- **Kinderschutz** ist Pflichtthema: Präventionsseite, Selbstverpflichtung und Zusatzerklärung für Minderjährige.
- **Rollen:** Landesposaunenwart (LPW) gibt alles frei, Regionalposaunenwart (RPW) die zugewiesenen Bezirke, Obleute erstellen Inhalte, die freigegeben werden müssen. Die Rechte sind feingranular und hierarchisch.
- **Fachbegriffe beibehalten:** Posaunenchor, Bläser:innen, Jungbläser, Lehrgang, Bezirk, Obleute, Posaunenwart (LPW/RPW), Posaunenrat, Auswahlchor, Bläserheft, Blechblatt, Förderverein.
- **Offen:** Die Anrede ist nicht festgelegt. Öffentliche Texte duzen meist („Finde einen Posaunenchor …“), einzelne Stellen siezen („für Ihren Posaunenchor“). Das ist noch zu entscheiden.

## Brand Commitments

Verbindlich sind nur diese Vorgaben, alles andere am Erscheinungsbild ist frei:

- **Logo:** `public/images/logo-horizontal.svg`, `logo-horizontal-dark.svg`, `logo-icon.svg`, `logo-icon-dark.svg`, `logo.png`, dazu App-Icons in `public/` (inkl. maskable).
- **Primärfarbe:** `#faa619` (Token `--color-primary` in `src/styles/globals.css`).
- **Fördervereinsfarbe:** `#78a8da` (Token `--color-foerderverein`). Sie kennzeichnet den Förderverein.
- **Name:** „Posaunenwerk Rheinland“. Die rechtliche Bezeichnung lautet „Posaunenwerk der Evangelischen Kirche im Rheinland e.V.“, der Förderverein heißt „Förderverein Rheinisches Posaunenwerk“.

## Evidence on Hand

- **Echte Organisationsdaten:** Anschrift, Telefon, E-Mail und Social-Media-Profile in `src/lib/structured-data.ts` (synchron mit dem Impressum).
- **Offizielle Dokumente** in `public/downloads/`: Satzung, Ehrenordnung, Aufnahmeantrag für Chöre, Arbeitshilfe Jungbläser, Leistungsstempel, Förderverein-Flyer, Selbstverpflichtung Kinderschutz, Zusatzerklärung Minderjährige.
- **Bilder** von Personen und Gremien in `public/images/` (team, vorstand, posaunenwarte, bezirke, auswahlchoere, blaeserhefte). Hinzu kommen hochgeladene Medien in der Datenbank mit Bildnachweisen.
- **Audio:** `public/audio/frankreich-2021-sample.mp3`.
- **Live-Inhalte:** Termine, Lehrgänge, Beiträge, Chöre, Bezirke und Personen stehen in der Datenbank.
- **Bestätigte Kennzahlen** (Wortlaut auf den Seiten, vom Nutzer als Inhalt bestätigt): annähernd 200 Posaunenchöre, über 2.000 aktive Bläserinnen und Bläser, über 140 Jahre Posaunenchorarbeit im Rheinland, 13 Bezirke, Förderverein seit 2008 (`src/app/ueber-uns/struktur/page.tsx`, `src/app/mitmachen/page.tsx`, `src/app/mitmachen/chor-finden/page.tsx`).
- **Fotos:** Lokal gibt es nicht genug echte Fotos für eine bildgeführte Gestaltung (Medienbibliothek der Dev-Umgebung plus Porträts in `public/images/`). Der Nutzer liefert Fotos nach, braucht dafür aber genaue Beschreibungen, was gewollt ist (Motiv, Ausschnitt, Format, Einsatzort).
- **Nicht vorhanden, darf nicht erfunden werden:** Testimonials, Wirkungsstatistiken und Zitate. `news-placeholder-*.jpg` und `profile-placeholder.jpg` sind Platzhalter, keine echten Fotos.

## Product Principles

1. **Chormitglieder zuerst.** Wer schon dabei ist, soll Termin, Lehrgang, Anmeldung oder Material ohne Umweg finden. Diese Aufgaben haben Vorrang vor Selbstdarstellung.
2. **Anmelden muss leicht sein.** Jeder Schritt vom Lehrgang zur bestätigten Anmeldung (samt Anzahlung und Rechnung) muss auch für ungeübte und ältere Menschen auf dem Handy klar und fehlertolerant sein.
3. **Die Tür für Neue offen halten.** Kinder, Eltern und Wiedereinsteiger:innen verstehen die Fachsprache des Verbands nicht automatisch. Einstiege erklären statt voraussetzen.
4. **Ehrenamt entlasten.** Jede Dashboard-Funktion soll Aufwand sparen und Fehler verhindern, denn die Pflegenden haben wenig Zeit und unterschiedliche technische Erfahrung.
5. **Eine Gemeinschaft, viele Bezirke.** Die Bezirke, Chöre und Menschen sollen sichtbar sein. Die Plattform verbindet, statt nur zu verwalten.

## Accessibility & Inclusion

- **Pflicht:** Barrierefreiheit nach WCAG bzw. BITV. Die genaue Konformitätsstufe ist nicht benannt. BITV 2.0 verweist über EN 301 549 auf WCAG 2.1 AA, das gilt deshalb bis zur Klärung als Mindestmaß.
- Die Nutzenden sind von Kindern bis zu Senior:innen sehr gemischt. Darum sind gut lesbare Schrift, ausreichende Kontraste in Hell- und Dunkelmodus, große Touch-Ziele und klare Fehlermeldungen wichtig.
- Die Spiele setzen auf Hören, Timing und Notenlesen. Sie brauchen Alternativen, wo das möglich ist (z. B. visuelles Metronom), und müssen reduzierte Bewegung respektieren.
