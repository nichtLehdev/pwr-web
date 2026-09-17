"use client";

import { useEffect } from "react";
import "../styles/globals.css";

const themeBootstrap = `
  (function() {
    try {
      const theme = localStorage.getItem('theme');
      const root = document.documentElement;

      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.add('light');
      } else {
        root.classList.add(
          window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        );
      }
    } catch (e) {}
  })();
`;

// Knopf und Link teilen sich diese Klassen von Hand: `ui/button` selbst zu
// importieren wäre ein Griff in einen Baum, der hier gerade nicht steht.
const PRIMARY_BUTTON =
  "bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted inline-flex items-center justify-center px-6 py-3 font-semibold transition-colors";
const OUTLINE_LINK =
  "border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night inline-flex items-center justify-center border-2 px-6 py-3 font-semibold transition-colors";

/**
 * Greift nur, wenn das Root-Layout selbst scheitert. Ohne Provider und ohne
 * Layout — `<html>`/`<body>` und das Theme-Skript daher von Hand.
 *
 * Kein Archivo, keine Programmheft-Schrift: Die Variable dafür setzt
 * `layout.tsx` auf `<html>`, und genau dieses Layout ist hier ausgefallen.
 * Nur `.programm` (Auswahl-, Caret- und Fokusfarben) ist gefahrlos, weil sie
 * allein von den Theme-Tokens aus `globals.css` abhängt, die oben direkt
 * importiert werden.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Schwerwiegender Fehler im Root-Layout:", error);
  }, [error]);

  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <title>Fehler | Posaunenwerk Rheinland</title>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        />
      </head>
      <body>
        <div className="programm bg-paper dark:bg-night flex min-h-screen items-center justify-center px-4 py-16">
          <div className="mx-auto max-w-xl text-center">
            <h1 className="text-ink dark:text-night-text mb-6 text-2xl font-bold md:text-3xl">
              Die Seite konnte nicht geladen werden
            </h1>

            <p className="text-dark dark:text-night-muted mb-8 text-lg">
              Es ist ein unerwarteter Fehler aufgetreten. Bitte laden Sie die
              Seite neu.
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <button type="button" onClick={reset} className={PRIMARY_BUTTON}>
                Erneut versuchen
              </button>
              {/* Kein <Link>: Der Router-Kontext ist hier nicht verlässlich. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className={OUTLINE_LINK}>
                Zur Startseite
              </a>
            </div>

            {error.digest && (
              <p className="text-dark dark:text-night-muted mt-10 font-mono text-xs">
                Fehlerkennung: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
