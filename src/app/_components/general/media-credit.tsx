"use client";

import { Camera } from "lucide-react";

interface MediaCreditProps {
  copyright?: string | null;
  creator?: string | null;
  /** Optional: use light text (e.g. on dark image backgrounds) */
  variant?: "default" | "light";
  /** Optional: show a small camera icon next to the photographer/creator */
  showCreatorIcon?: boolean;
  className?: string;
}

/**
 * Displays copyright and creator (photographer) for media when set.
 * Use below or overlay on images wherever media is displayed.
 */
export default function MediaCredit({
  copyright,
  creator,
  variant = "default",
  showCreatorIcon = false,
  className = "",
}: MediaCreditProps) {
  const hasCredit = copyright || creator;
  if (!hasCredit) return null;

  const variantClasses =
    variant === "light"
      ? "text-white/90 text-shadow-sm"
      : "text-dark-muted text-gray-500 dark:text-gray-400";

  return (
    <p
      className={`flex flex-wrap items-center gap-x-1.5 gap-y-0 text-xs ${variantClasses} ${className}`}
      aria-label="Bildnachweis"
    >
      {copyright && <span>{copyright}</span>}
      {copyright && creator && <span aria-hidden>•</span>}
      {creator && (
        <span className="inline-flex items-center gap-1">
          {showCreatorIcon && (
            <Camera
              size={14}
              className="shrink-0 opacity-80"
              aria-hidden
            />
          )}
          {creator}
        </span>
      )}
    </p>
  );
}
