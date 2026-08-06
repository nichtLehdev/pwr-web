/** Hilfen rund um den PWA-Betrieb (installierte App vs. Browser-Tab). */

/** Läuft die Seite als installierte App (Home-Bildschirm)? */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari meldet den Standalone-Modus nur über navigator.standalone.
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

/** iPhone/iPad — dort gibt es kein beforeinstallprompt, nur "Zum Home-Bildschirm". */
export function isIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS meldet sich als macOS mit Touch-Unterstützung.
  return ua.includes("Macintosh") && window.navigator.maxTouchPoints > 1;
}
