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
    <div className="flex min-h-0 w-full flex-1 flex-col gap-2">
      <button
        type="button"
        disabled={disabled}
        className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark focus-visible:ring-primary active:bg-primary-dark flex min-h-[7rem] w-full flex-1 touch-manipulation items-center justify-center rounded-xl border-2 border-amber-700/30 text-xl font-bold text-white shadow-md transition-all select-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 sm:text-2xl dark:border-amber-500/20 dark:shadow-dark-border"
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
