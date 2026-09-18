"use client";

import { Camera } from "lucide-react";

interface MediaCreditProps {
  copyright?: string | null;
  creator?: string | null;
  /** `light`: auf Nachtgrund (Lightbox). */
  variant?: "default" | "light";
  /** Optional: show a small camera icon next to the photographer/creator */
  showCreatorIcon?: boolean;
  className?: string;
}

/** Copyright and creator (photographer) of a medium, when set. */
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
      ? "text-night-muted"
      : "text-dark dark:text-night-muted";

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
            <Camera size={14} className="shrink-0 opacity-80" aria-hidden />
          )}
          {creator}
        </span>
      )}
    </p>
  );
}
