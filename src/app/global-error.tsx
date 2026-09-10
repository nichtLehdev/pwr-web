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

/**
 * Greift nur, wenn das Root-Layout selbst scheitert. Ohne Provider und ohne
 * Layout — `<html>`/`<body>` und das Theme-Skript daher von Hand.
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
              {/* Kein <Link>: Der Router-Kontext ist hier nicht verlässlich. */}
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
