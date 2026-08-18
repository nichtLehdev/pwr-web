"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { scorePassword, type PasswordScore } from "@/lib/password-strength";

const BAR_COLORS: Record<PasswordScore, string> = {
  0: "bg-red-500",
  1: "bg-red-500",
  2: "bg-amber-500",
  3: "bg-lime-500",
  4: "bg-green-600",
};

const TEXT_COLORS: Record<PasswordScore, string> = {
  0: "text-red-600 dark:text-red-400",
  1: "text-red-600 dark:text-red-400",
  2: "text-amber-600 dark:text-amber-400",
  3: "text-lime-700 dark:text-lime-400",
  4: "text-green-700 dark:text-green-400",
};

export interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

/**
 * Vier Segmente plus Klartext-Bewertung. Bleibt unsichtbar, solange das Feld
 * leer ist — ein rotes „Sehr schwach“ auf einem noch gar nicht angefassten
 * Formular ist keine Information, sondern nur Lärm.
 */
export function PasswordStrengthMeter({
  password,
  className,
}: PasswordStrengthMeterProps) {
  const { score, label, hint } = useMemo(
    () => scorePassword(password),
    [password],
  );

  if (!password) return null;

  // Auch "Sehr schwach" (0) färbt ein Segment: ein komplett grauer Balken sieht
  // aus, als hätte die Anzeige nichts gemessen.
  const filled = Math.max(1, score);

  return (
    <div className={cn("mt-2", className)}>
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((segment) => (
          <div
            key={segment}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              segment <= filled
                ? BAR_COLORS[score]
                : "bg-gray-200 dark:bg-gray-700",
            )}
          />
        ))}
      </div>
      <p
        className={cn("mt-1 text-xs font-medium", TEXT_COLORS[score])}
        aria-live="polite"
      >
        Passwortstärke: {label}
        {hint && (
          <span className="font-normal text-gray-500 dark:text-gray-400">
            {" "}
            — {hint}
          </span>
        )}
      </p>
    </div>
  );
}
