import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { GAME_FOCUS_RING } from "../_lib/focus-ring";

/** Großer Spielknopf; die wichtigste Handlung im Dock. */
export function ArcadeButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "spiel-pad bg-primary border-ink text-ink condensed mb-2 flex min-h-14 w-full items-center justify-center rounded-2xl border-[3px] px-4 text-2xl font-extrabold active:translate-y-1.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0",
        GAME_FOCUS_RING,
        className,
      )}
      {...props}
    />
  );
}
