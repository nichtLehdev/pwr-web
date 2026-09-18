/**
 * Einheitlicher Fokus-Ring für alle interaktiven Spiel-Elemente (nur
 * Tastatur-Fokus).
 *
 * Tinte statt Druckorange: Orange ist im Heft eine Fläche, keine Linie — und
 * als Ring auf Papier ist es zudem zu schwach. Die öffentlichen Seiten führen
 * denselben Ring über die Klasse `.programm`.
 */
export const GAME_FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper dark:focus-visible:ring-night-text dark:focus-visible:ring-offset-night";
