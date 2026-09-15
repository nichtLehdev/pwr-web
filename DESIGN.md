---
name: Posaunenwerk Rheinland
description: Das Programmheft – weißes Programmpapier, orange Druckflächen mit tiefschwarzer Schrift, Archivo in zwei Breiten, Tabellensatz mit Haarlinien.
colors:
  primary: "#faa619"
  primary-ink: "#a55800"
  foerderverein: "#78a8da"
  ink: "#1c1d1f"
  paper: "#ffffff"
  slate: "#58595b"
  rule: "#d4d4d1"
  night: "#141517"
  night-raised: "#1d1f22"
  night-rule: "#34373c"
  night-text: "#ecebe8"
  night-muted: "#a6a8ad"
  cancelled: "#b91c1c"
  cancelled-night: "#f87171"
  district-1: "#3b82f6"
  district-2: "#10b981"
  district-3: "#8b5cf6"
  district-4: "#f59e0b"
  district-5: "#ef4444"
  district-6: "#06b6d4"
  district-7: "#ec4899"
  district-8: "#14b8a6"
  district-9: "#6366f1"
  district-10: "#84cc16"
  district-11: "#f97316"
  district-12: "#a855f7"
  district-13: "#22d3ee"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 6vw, 5.75rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 68"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)"
    fontWeight: 800
    lineHeight: 0.95
    fontVariation: "'wdth' 68"
  programm-head:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1
    fontVariation: "'wdth' 68"
  list-head:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1
    fontVariation: "'wdth' 68"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.1
    fontVariation: "'wdth' 68"
  date-numeral:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 68"
  lead:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 2.1vw, 1.875rem)"
    fontWeight: 500
    lineHeight: 1.375
    fontVariation: "'wdth' 84"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
    fontVariation: "'wdth' 84"
  button:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1
    fontVariation: "'wdth' 84"
rounded:
  none: "0px"
  avatar: "9999px"
spacing:
  sheet-mobile: "1.25rem"
  sheet-tablet: "2.5rem"
  sheet-desktop: "3.5rem"
  sheet-max: "100rem"
  row-y: "1rem"
  section-y: "4rem"
  section-y-md: "6rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  button-register:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "40px"
  button-register-hover:
    backgroundColor: "{colors.paper}"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    size: "44px"
  button-icon-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  date-tile-open:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    typography: "{typography.date-numeral}"
    rounded: "{rounded.none}"
    padding: "8px 8px 10px"
    width: "80px"
  way-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "0 4px"
    height: "56px"
  way-row-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
  nav-link:
    textColor: "{colors.slate}"
    typography: "{typography.button}"
    height: "44px"
  nav-link-active:
    textColor: "{colors.ink}"
  menu-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "4px 0"
  menu-panel-item-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
  banner-info:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    padding: "8px 16px"
---

# Design System: Posaunenwerk Rheinland

## Overview

**Creative North Star: "Das Programmheft"**

Die öffentliche Website ist gesetzt wie das Programmheft eines Bläsertags: weißes Programmpapier, volle orange Druckflächen mit tiefschwarzer Schrift, Termine im Tabellensatz mit festen Datumsspalten und 1px-Haarlinien. Die Schrift ist eine Familie in zwei Breiten: Archivo schmal und extrafett für Titel, Daten und Köpfe (ein Echo der Logo-Wortmarke), normal breit für Lesetext. Die Wirkung soll lebendig, verlässlich und unverwechselbar „unser Verband“ sein, nicht kirchlich-altbacken, agentur-schick, verspielt-kindlich oder behördlich-nüchtern.

Die Tiefe entsteht aus Druckmitteln, nicht aus Licht: Linien in zwei Stärken (2px Tinte als Kopf- und Abschnittsstrich, 1px Haarlinie zwischen Zeilen), Farbflächen und Anschnitt. Inhalte stehen in Zeilen und Spalten statt in Karten; Wege sind volle Zeilen, die sich beim Zeigen von links orange füllen. Der Dunkelmodus („Nachtdruck“) setzt dasselbe Heft auf einen fast schwarzen Grund; Orange bleibt Druckfarbe.

Das Programmheft gilt für die Startseite, die geteilte Chrome (Navigation, Beta-Banner, Fußzeile) und den Kopf aller Innenseiten (`PublicPage`); /mitmachen ist die Referenz-Innenseite. Die Bausteine liegen in `src/app/_components/programmheft/`. Die übrigen Abschnitte der Innenseiten sowie EventCard, CourseCard und PostCard tragen noch die alte Welt, stehen übergangsweise schon in Archivo und werden seitengruppenweise übertragen; sie sind nicht Teil dieses Systems. `ui/card`, `ui/badge` und `ui/alert` gehören dem Dashboard, die öffentliche Seite nutzt Kasten (Panel), Etikett (Tag) und Hinweis (Note). Das Dashboard bleibt vorerst bei Inter und seinen eigenen Tokens.

**Key Characteristics:**
- Papier, Tinte und eine Druckfarbe (Orange); Blau nur für den Förderverein.
- Archivo über die Breitenachse: schmal-fett (`wdth` 68) spricht, halbschmal (`wdth` 84) etikettiert, normal liest.
- Tabellensatz: feste Datumsslots mit Tabellenziffern, Haarlinien zwischen Zeilen, 2px-Striche unter Köpfen.
- Keine Karten, Schatten, Rundungen, Icon-Kreise oder Farbstreifen.
- Wege als volle Zeilen mit Pfeil, die sich bei Hover/Fokus von links orange füllen.

## Colors

Eine Druckfarbe auf Papier und Tinte, in zwei Druckgängen (Tag und Nacht).

### Primary
- **Druckorange** (#faa619): Die verbindliche Markenfarbe als volle Fläche: Titelblatt, Schlussaufruf („Lust auf Posaunenchor?“, „Noch Fragen?“), Datumsfeld bei offener Anmeldung, Frist-Hervorhebung ≤ 7 Tage, Hinweis „wichtig“ (z. B. Kündigungsfrist), Zeilenfüllung bei Hover/Fokus, Hover in Menüs, Beta-Banner, Aktiv-Unterstrich der Navigation, Textmarkierung. Auf Orange steht immer Tinte. Im Nachtdruck ist Druckorange auch Textfarbe (Links, Status „Anmeldung offen“, Fußzeilenköpfe) sowie Fokusring.
- **Messing-Tinte** (#a55800): Orange als Text auf hellem Grund – Links wie „Alle News“, Status „Anmeldung offen“, Caret. Nie als Fläche.

### Secondary
- **Fördervereinsblau** (#78a8da): Markenfarbe des Fördervereins, ausschließlich für Förderverein-Inhalte reserviert: als volle Druckfläche eines Förderverein-Abschnitts (Tinte darauf, ≈ 6,8:1, auch im Nachtdruck unverändert blau), als Satzstrich im Seitenkopf der Förderverein-Seite und als Zeilenfüllung von Wegzeilen, die zum Förderverein führen. Nie als Textfarbe auf Papier (2,5:1). Auf der Startseite nicht im Einsatz.

### Neutral
- **Tinte** (#1c1d1f): Haupttext, Köpfe, 2px-Striche, primäre Schaltflächen, Fokusring auf Papier und Orange, Grund der Fußzeile und leeres Bildfeld.
- **Papier** (#ffffff): Seitengrund und Text auf Tinte.
- **Schiefer** (#58595b): Sekundärtext, Metadaten, inaktive Navigationslinks.
- **Haarlinie** (#d4d4d1): 1px-Trennlinien zwischen Programm- und Registerzeilen, Lade-Platzhalter.
- **Nachtgrund** (#141517), **Nacht erhöht** (#1d1f22), **Nachtlinie** (#34373c), **Nachtschrift** (#ecebe8), **Nacht gedämpft** (#a6a8ad): die Entsprechungen im Dunkelmodus für Grund, Menüs/Fußzeile/Bildfeld, Linien, Text und Sekundärtext.
- **Abgesagt** (#b91c1c, Nacht #f87171): nur der Status „Abgesagt“ zusammen mit durchgestrichenem Titel.

### Bezirksfarben
- **Bezirk 01–13** (`district-1` … `district-13`): markieren ausschließlich einen Bezirk, als 10px-Quadrat vor dem Text „Bezirk NN · Name“. Termine ohne Bezirk tragen den Text „Bezirksübergreifend“ ohne Marke.

### Named Rules
**The Ink-on-Orange Rule.** Auf Orange steht immer Tinte (#1c1d1f), nie Weiß. Orange als Text auf hellem Grund ist immer Messing-Tinte; nur auf dem Nachtgrund darf Druckorange selbst Text sein.

**The Quiet Open Rule.** Offene Anmeldung wird so leise markiert, dass die Seite auch dann nicht orange wird, wenn jeder Kurs offen ist: oranges Datumsfeld + Statuszeile „Anmeldung offen“ + Outline-Schaltfläche „Anmelden“; eine orange Hinterlegung nur für den Countdown ab 7 Tagen vor Fristende. Keine vollflächig orangen Zeilen.

**The District Marker Rule.** Bezirksfarben sind Kennzeichen, keine Gestaltung: kleines Quadrat plus Bezirkstext, nie als Abschnittsfarbe, Fläche, Rahmen oder Schmuck.

**The Förderverein Blue Rule.** Blau erscheint nur, wo der Förderverein spricht.

**The One Field Rule.** Neben Titelblatt und Schlussaufruf trägt eine Seite höchstens eine weitere volle Farbfläche: die blaue Förderverein-Fläche, und nur für einen Abschnitt, in dem der Förderverein spricht. Eingeführt auf Wunsch des Eigentümers (2026-09-16), weil /mitmachen ohne Farbfläche „almost too minimalistic“ wirkte; Fotos lehnte er für diese Seite ab.

## Typography

**Display Font:** Archivo, variabel mit Breitenachse (mit ui-sans-serif, system-ui)
**Body Font:** Archivo in normaler Breite
**Label Font:** Archivo halbschmal (`wdth` 84)

**Character:** Eine Familie, zwei Stimmen: die schmal-fette Stimme ruft wie ein Plakatkopf und echot die Logo-Wortmarke, die normale Breite liest sich ruhig und amtlich-freundlich. Datumsziffern sind tabellarisch, damit die Spalte steht.

### Hierarchy
- **Display** (800, clamp(2.75rem, 6vw, 5.75rem), 0.9, `wdth` 68, −0.01em): Titel auf dem Titelblatt.
- **Headline** (800, clamp(2.25rem, 4.5vw, 3.5rem), 0.95, `wdth` 68): Abschnittsköpfe („Aktuelles“, Register); der Schlussaufruf nutzt dieselbe Stimme größer (clamp(2.5rem, 6vw, 5.25rem), 0.9).
- **Programmkopf** (800, 2.25rem, 1, `wdth` 68): Kopf einer Programmspalte, mit 2px-Tintenstrich darunter.
- **Listenkopf** (800, 1.75rem, 1, `wdth` 68): Kopf einer Registerliste; Fußzeilenköpfe gleiche Stimme in 1.5rem.
- **Title** (700, 1.5rem, 1.1, `wdth` 68): Zeilentitel in Programm, Register und Wegzeilen (1.375–1.5rem); Beitragstitel 1.75rem / 1.05.
- **Datumsziffer** (800, 2.75rem, 1, `wdth` 68, Tabellenziffern): Tag im Datumsslot; darunter der Monat halbschmal 600, 0.875rem, Versalien mit 0.06em.
- **Lead** (500, clamp(1.25rem, 2.1vw, 1.875rem), snug, `wdth` 84, max. 26ch): Leitsatz unter dem Titel.
- **Body** (400, 0.9375–1.125rem, 1.5–1.625, normale Breite): Zeit/Ort-Zeilen, Beschreibungen, Auszüge (max. 60ch).
- **Meta** (600, 0.875rem, `wdth` 84): Art, Bezirk, Datum, Status – steht unter dem Titel.
- **Button** (600, 1–1.125rem, `wdth` 84): Schaltflächen und Navigationslinks (1.0625rem).

### Named Rules
**The Two Widths Rule.** Titel, Daten und Köpfe sind schmal-fett; Etiketten und Schaltflächen halbschmal; Lesetext normal breit. Keine zweite Schriftfamilie auf den Programmheft-Flächen.

**The Metadata Below Rule.** Keine Kicker- oder Eyebrow-Zeilen über Überschriften. Art, Bezirk, Datum und Status stehen unter dem Titel.

**The Condensed Head Rule.** Abschnitts- und Listenköpfe sprechen in der schmal-extrafetten Stimme, nicht in gesperrten Versalien. Versalien mit Sperrung bleiben dem Monatskürzel im Datumsslot vorbehalten.

## Layout

Das Blatt (`sheet`) ist maximal 100rem breit, zentriert, mit Innenrand 1.25rem (mobil), 2.5rem (ab 40rem) und 3.5rem (ab 64rem). Größere Kompositionen folgen einem 12-Spalten-Raster ab 64rem: der erste Bildschirm teilt sich 7/12 Titelblatt und 5/12 Programmspalte und füllt mindestens min(56rem, Viewport minus Kopf); Register 8/4, Schlussaufruf 6/12 Kopf und 5/12 Text ab Spalte 8. Mobil stapelt sich alles einspaltig; das Titelblatt löst sich in Titel, dann Programm, dann Foto auf, damit offene Anmeldungen direkt unter dem Titel stehen.

Innenseiten: Der Seitenkopf teilt sich 7/12 Titel und 5/12 Leitsatz (unten bündig); ein längerer Vorspann steht stattdessen in voller Zeilenlänge (max. 65ch) unter dem Titel. Abschnitte teilen sich ab 64rem 4/12 Kopf und Einleitung und 8/12 Inhalt (`Split`); aufeinanderfolgende Abschnitte wechseln die Seite des Kopfes wie linke und rechte Heftseiten (links, rechts, links …). Im DOM steht der Kopf immer zuerst, mobil über dem Inhalt; zu lange Wörter im 4/12-Kopf brechen an einem gesetzten weichen Trennstrich („Einstiegs-/möglichkeiten“), nie per automatischer Silbentrennung. Fließtext läuft höchstens 65ch; Tabellen, Hinweise, Merkpunkte und Weglisten füllen die ganze Inhaltsspalte, damit die rechte Kante steht. Eine Wegliste direkt unter dem Seitenkopf beginnt ohne eigene Luft und ohne zweiten Strich (`PageSection flush="top"`).

Rhythmus: Abschnitte 4rem vertikal, ab 48rem 6rem. Zeilen 1rem vertikal mit 1–1.5rem Spaltenabstand; Wegzeilen mindestens 3.5rem hoch. Mehrspaltige Beitragslisten trennen Spalten mit 1px-Haarlinien und 2.5rem Innenabstand statt mit Lücken zwischen Kästen. Die Programmspalte zeigt im ersten Bildschirm höchstens drei Zeilen; ein fehlender Platz wird als gestalteter leerer Programmplatz (kurzer Strich + „Weitere Termine folgen.“) gesetzt. Klickziele sind mindestens 44px hoch.

Bewegung: Zeilenfüllung 280ms `cubic-bezier(0.16, 1, 0.3, 1)` von links; Titelblatt-Foto überblendet in 800ms, wechselt alle 7s nur ohne Hover/Fokus, ist anhaltbar und steht bei `prefers-reduced-motion` still.

## Elevation & Depth

Das System ist vollständig flach. Es gibt keine Schlagschatten. Trennung entsteht durch Linien und Flächen: 2px Tinte unter Köpfen, über Weglisten, zwischen Abschnitten und unter der fixierten Navigation; Abschnittsstriche und der Abschluss des Seitenkopfs laufen vollbreit (Nacht: Nachtlinie), Kopf- und Gruppenstriche stehen im Satzspiegel (Nacht: Nachtschrift); 1px Haarlinien zwischen Zeilen; Farbflächen (Orange, Tinte) für Gewicht. Aufklappende Menüs liegen ohne Schatten auf dem Inhalt und grenzen sich mit einem 2px-Tintenrahmen ab (Nacht: 2px Nachtlinie auf Nacht erhöht). Die Navigationsunterkante ist technisch ein `inset`-Schatten von 2px ohne Unschärfe; er wirkt und zählt als Linie.

### Named Rules
**The Printed Depth Rule.** Tiefe kommt aus Linie, Fläche und Anschnitt, nie aus Licht. Braucht etwas Abstand zum Inhalt darunter, bekommt es einen 2px-Tintenrahmen, keinen Schatten.

## Shapes

Alles ist rechtwinklig (0px): Schaltflächen, Datumsfelder, Menüs, Bildfelder, Bezirksquadrate, Fokusringe. Einzige Ausnahme sind runde Avatar-Fotos bzw. Initialen im Benutzermenü. Linien kommen in zwei Stärken (2px Tinte, 1px Haarlinie); ein 6px × 96px Satzstrich trennt Titel und Leitsatz auf dem Titelblatt (Tinte auf Orange) und steht unter dem Vereinsnamen in der Fußzeile (Orange auf Tinte). Fotos laufen angeschnitten bis an die Kanten ihrer Fläche; Beitragsbilder stehen im Format 3:2, Titelblattfotos mobil 4:3. Fokus ist ein 3px-Umriss mit 2px Abstand (Tinte auf Papier und Orange, Druckorange auf Tinte und Nacht); ganze Zeilen zeigen den Fokus als 3px-Umriss nach innen.

## Components

### Buttons
Kräftig und gedruckt, rechteckige Farbfelder ohne Rundung.
- **Shape:** rechtwinklig (0px).
- **Primary:** Tinte mit Papierschrift, halbschmal 600, 48px hoch, 24px seitlich, Pfeil rechts. Hover kehrt um auf Papier mit Tinte. Login in der Navigation: 44px hoch, Hover Orange mit Tinte; im Nachtdruck Orange mit Tinte, Hover Papier.
- **Register (Outline):** 2px-Tintenrahmen, transparent, Tintenschrift, 40px hoch, 16px seitlich, Pfeil (extern: Pfeil schräg + Hinweis für Screenreader). Hover füllt Papier (sichtbar innerhalb der orange gefüllten Zeile). Nacht: Rahmen und Schrift Nachtschrift.
- **Icon-Schaltflächen:** 44px Quadrat, transparent; Hover invertiert auf Tinte mit Papier (Nacht: Nachtschrift mit Nachtgrund). Auf dem Titelblatt dieselbe Umkehr für die Bildstrecken-Steuerung.
- **Textlinks mit Pfeil:** halbschmal 600, Messing-Tinte (Nacht Orange), Unterstreichung mit 4px Abstand bei Hover.
- **Primary auf Papier** (`ButtonLink`): Tinte mit Papierschrift, mindestens 48px hoch; Hover Orange mit Tinte. Im Nachtdruck Orange mit Tinte, Hover Papier. Auf Orange (`surface="orange"`) kehrt der Hover wie auf dem Titelblatt auf Papier um.
- **Outline** (`ButtonLink variant="outline"`): 2px-Rahmen in Schriftfarbe, Hover füllt mit Schriftfarbe; auf Orange immer Tinte. Umrandet sind nur Aktionen, nie Etiketten.
- **Textlink im Fließtext** (`.link-ink`): Messing-Tinte 600 (Nacht Orange), immer 1px unterstrichen mit 4px Abstand, Hover 2px; auf Orange und auf Druckflächen Tinte. Pfeil-Icons folgen dem Ziel: Pfeil intern, schräger Pfeil extern, Brief für E-Mail, Download für Dateien (mit Screenreader-Hinweis zu Dateityp und neuem Tab).

### Programmzeile (Signature)
Termine als Tabellensatz. Links der Datumsslot (64px, ab 40rem 80px): Tag als schmal-extrafette Tabellenziffer, darunter Monat (Jahr nur, wenn nicht das laufende). Rechts Titel (Title), darunter Meta-Zeile (Art · Bezirksmarke), Zeit · Ort in Body, dann Status. Ganz rechts ein Pfeil; die ganze Zeile ist per Link klickbar. 1px-Haarlinie unten.
- **Offene Anmeldung:** Datumsslot als orange Fläche (8px Innenrand), Statuszeile „Anmeldung offen“ in Messing-Tinte, Frist als Text; ab 7 Tagen vor Ende orange hinterlegt mit Tinte; Plätze als Text; Outline-Schaltfläche „Anmelden“.
- **Geschlossen / noch nicht offen:** Status in Schiefer, Datumsslot ohne Fläche.
- **Abgesagt:** Titel durchgestrichen in Schiefer, Status „Abgesagt“ in Rot.
- **Hover/Fokus:** Zeilenfüllung (siehe Wegzeile), alle Texte werden Tinte.

### Wegzeile
Wege als volle Zeile auf Papier: Title-Stimme, mindestens 56px hoch, Pfeil rechts, 1px-Haarlinie unten; Gruppen beginnen mit einem 2px-Tintenstrich. Bei Hover (nur Zeigegeräte) und Fokus füllt sich die Zeile in 280ms von links mit Druckorange, alles darauf wird Tinte. Registerzeilen sind Wegzeilen mit Beschreibung in Body unter dem Titel, zweispaltig ab 48rem.

### Meldung (Beitragsspalte)
Beiträge als Druckspalten, nicht als Karten: Bildfeld 3:2 auf Tinte (Nacht: Nacht erhöht), darunter Titel, Meta-Zeile (Datum, Kategorie, Bezirksmarke, „Angepinnt“) und Auszug (max. 4 Zeilen, 60ch). Spalten ab 64rem mit 1px-Haarlinie getrennt. Hover unterstreicht den Titel mit 3px Druckorange. Ohne Titelbild zeigt das Bildfeld das helle Logo auf Tinte, damit die Spalten gleich aufgebaut bleiben.

### Titelblatt
Volle orange Fläche mit Tintenschrift: Display-Titel, Satzstrich, Lead, Primary-Schaltfläche. Darüber dem Foto eine Zeile mit Bildnachweis und Bildstrecken-Steuerung (Zurück, „n / m“ in Tabellenziffern, Weiter, Anhalten); das Foto läuft bis an die Kanten.

### Schlussaufruf
Volle orange Fläche als bewusster Blickfang am Seitenende – vom Eigentümer ausdrücklich so gewünscht; nicht auf Papier verlegen. Headline-Stimme groß (clamp(2.5rem, 6vw, 5.25rem), 0.9) links (6/12), rechts ab Spalte 8 Text in Body (max. 40ch) und die Primary-Schaltfläche, z. B. „Mehr erfahren“; weitere Aktionen stehen als Outline daneben. Tinte auf Orange, im Nachtdruck unverändert Orange. Wiederverwendbar als `ClosingCall`, höchstens einmal pro Seite und immer als letzter Abschnitt vor der Fußzeile (Startseite: „Lust auf Posaunenchor?“, Mitmachen: „Noch Fragen?“).

### Seitenkopf (Innenseite)
`PublicPage` setzt jede Innenseite mit `PageHead` auf Papier: Brotkrumen halbschmal 600 in Schiefer (aktuelle Seite Tinte, Klickziele 44px, „/“ als Trenner), darunter genau ein `<h1>` in Display-Größe (ab 44 Zeichen und bei kompakten Köpfen in Headline-Größe), ein 6px × 96px Satzstrich in Tinte (Nacht: Nachtschrift; Förderverein: Fördervereinsblau) und rechts der Leitsatz in der Lead-Stimme (clamp(1.25rem, 1.9vw, 1.625rem), max. 34ch). Abschluss ist ein vollbreiter 2px-Strich. Keine Kicker darüber, keine farbigen Kopfbänder, keine zweite klebende Titelleiste.
- **Kompakt** (Kurs, Termin, Anmeldung, Ensemble): weniger Luft, Titel in Headline-Größe; ein abweichender Kurzname („Anmeldung“) steht halbschmal unter dem `<h1>`. Rechts oben bündig die Meta-Spalte: Art, Dauer, Ort und Bezirksmarke als halbschmaler Schiefer-Text, Zustände als Etiketten, Aktionen („Bearbeiten“, „Teilen“) als 40px-Outline, darunter Zeilen mit Haarlinie für Datum, Ort, Plätze und Fristen mit Schiefer-Icons.

### Abschnitt und Druckfläche
`PageSection` ist ein Abschnitt auf Papier im Satzspiegel, 4rem/6rem vertikal, optional mit vollbreitem 2px-Strich darüber; `Split` setzt darin Kopf (4/12) und Inhalt (8/12) und wechselt mit `side="right"` die Seite des Kopfes. Mit `surface="foerderverein"` wird er zur vollen Druckfläche in Fördervereinsblau (`.print-field`): alle Schrift, Kopf- und Gruppenstriche in Tinte, Haarlinien Tinte 30 %, Wegzeilen füllen sich papierweiß, Fokus in Tinte, im Nachtdruck unverändert. Ein Satzstrich auf der Fläche steht in Tinte.

### Merkpunkte
`PointList` ersetzt Icon-Kacheln: Titel in der Title-Stimme, Text in Body-Schiefer darunter, 2px-Tintenstrich über der Liste, 1px-Haarlinien zwischen Zeilen und Spalten. Zwei Spalten ab 48rem für Gründe und Aufgaben, drei ab 40rem für kurze Fakten (z. B. „Nur 36 € / Jahr“ – ohne Großzahl-Inszenierung).

### Beträge (Tabellensatz)
`ValueTable` für Beiträge und Kennwerte: Bezeichnung links in Body 1.125rem, Wert rechtsbündig schmal-extrafett 1.75rem mit Tabellenziffern, Haarlinien zwischen den Zeilen, 2px-Tintenstrich darüber. Beträge nie in Orange.

### Personenzeile
`PersonRow` in `PersonList` (1–4 Spalten mit 2.5rem Abstand): rundes 56px-Foto (einzige Rundung neben dem Avatar), Name in der Title-Stimme (1.375rem), Amt in Body-Schiefer, „E-Mail senden“ als halbschmaler Textlink mit Brief-Icon (44px Klickziel, Name für Screenreader), Bildnachweis 0.875rem darunter; 1px-Haarlinie unten.

### Etikett
`Tag` nur für Zustände: gefüllt, rechteckig, halbschmal 600 0.875rem, keine Versalien, keine Sperrung. Töne: Tinte (auch auf Orange, z. B. „Beta“), invers (Tinte; Nacht Nachtschrift – „Vergangen“, „Ausgebucht“, „Demnächst“), Orange mit Tinte („Nur Warteliste“, „Mitspielen möglich!“) und Rot nur für „Abgesagt“.

### Hinweis
`Note` statt Alert-Box mit Seitenstreifen: `important` als orange Druckfläche mit Tinte für Fristen („Hinweis: … bis zum 30. November …“), `error` mit 2px-Rahmen und Kopf in Rot, `info` mit 2px-Tintenrahmen. Ein gewöhnlicher Zusatz (z. B. „Ehrungen“) ist kein Hinweis, sondern eine Gruppe mit Listenkopf.

### Kasten
`Panel` für einen Block, der sich vom Satz abheben muss (z. B. „Im Schadensfall“ mit Unterlagenliste und Schaltfläche): 2px-Tintenrahmen auf Papier, im Nachtdruck 2px Nachtschrift auf Nachtgrund, 1.5–2rem Innenrand. Höchstens ein Kasten pro Seite.
### Navigation
Fixierte Leiste auf Papier (Nacht: Nachtgrund), 64px / ab 64rem 80px hoch, 2px-Tintenlinie unten. Links halbschmal 600, 1.0625rem, Schiefer; Hover Tinte mit 3px-Tintenunterstrich; aktiv Tinte mit 3px-Orange-Unterstrich. Aufklappmenüs und Benutzermenü: Papier mit 2px-Tintenrahmen, Einträge 12px/16px, Hover Orange mit Tinte, aktueller Eintrag mit 8px-Quadrat in Tinte (Nacht Orange). Mobil: Vollbild-Liste unter der Leiste, Zeilen mit Haarlinien, 1.25rem halbschmal, Untermenüs über eine 64px breite Aufklappzelle mit Haarlinie links, Hover Orange.

### Fußzeile
Tintengrund (Nacht: Nacht erhöht) mit Papierschrift: Vereinsname in schmal-extrafetter Stimme, orangener Satzstrich, vier Spalten mit orangen Listenköpfen über einer hellen 1px-Linie (Papier 20 %), Links in Papier 85 %, Hover Orange mit Unterstreichung. Social-Icons als 44px-Quadrate, Hover Orange mit Tinte. Rechtszeile unter einer 1px-Linie (Papier 15 %) in 0.875rem.

### Banner
Volle Druckfläche über der Navigation, Info-Variante Orange mit Tinte, 0.875rem Text mit unterstrichenem Link, 44px Schließen-Schaltfläche, Hover 15 % Schriftfarbe. Das Etikett („Beta“) ist ein Tinten-Tag ohne Sperrung und Versalien. Warnung und Wartung stehen als Tintenfläche mit Papierschrift (Nacht: Nachtschrift-Fläche mit Nachtgrund-Schrift) und orangem Etikett; eine grüne Erfolgs-Variante gibt es nicht.

## Do's and Don'ts

### Do:
- **Do** setze auf Orange immer Tinte (#1c1d1f) und nutze Messing-Tinte (#a55800) für orangen Text auf Papier; im Nachtdruck ist Druckorange Textfarbe.
- **Do** markiere offene Anmeldung mit orangem Datumsfeld, Statuszeile „Anmeldung offen“ und Outline-Schaltfläche „Anmelden“; orange Hinterlegung nur für den Countdown ab 7 Tagen.
- **Do** kennzeichne Bezirke mit 10px-Quadrat plus „Bezirk NN · Name“ und schreibe „Bezirksübergreifend“ als Text.
- **Do** trenne mit Linien: 2px Tinte unter Köpfen und über Weglisten, 1px Haarlinie zwischen Zeilen.
- **Do** setze Wege als volle Wegzeilen auf Papier mit Pfeil und Orange-Füllung bei Hover/Fokus; der Schlussaufruf „Lust auf Posaunenchor?“ steht bewusst auf voller oranger Fläche (Blickfang, vom Eigentümer gewünscht).
- **Do** zeige Beiträge ohne Titelbild mit dem hellen Logo auf dem Tinten-Bildfeld.
- **Do** halte WCAG 2.1 AA in Hell- und Dunkelmodus ein: Kontrast ≥ 4,5:1, 44px Klickziele, sichtbarer 3px-Fokus, anhaltbare Bildstrecke und `prefers-reduced-motion`.
- **Do** reserviere Fördervereinsblau (#78a8da) für Förderverein-Inhalte; wo der Förderverein einen ganzen Abschnitt spricht, darf er eine volle blaue Druckfläche mit Tinte bekommen.
- **Do** setze jede Innenseite mit `PublicPage`: Papierkopf, genau ein `<h1>`, vollbreiter Abschlussstrich.
- **Do** setze Art, Dauer, Ort und Bezirk als Meta-Text; Etiketten nur für Zustände, Rahmen nur für Aktionen.
- **Do** beende eine Seite höchstens mit einem Schlussaufruf, und dann als letzten Abschnitt.

### Don't:
- **Don't** Karten, Schlagschatten oder Rundungen verwenden (Ausnahme: runde Avatar-Fotos); schwebende Menüs trennen sich mit 2px-Tintenrahmen.
- **Don't** Icon-Kreise oder farbige Seiten- oder Kopfstreifen einsetzen; volle orange Flächen nur als bewusster Blickfang (Titelblatt, Schlussaufruf), nicht als Dekor für beliebige Abschnitte; dazu höchstens eine blaue Förderverein-Fläche pro Seite (One Field Rule).
- **Don't** ganze Zeilen dauerhaft orange füllen, um offene Anmeldungen zu markieren – wären alle Kurse offen, wäre die Seite orange.
- **Don't** Bezirksfarben als Dekoration, Fläche oder Abschnittsfarbe nutzen.
- **Don't** Kicker- oder Eyebrow-Labels über Überschriften setzen; Metadaten gehören unter den Titel.
- **Don't** Abschnitts- oder Listenköpfe in gesperrten Versalien setzen; sie sprechen schmal-extrafett.
- **Don't** Weiß auf Orange oder Druckorange als Text auf Papier setzen.
- **Don't** Seitenköpfe in Bezirksfarben oder Orange einfärben oder eine zweite Titelleiste einblenden.
- **Don't** mehr als einen Kasten pro Seite setzen oder Etiketten wie Schaltflächen umranden.
- **Don't** Fördervereinsblau als Text auf Papier oder für Inhalte außerhalb des Fördervereins verwenden.
