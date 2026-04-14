/**
 * Haptik: `navigator.vibrate` (Android u. a.) + Fallback für iOS Safari:
 * seit iOS 17.4 löst ein programmatischer Klick auf `<input type="checkbox" switch>`
 * kurzes System-Haptik aus (kein offizielles Vibration-API auf vielen iOS-Versionen).
 * @see https://github.com/tijnjh/ios-haptics
 */

function likelyTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/** iPadOS meldet oft Desktop-UA, aber Touch-Points > 0 */
function looksLikeIosTouchDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function mayUseIosSwitchFallback(): boolean {
  if (typeof document === "undefined") return false;
  return likelyTouchDevice() || looksLikeIosTouchDevice();
}

/**
 * Ein kurzer Haptik-Impuls über das Safari-„switch“-Hack.
 * Nur sinnvoll, wenn `navigator.vibrate` fehlt oder nichts tut.
 */
function iosSwitchPulse(): void {
  if (!mayUseIosSwitchFallback()) return;
  try {
    const labelEl = document.createElement("label");
    labelEl.setAttribute("aria-hidden", "true");
    labelEl.style.cssText =
      "position:fixed;left:-100vw;opacity:0;width:1px;height:1px;overflow:hidden;pointer-events:none;";

    const inputEl = document.createElement("input");
    inputEl.type = "checkbox";
    inputEl.setAttribute("switch", "");
    labelEl.appendChild(inputEl);

    document.body.appendChild(labelEl);
    labelEl.click();
    requestAnimationFrame(() => {
      try {
        document.body.removeChild(labelEl);
      } catch {
        /* noop */
      }
    });
  } catch {
    /* noop */
  }
}

function tryStandardVibrate(pattern: number | number[]): boolean {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function"
  ) {
    return false;
  }
  try {
    const ok = navigator.vibrate(pattern);
    return ok !== false;
  } catch {
    return false;
  }
}

function vibrateWithFallback(pattern: number | number[]): void {
  if (tryStandardVibrate(pattern)) {
    return;
  }

  if (typeof pattern === "number") {
    if (pattern > 0) iosSwitchPulse();
    return;
  }

  let delay = 0;
  for (let i = 0; i < pattern.length; i++) {
    const ms = pattern[i]!;
    if (i % 2 === 0 && ms > 0) {
      const d = delay;
      window.setTimeout(() => {
        iosSwitchPulse();
      }, d);
    }
    delay += ms;
  }
}

/** Kurzes Feedback beim Tippen */
export function hapticsTap(): void {
  vibrateWithFallback(12);
}

/** Einzählschlag: leicht; erster Schlag etwas kräftiger. */
export function hapticsCountdownBeat(isAccent: boolean): void {
  if (!likelyTouchDevice() && !looksLikeIosTouchDevice()) return;
  vibrateWithFallback(isAccent ? [14, 35, 10] : 10);
}

/** Metronom während des Spiels */
export function hapticsMetronomeBeat(): void {
  if (!likelyTouchDevice() && !looksLikeIosTouchDevice()) return;
  vibrateWithFallback(6);
}

/** Tippphase beginnt */
export function hapticsPlayingStart(): void {
  if (!likelyTouchDevice() && !looksLikeIosTouchDevice()) return;
  vibrateWithFallback([12, 30, 12]);
}
