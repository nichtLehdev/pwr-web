import Link from "next/link";
import { ArrowLeft, Frown } from "lucide-react";

export default function NotFound() {
  return (
    <div className="bg-background dark:bg-dark-background min-h-[70vh] py-12 md:py-16 lg:py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          {/* 404 Icon */}
          <div className="mb-8">
            <div className="bg-primary/10 dark:bg-primary/20 mx-auto inline-flex h-24 w-24 items-center justify-center rounded-full">
              <Frown className="text-primary h-12 w-12" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-dark dark:text-dark-text mb-4 text-4xl font-bold md:text-5xl lg:text-6xl">
            404
          </h1>
          <h2 className="text-dark dark:text-dark-text mb-6 text-xl font-semibold md:text-2xl">
            Seite nicht gefunden
          </h2>

          {/* Description */}
          <p className="text-dark-light dark:text-dark-text-secondary mb-8 text-lg">
            Die von Ihnen gesuchte Seite existiert leider nicht oder wurde
            verschoben.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/"
              className="bg-primary hover:bg-primary-dark inline-flex items-center justify-center rounded-lg px-6 py-3 font-semibold text-white shadow-lg transition-colors"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Zur Startseite
            </Link>
            <Link
              href="/termine"
              className="text-dark dark:text-dark-text dark:border-dark-border dark:hover:bg-dark-surface inline-flex items-center justify-center rounded-lg border-2 border-gray-300 bg-transparent px-6 py-3 font-semibold transition-colors hover:bg-gray-50"
            >
              Termine ansehen
            </Link>
          </div>

          {/* Helpful Links */}
          <div className="dark:border-dark-border mt-12 border-t border-gray-200 pt-8">
            <p className="text-dark-light dark:text-dark-text-secondary mb-4 text-sm">
              Vielleicht finden Sie hier, was Sie suchen:
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Link
                href="/aktuelles"
                className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary text-sm font-medium transition-colors"
              >
                Aktuelles
              </Link>
              <Link
                href="/termine"
                className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary text-sm font-medium transition-colors"
              >
                Termine
              </Link>
              <Link
                href="/mitmachen"
                className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary text-sm font-medium transition-colors"
              >
                Mitmachen
              </Link>
              <Link
                href="/ueber-uns"
                className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary text-sm font-medium transition-colors"
              >
                Über uns
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
