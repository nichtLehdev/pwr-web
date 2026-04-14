/**
 * Desktop: Ziffern 1–9, dann 0; 11./12. Antwort über die Tasten rechts neben `0`
 * (auf deutscher QWERTZ-Tastatur in der Regel **ß** und **´** — `event.code`: `Minus`, `Equal`).
 */
export function keyboardEventToOptionIndex(
  e: KeyboardEvent,
  optionCount: number,
): number | null {
  if (optionCount <= 0) return null;
  const map: [string, number][] = [
    ["Digit1", 0],
    ["Digit2", 1],
    ["Digit3", 2],
    ["Digit4", 3],
    ["Digit5", 4],
    ["Digit6", 5],
    ["Digit7", 6],
    ["Digit8", 7],
    ["Digit9", 8],
    ["Digit0", 9],
    ["Minus", 10],
    ["Equal", 11],
  ];
  for (const [code, idx] of map) {
    if (e.code === code && idx < optionCount) return idx;
  }
  return null;
}

export function keyboardHintLines(optionCount: number): string[] {
  if (optionCount <= 0) return [];
  if (optionCount <= 9) {
    return [
      `Tastatur (Desktop): Zifferntasten 1–${optionCount} für die jeweilige Antwort.`,
    ];
  }
  if (optionCount === 10) {
    return [
      "Tastatur (Desktop): Zifferntasten 1–9 und 0 für die 10. Antwort.",
    ];
  }
  if (optionCount === 11) {
    return [
      "Tastatur (Desktop): Ziffern 1–9, 0 für die 10.; 11. Antwort: Taste ß (rechts neben 0).",
    ];
  }
  return [
    "Tastatur (Desktop): Ziffern 1–9, 0 für die 10.; 11./12.: Tasten ß und ´ (rechts neben 0).",
  ];
}

export function desktopAnswerShortcutsActive(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(min-width: 768px) and (pointer: fine)").matches;
}

export function keyboardTargetAllowsShortcuts(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return false;
  if (target.isContentEditable) return false;
  return true;
}
