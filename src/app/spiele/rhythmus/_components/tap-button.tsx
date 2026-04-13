"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
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
      if (
        el?.closest("input, textarea, select, [contenteditable=true]")
      ) {
        return;
      }
      if (e.key !== " " && e.key !== "Enter") return;
      if (e.repeat) return;
      e.preventDefault();
      fire();
    };

    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [disabled, fire]);

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        disabled={disabled}
        className="focus-visible:ring-primary flex min-h-[7.5rem] w-full touch-manipulation items-center justify-center rounded-3xl border-4 border-amber-300/50 bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 text-xl font-black text-white shadow-[0_8px_0_rgb(180,83,9),0_12px_24px_rgba(250,166,25,0.35)] transition-all select-none hover:brightness-105 active:translate-y-1 active:shadow-[0_4px_0_rgb(180,83,9)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-75 disabled:saturate-50 disabled:shadow-none disabled:active:translate-y-0 sm:min-h-[8rem] sm:text-2xl dark:border-amber-500/35 dark:from-orange-500 dark:via-amber-500 dark:to-yellow-400 dark:shadow-[0_8px_0_rgb(120,53,15),0_12px_24px_rgba(0,0,0,0.35)]"
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
      <p className="text-dark dark:text-dark-text-muted hidden shrink-0 text-center text-sm md:block">
        Desktop:{" "}
        <kbd className="dark:bg-dark-surface rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:border-dark-border">
          Leertaste
        </kbd>{" "}
        oder{" "}
        <kbd className="dark:bg-dark-surface rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:border-dark-border">
          Enter
        </kbd>
      </p>
    </div>
  );
}
