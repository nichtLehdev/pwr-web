"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
import { hapticsTap } from "../_lib/haptics";

export interface TapButtonProps {
  disabled: boolean;
  onTap: (timeMs: number) => void;
  label?: string;
}

export function TapButton({
  disabled,
  onTap,
  label = "Tippen",
}: TapButtonProps) {
  const lastRef = useRef(0);
  const onTapRef = useRef(onTap);
  const disabledRef = useRef(disabled);
  const prevDisabledRef = useRef(true);

  useLayoutEffect(() => {
    onTapRef.current = onTap;
    disabledRef.current = disabled;
    if (prevDisabledRef.current && !disabled) {
      lastRef.current = 0;
    }
    prevDisabledRef.current = disabled;
  }, [disabled, onTap]);

  const fire = useCallback(() => {
    if (disabledRef.current) return;
    const t = performance.now();
    if (t - lastRef.current < 45) return;
    lastRef.current = t;
    onTapRef.current(t);
    hapticsTap();
  }, []);

  useEffect(() => {
    if (disabled) return;

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable=true]")) {
        return;
      }
      if (e.key !== " " && e.key !== "Enter") return;
      if (e.repeat) return;
      e.preventDefault();
      fire();
    };

    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [disabled, fire]);

  return (
    <div className="flex w-full flex-col gap-1.5">
      <button
        type="button"
        disabled={disabled}
        className={cn(
          /* Druckfläche statt Knopf: Orange trägt hier die Fläche, die Schrift
             bleibt Tinte (weiß auf Orange wären 1,99:1). Die Höhe folgt dem
             Fenster, damit auf niedrigen Bildschirmen nicht ein Drittel der
             Seite Tippfläche ist. */
          "semi-condensed flex min-h-[clamp(3.5rem,12dvh,6.5rem)] w-full touch-manipulation items-center justify-center border-2 text-xl font-bold transition select-none active:brightness-95 disabled:cursor-not-allowed sm:text-2xl",
          GAME_FOCUS_RING,
          disabled
            ? "border-rule text-dark dark:border-night-rule dark:text-night-muted bg-transparent"
            : "on-orange bg-primary border-ink text-ink hover:brightness-[1.03]",
        )}
        aria-label={`${label}. Desktop: Leertaste oder Eingabetaste.`}
        aria-keyshortcuts="Space Enter"
        onTouchStart={(e) => {
          e.preventDefault();
          fire();
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "touch") return;
          e.preventDefault();
          fire();
        }}
      >
        {label}
      </button>
      <p className="text-dark dark:text-night-muted hidden shrink-0 text-center text-sm md:block">
        Desktop:{" "}
        <kbd className="border-rule bg-rule/25 dark:border-night-rule dark:bg-night-raised border px-1.5 py-0.5 font-mono text-xs">
          Leertaste
        </kbd>{" "}
        oder{" "}
        <kbd className="border-rule bg-rule/25 dark:border-night-rule dark:bg-night-raised border px-1.5 py-0.5 font-mono text-xs">
          Enter
        </kbd>
      </p>
    </div>
  );
}
