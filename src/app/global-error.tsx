"use client";

import { useEffect } from "react";
import "../styles/globals.css";

/**
 * Letzte Auffanglinie: greift nur, wenn das Root-Layout selbst beim Rendern
 * scheitert. Weil dieses Layout dann ersetzt wird, gibt es hier weder
 * Navigation noch Footer noch Provider — `<html>` und `<body>` müssen deshalb
 * von Hand gesetzt werden, und alles auf dieser Seite muss ohne den
 * App-Kontext auskommen (kein `next/link`, kein tRPC, kein ThemeProvider).
 *
 * Das Theme-Skript ist absichtlich aus dem Root-Layout dupliziert: ohne es
 * stünde die Seite immer im Hell-Modus, auch bei dunkel eingestelltem System.
 */
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
        <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-white px-4 py-16">
          <div className="mx-auto max-w-xl text-center">
            <h1 className="dark:text-dark-text mb-6 text-2xl font-bold text-gray-900 md:text-3xl">
              Die Seite konnte nicht geladen werden
            </h1>

            <p className="dark:text-dark-text-secondary mb-8 text-lg text-gray-600">
              Es ist ein unerwarteter Fehler aufgetreten. Bitte laden Sie die
              Seite neu.
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={reset}
                className="bg-primary hover:bg-primary-dark inline-flex items-center justify-center rounded-lg px-6 py-3 font-semibold text-white shadow-lg transition-colors"
              >
                Erneut versuchen
              </button>
              {/*
                Bewusst kein <Link>: Wenn das Root-Layout gescheitert ist, ist
                der App-Router-Kontext nicht mehr verlässlich. Ein echter
                Seitenwechsel baut die Anwendung sauber neu auf — genau das,
                was hier gebraucht wird.
              */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="dark:text-dark-text dark:border-dark-border dark:hover:bg-dark-surface inline-flex items-center justify-center rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-900 transition-colors hover:bg-gray-50"
              >
                Zur Startseite
              </a>
            </div>

            {error.digest && (
              <p className="dark:text-dark-text-secondary mt-10 font-mono text-xs text-gray-500">
                Fehlerkennung: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
