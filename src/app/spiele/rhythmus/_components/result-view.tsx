"use client";

import type { ScoreResult } from "../_lib/scoring";

export interface ResultViewProps {
  result: ScoreResult;
  onRetry: () => void;
  onNext: () => void;
}

function cheerLine(percent: number): { line: string; emoji: string } {
  if (percent >= 92) return { line: "Hammer — fast perfekt!", emoji: "🏆" };
  if (percent >= 80) return { line: "Richtig gut im Takt!", emoji: "🌟" };
  if (percent >= 65) return { line: "Weiter so, das klappt!", emoji: "👏" };
  if (percent >= 45) return { line: "Üben lohnt sich!", emoji: "💪" };
  return { line: "Nächstes Mal wird’s noch besser!", emoji: "🎵" };
}

export function ResultView({ result, onRetry, onNext }: ResultViewProps) {
  const cheer = cheerLine(result.percent);

  return (
    <div className="dark:border-dark-border/80 space-y-5 rounded-3xl border-2 border-amber-200/80 bg-gradient-to-b from-white to-amber-50/50 p-4 shadow-lg shadow-amber-200/30 dark:from-dark-surface dark:to-amber-950/20 dark:shadow-amber-950/20 md:space-y-6 md:p-8">
      <div className="text-center">
        <p className="text-5xl md:text-6xl" aria-hidden>
          {cheer.emoji}
        </p>
        <p className="text-dark dark:text-dark-text mt-3 text-lg font-black md:text-xl">
          {cheer.line}
        </p>
        <p
          className="text-primary dark:text-primary-light mt-2 text-5xl font-black tabular-nums drop-shadow-sm md:text-6xl"
          aria-label={`Trefferquote ${result.percent} Prozent`}
        >
          {result.percent}%
        </p>
        <p className="text-dark dark:text-dark-text-secondary mt-3 text-sm font-medium">
          {result.missingCount > 0 && (
            <span className="mr-3">Verpasst: {result.missingCount}</span>
          )}
          {result.extraCount > 0 && (
            <span className="mr-3">Extra-Tipps: {result.extraCount}</span>
          )}
          {result.missingCount === 0 && result.extraCount === 0 && (
            <span>Alle Schläge getroffen</span>
          )}
        </p>
        {result.medianAbsDeltaMs !== null && (
          <p className="text-dark dark:text-dark-text-muted mt-2 text-xs">
            Im Schnitt {Math.round(result.medianAbsDeltaMs)} ms daneben
          </p>
        )}
      </div>

      <details className="group rounded-2xl border border-gray-200/80 bg-white/70 dark:border-dark-border dark:bg-dark-background/50">
        <summary className="cursor-pointer list-none px-4 py-3 text-center text-sm font-bold text-dark marker:hidden dark:text-dark-text [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Alle Schläge anzeigen</span>
          <span className="hidden group-open:inline">Details ausblenden</span>
        </summary>
        <p className="text-dark dark:text-dark-text-muted border-t border-gray-100 px-4 pb-2 text-xs dark:border-dark-border">
          „Verpasst“ = kein Tipp für diesen Schlag. „Extra“ = Tipp ohne passenden
          Schlag.
        </p>
        <div className="overflow-x-auto px-2 pb-3">
          <table className="w-full min-w-[280px] text-left text-sm">
            <thead>
              <tr className="border-dark-border text-dark dark:text-dark-text-secondary border-b text-xs uppercase dark:border-dark-border">
                <th className="py-2 pr-2">Nr.</th>
                <th className="py-2 pr-2">Soll</th>
                <th className="py-2 pr-2">Ist</th>
                <th className="py-2">Δ</th>
              </tr>
            </thead>
            <tbody>
              {result.beats.map((b, i) => (
                <tr
                  key={i}
                  className="border-dark-border/50 border-b dark:border-dark-border/50"
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
                    {b.deltaMs !== null
                      ? `${b.deltaMs > 0 ? "+" : ""}${Math.round(b.deltaMs)}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onRetry}
          className="border-dark-border text-dark hover:bg-background-secondary dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-background flex-1 rounded-2xl border-2 bg-white px-4 py-4 text-base font-bold transition dark:bg-dark-surface"
        >
          Von vorn
        </button>
        <button
          type="button"
          onClick={onNext}
          className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark flex-1 rounded-2xl px-4 py-4 text-base font-black text-white shadow-lg shadow-amber-600/25 transition active:scale-[0.99]"
        >
          Nächster Rhythmus
        </button>
      </div>
    </div>
  );
}
