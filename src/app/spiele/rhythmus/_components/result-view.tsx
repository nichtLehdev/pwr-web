"use client";

import type { ScoreResult } from "../_lib/scoring";

export interface ResultViewProps {
  result: ScoreResult;
  onRetry: () => void;
  onNext: () => void;
}

export function ResultView({ result, onRetry, onNext }: ResultViewProps) {
  return (
    <div className="dark:border-dark-border dark:bg-dark-surface dark:shadow-dark-border space-y-4 rounded-xl border border-gray-200 border-t-4 border-t-district-6 bg-white p-3 shadow-md md:space-y-6 md:p-6">
      <div className="text-center">
        <p className="text-dark dark:text-dark-text-secondary text-sm font-medium tracking-wide uppercase">
          Ergebnis
        </p>
        <p className="text-primary dark:text-primary-light text-4xl font-bold tabular-nums md:text-5xl">
          {result.percent}%
        </p>
        <p className="text-dark dark:text-dark-text-secondary mt-2 text-sm">
          {result.missingCount > 0 && (
            <span className="mr-3">Fehlend: {result.missingCount}</span>
          )}
          {result.extraCount > 0 && (
            <span className="mr-3">Zu viel: {result.extraCount}</span>
          )}
          {result.missingCount === 0 && result.extraCount === 0 && (
            <span>Alle Schläge erkannt</span>
          )}
        </p>
        <p className="text-dark dark:text-dark-text-muted mx-auto mt-1 max-w-md text-center text-xs leading-snug">
          <span className="block">
            Fehlend = kein Tipp für diesen Schlag. Zu viel = zusätzliche Tipps ohne
            zugehörigen Schlag.
          </span>
        </p>
        {result.medianAbsDeltaMs !== null && (
          <p className="text-dark dark:text-dark-text-muted mt-1 text-xs">
            Median Abweichung: {Math.round(result.medianAbsDeltaMs)} ms
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-sm">
          <thead>
            <tr className="border-dark-border text-dark dark:text-dark-text-secondary border-b dark:border-dark-border">
              <th className="py-2 pr-2">Schlag</th>
              <th className="py-2 pr-2">Soll (ms)</th>
              <th className="py-2 pr-2">Ist (ms)</th>
              <th className="py-2">Δ</th>
            </tr>
          </thead>
          <tbody>
            {result.beats.map((b, i) => (
              <tr
                key={i}
                className="border-dark-border/60 border-b dark:border-dark-border/60"
              >
                <td className="text-dark dark:text-dark-text py-1.5 pr-2">
                  {i + 1}
                </td>
                <td className="text-dark dark:text-dark-text py-1.5 pr-2 tabular-nums">
                  {Math.round(b.expectedMs)}
                </td>
                <td className="text-dark dark:text-dark-text py-1.5 pr-2 tabular-nums">
                  {b.tappedMs !== null ? Math.round(b.tappedMs) : "—"}
                </td>
                <td
                  className={
                    b.deltaMs === null
                      ? "text-red-600 dark:text-red-400"
                      : Math.abs(b.deltaMs) < 40
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-700 dark:text-amber-300"
                  }
                >
                  {b.deltaMs !== null ? `${b.deltaMs > 0 ? "+" : ""}${Math.round(b.deltaMs)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onRetry}
          className="border-dark-border text-dark hover:bg-background-secondary dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-background flex-1 rounded-lg border bg-white px-4 py-3 font-medium transition dark:bg-dark-surface"
        >
          Nochmal
        </button>
        <button
          type="button"
          onClick={onNext}
          className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark flex-1 rounded-lg px-4 py-3 font-medium text-white transition"
        >
          Nächster Rhythmus
        </button>
      </div>
    </div>
  );
}
