"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, TriangleAlert } from "lucide-react";

/**
 * Fängt Render-Fehler aus allen Routen unterhalb von `app/` ab — das
 * Root-Layout (Navigation, Footer) bleibt dabei stehen, die Seite ist also
 * weiter bedienbar.
 *
 * Nur Fehler im Root-Layout selbst kommen hier nicht an; die fängt
 * `global-error.tsx`.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In Produktion ersetzt Next die Fehlermeldung durch `digest`. Der Wert
    // steht unten auf der Seite, damit ein Bericht aus dem Support dem
    // Server-Log zugeordnet werden kann.
    console.error("Unbehandelter Fehler:", error);
  }, [error]);

  return (
    <div className="bg-background dark:bg-dark-background min-h-[70vh] py-12 md:py-16 lg:py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-8">
            <div className="bg-primary/10 dark:bg-primary/20 mx-auto inline-flex h-24 w-24 items-center justify-center rounded-full">
              <TriangleAlert className="text-primary h-12 w-12" />
            </div>
          </div>

          <h1 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl lg:text-4xl">
            Da ist etwas schiefgelaufen
          </h1>

          <p className="text-dark-light dark:text-dark-text-secondary mb-8 text-lg">
            Diese Seite konnte nicht geladen werden. Meist hilft es schon, es
            noch einmal zu versuchen.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="bg-primary hover:bg-primary-dark inline-flex items-center justify-center rounded-lg px-6 py-3 font-semibold text-white shadow-lg transition-colors"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Erneut versuchen
            </button>
            <Link
              href="/"
              className="text-dark dark:text-dark-text dark:border-dark-border dark:hover:bg-dark-surface inline-flex items-center justify-center rounded-lg border-2 border-gray-300 bg-transparent px-6 py-3 font-semibold transition-colors hover:bg-gray-50"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Zur Startseite
            </Link>
          </div>

          <div className="dark:border-dark-border mt-12 border-t border-gray-200 pt-8">
            <p className="text-dark-light dark:text-dark-text-secondary mb-4 text-sm">
              Bleibt der Fehler bestehen, melden Sie sich gerne bei uns:
            </p>
            <Link
              href="/kontakt"
              className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary text-sm font-medium transition-colors"
            >
              Zum Kontaktformular
            </Link>
            {error.digest && (
              <p className="text-dark-light dark:text-dark-text-secondary mt-4 font-mono text-xs">
                Fehlerkennung: {error.digest}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
