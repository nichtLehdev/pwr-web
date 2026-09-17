/**
 * Höchstlänge der gespeicherten Beschreibung von Terminen und Kursen.
 *
 * Gespeichert wird Markdown, die Auszeichnung zählt also mit: Ein Link kostet
 * rund 30 Zeichen mehr als sein Text, eine Überschrift vier, fett und kursiv
 * je zwei bis vier. Gemessen am Bestand ist das reichlich — die längste
 * Beschreibung in der Datenbank hat 1068 Zeichen, gut ein Zehntel davon.
 *
 * Termine hatten bisher 5000, Kurse 10.000 Zeichen. Zwei Grenzen für denselben
 * Text in derselben Schreibfläche sind nicht zu erklären, deshalb gilt jetzt
 * für beide dieselbe.
 *
 * Eigene Datei, weil die Formulare diese Zahl brauchen, aber nicht die
 * Markdown-Bibliothek: `description-html.ts` zieht `marked` mit, und `marked`
 * erklärt sich nicht als nebenwirkungsfrei — der Packer könnte es also nicht
 * wieder herauslösen.
 */
export const MAX_DESCRIPTION_LENGTH = 10000;
