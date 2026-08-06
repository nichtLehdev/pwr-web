"use client";

import {
  Dumbbell,
  Music,
  PartyPopper,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/_components/ui/button";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
import type { ScoreResult } from "../_lib/scoring";

export interface ResultViewProps {
  result: ScoreResult;
  onRetry: () => void;
  /** Gleicher Rhythmus, zurück zur Vorschau. */
  onRepeat: () => void;
  onNext: () => void;
}

function cheerLine(percent: number): { line: string; icon: LucideIcon } {
  if (percent >= 92) return { line: "Hammer — fast perfekt!", icon: Trophy };
  if (percent >= 80) return { line: "Richtig gut im Takt!", icon: Star };
  if (percent >= 65)
    return { line: "Weiter so, das klappt!", icon: PartyPopper };
  if (percent >= 45) return { line: "Üben lohnt sich!", icon: Dumbbell };
  return { line: "Nächstes Mal wird’s noch besser!", icon: Music };
}

/** „Meist zu früh/zu spät“ aus dem vorzeichenbehafteten Median. */
function timingBiasLine(medianSignedDeltaMs: number | null): string | null {
  if (medianSignedDeltaMs === null) return null;
  if (Math.abs(medianSignedDeltaMs) <= 15) {
    return "Dein Timing war insgesamt sehr genau.";
  }
  return medianSignedDeltaMs < 0
    ? "Du warst meist etwas zu früh."
    : "Du warst meist etwas zu spät.";
}

/** Δ-Farbe an der echten Toleranz: grün ≤ ½ Toleranz, gelb ≤ Toleranz, sonst rot. */
function deltaColorClass(deltaMs: number | null, toleranceMs: number): string {
  if (deltaMs === null) return "text-red-600 dark:text-red-400";
  const abs = Math.abs(deltaMs);
  if (abs <= toleranceMs * 0.5) return "text-emerald-600 dark:text-emerald-400";
  if (abs <= toleranceMs) return "text-amber-700 dark:text-amber-300";
  return "text-red-600 dark:text-red-400";
}

export function ResultView({
  result,
  onRetry,
  onRepeat,
  onNext,
}: ResultViewProps) {
  const cheer = cheerLine(result.percent);
  const CheerIcon = cheer.icon;
  const biasLine = timingBiasLine(result.medianSignedDeltaMs);

  return (
    <div className="dark:border-dark-border/80 space-y-5 border-t border-gray-200/90 pt-5 md:space-y-6 md:pt-6">
      <div className="text-center">
        <CheerIcon
          className="text-primary mx-auto h-12 w-12 stroke-[1.35] md:h-20 md:w-20 md:stroke-[1.3]"
          aria-hidden
        />
        <p className="text-dark dark:text-dark-text mt-3 text-lg font-bold md:text-xl">
          {cheer.line}
        </p>
        <p
          className="text-primary dark:text-primary-light mt-2 text-5xl font-bold tabular-nums md:text-6xl"
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
            Typische Abweichung: {Math.round(result.medianAbsDeltaMs)} ms
          </p>
        )}
        {biasLine && (
          <p className="text-dark dark:text-dark-text-secondary mt-1 text-xs">
            {biasLine}
          </p>
        )}
      </div>

      <details className="group dark:border-dark-border dark:bg-dark-background/40 rounded-lg border border-gray-200/80 bg-white/50">
        <summary
          className={cn(
            "text-dark dark:text-dark-text cursor-pointer list-none rounded-lg px-4 py-3 text-center text-sm font-bold marker:hidden [&::-webkit-details-marker]:hidden",
            GAME_FOCUS_RING,
          )}
        >
          <span className="group-open:hidden">Alle Schläge anzeigen</span>
          <span className="hidden group-open:inline">Details ausblenden</span>
        </summary>
        <p className="text-dark dark:text-dark-text-muted dark:border-dark-border border-t border-gray-100 px-4 pb-2 text-xs">
          „Verpasst“ = kein Tipp für diesen Schlag. „Extra“ = Tipp ohne
          passenden Schlag.
        </p>
        <div className="overflow-x-auto px-2 pb-3">
          <table className="w-full min-w-[280px] text-left text-sm">
            <thead>
              <tr className="border-dark-border text-dark dark:text-dark-text-secondary dark:border-dark-border border-b text-xs uppercase">
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
                  className="border-dark-border/50 dark:border-dark-border/50 border-b"
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
                    className={deltaColorClass(b.deltaMs, result.toleranceMs)}
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
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={onRetry}
        >
          Von vorn
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={onRepeat}
        >
          Nochmal diesen Rhythmus
        </Button>
        <Button type="button" size="lg" className="flex-1" onClick={onNext}>
          Nächster Rhythmus
        </Button>
      </div>
    </div>
  );
}
