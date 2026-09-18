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

/** Δ-Farbe an der echten Toleranz. Kein Grün: getroffen ist Tinte, knapp daneben Messing, daneben Rot. */
function deltaColorClass(deltaMs: number | null, toleranceMs: number): string {
  if (deltaMs === null) return "text-red-700 dark:text-red-400";
  const abs = Math.abs(deltaMs);
  if (abs <= toleranceMs * 0.5) return "text-ink dark:text-night-text";
  if (abs <= toleranceMs) return "text-primary-ink dark:text-primary";
  return "text-red-700 dark:text-red-400";
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
    <div className="border-rule dark:border-night-rule flex flex-col gap-[clamp(0.75rem,2.2svh,1.5rem)] border-t pt-[clamp(0.75rem,2.2svh,1.5rem)]">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-stretch sm:gap-6">
        <p className="on-orange bg-primary text-ink flex min-w-[8rem] flex-col items-center justify-center px-5 py-2.5">
          <span className="sr-only">Trefferquote {result.percent} Prozent</span>
          <span
            aria-hidden
            className="condensed text-[clamp(2.25rem,6.5svh,4rem)] leading-none font-extrabold tabular-nums"
          >
            {result.percent}%
          </span>
          <span
            aria-hidden
            className="semi-condensed mt-1.5 text-xs font-bold tracking-[0.06em] uppercase"
          >
            Treffer
          </span>
        </p>

        <div className="flex min-w-0 flex-1 flex-col justify-center text-center sm:text-left">
          <p className="condensed text-ink dark:text-night-text flex items-center justify-center gap-2.5 text-[clamp(1.25rem,3svh,1.875rem)] leading-tight font-bold sm:justify-start">
            <CheerIcon
              className="h-6 w-6 shrink-0 stroke-[1.4] md:h-8 md:w-8"
              aria-hidden
            />
            {cheer.line}
          </p>
          <p className="text-dark dark:text-night-muted mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm sm:justify-start">
            {result.missingCount > 0 && (
              <span>Verpasst: {result.missingCount}</span>
            )}
            {result.extraCount > 0 && (
              <span>Extra-Tipps: {result.extraCount}</span>
            )}
            {result.missingCount === 0 && result.extraCount === 0 && (
              <span>Alle Schläge getroffen</span>
            )}
            {result.medianAbsDeltaMs !== null && (
              <span>
                Typische Abweichung: {Math.round(result.medianAbsDeltaMs)} ms
              </span>
            )}
          </p>
          {biasLine && (
            <p className="text-dark dark:text-night-muted mt-1 text-sm">
              {biasLine}
            </p>
          )}
        </div>
      </div>

      <details className="group border-rule dark:border-night-rule border">
        <summary
          className={cn(
            "semi-condensed text-ink dark:text-night-text flex min-h-11 cursor-pointer list-none items-center justify-center px-4 text-sm font-bold marker:hidden [&::-webkit-details-marker]:hidden",
            GAME_FOCUS_RING,
          )}
        >
          <span className="group-open:hidden">Alle Schläge anzeigen</span>
          <span className="hidden group-open:inline">Details ausblenden</span>
        </summary>
        <p className="text-dark dark:text-night-muted border-rule dark:border-night-rule border-t px-4 pt-2 pb-1 text-xs">
          „Verpasst“ = kein Tipp für diesen Schlag. „Extra“ = Tipp ohne
          passenden Schlag.
        </p>
        <div className="overflow-x-auto px-3 pb-3">
          <table className="w-full min-w-[280px] text-left text-sm">
            <thead>
              <tr className="semi-condensed border-rule text-dark dark:border-night-rule dark:text-night-muted border-b text-xs font-bold tracking-[0.06em] uppercase">
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
                  className="border-rule/60 dark:border-night-rule/60 border-b"
                >
                  <td className="text-dark dark:text-night-muted py-1.5 pr-2 tabular-nums">
                    {i + 1}
                  </td>
                  <td className="text-ink dark:text-night-text py-1.5 pr-2 tabular-nums">
                    {Math.round(b.expectedMs)}
                  </td>
                  <td className="text-ink dark:text-night-text py-1.5 pr-2 tabular-nums">
                    {b.tappedMs !== null ? Math.round(b.tappedMs) : "—"}
                  </td>
                  <td
                    className={cn(
                      "py-1.5 font-bold tabular-nums",
                      deltaColorClass(b.deltaMs, result.toleranceMs),
                    )}
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

      <div className="flex flex-col gap-2 sm:flex-row">
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
