/**
 * Höchstlänge der Beschreibung von Terminen und Kursen, Markdown-Auszeichnung zählt mit.
 * Eigene Datei, damit Formulare nicht `marked` mitziehen (nicht tree-shakebar).
 */
export const MAX_DESCRIPTION_LENGTH = 10000;
