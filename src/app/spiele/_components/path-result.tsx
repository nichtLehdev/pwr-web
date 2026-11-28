"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/app/_components/ui/button";
import { CHALLENGE_PASS_PERCENT } from "../_lib/learning-path";
import { GameResult } from "./game-kit";
import { GameDock } from "./game-shell-context";
import { scrollGameToTop } from "./path-screen";

/** Ende einer Stufe oder Challenge: entweder nochmal oder zurück zum Pfad. */
export function PathResult({
  percent,
  value,
  valueLabel,
  rows,
  challenge,
  detailsLabel,
  children,
  onAgain,
  onContinue,
}: {
  percent: number;
  value: string;
  valueLabel: string;
  rows?: [string, string][];
  /** `nextSection`: 1-basierte Nummer des nächsten Abschnitts, falls es einen gibt. */
  challenge: { passed: boolean; nextSection: number | null } | null;
  detailsLabel?: string;
  children?: ReactNode;
  onAgain: () => void;
  onContinue: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => scrollGameToTop(rootRef.current), []);

  return (
    <div ref={rootRef} className="flex flex-col gap-4 pb-2">
      <GameResult
        percent={percent}
        value={value}
        valueLabel={valueLabel}
        rows={rows}
        detailsLabel={detailsLabel}
        headline={
          challenge
            ? challenge.passed
              ? "Challenge geschafft."
              : "Noch nicht geschafft."
            : undefined
        }
        celebrate={challenge ? challenge.passed : undefined}
        badge={
          challenge?.passed && challenge.nextSection
            ? `Abschnitt ${challenge.nextSection} ist frei`
            : null
        }
        note={
          challenge && !challenge.passed
            ? `Du brauchst ${CHALLENGE_PASS_PERCENT} % und noch Puste am Ende. Übe die Stufen noch einmal, dann klappt es.`
            : null
        }
      >
        {children}
      </GameResult>
      <GameDock>
        <div className="flex gap-2">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="flex-1"
            onClick={onAgain}
          >
            Nochmal
          </Button>
          <Button
            type="button"
            size="lg"
            className="spiel-action flex-1"
            onClick={onContinue}
          >
            Weiter
          </Button>
        </div>
      </GameDock>
    </div>
  );
}
