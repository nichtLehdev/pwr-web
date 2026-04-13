import Link from "next/link";
import { RhythmGame } from "./_components/rhythm-game";

export default function RhythmusSpielPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h1 className="sr-only">Rhythmus-Training</h1>
      <header className="border-dark-border shrink-0 border-b bg-white shadow-sm dark:border-dark-border dark:bg-dark-surface">
        <div className="container max-w-5xl py-3 md:py-4">
          <nav
            className="text-dark dark:text-dark-text-secondary mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
            aria-label="Breadcrumb"
          >
            <Link
              href="/"
              className="hover:text-primary dark:hover:text-primary-light transition-colors"
            >
              Start
            </Link>
            <span className="text-gray-400 dark:text-gray-500" aria-hidden>
              /
            </span>
            <Link
              href="/spiele"
              className="hover:text-primary dark:hover:text-primary-light transition-colors"
            >
              Spiele
            </Link>
            <span className="text-gray-400 dark:text-gray-500" aria-hidden>
              /
            </span>
            <span className="text-dark dark:text-dark-text font-semibold">
              Rhythmus
            </span>
          </nav>
          <p className="text-dark dark:text-dark-text border-district-6 border-l-4 pl-3 text-xl font-bold md:text-2xl">
            Rhythmus-Training
          </p>
        </div>
      </header>
      <div className="container max-w-5xl min-h-0 flex-1 py-3 md:py-4">
        <RhythmGame />
      </div>
    </div>
  );
}
