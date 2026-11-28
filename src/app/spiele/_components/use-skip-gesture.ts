"use client";

import { useEffect, useRef } from "react";

const IGNORED_KEYS = new Set(["Tab", "Shift", "Control", "Alt", "Meta"]);
/** Danach gehört ein Klick nicht mehr zum Antippen, etwa nach langem Halten. */
const CLICK_WINDOW_MS = 700;

/** Antippen, Klicken oder eine Taste überspringt, mobil wie am Rechner. */
export function useSkipGesture(
  active: boolean,
  onSkip: () => void,
  { swallow = false }: { swallow?: boolean } = {},
): void {
  const skipRef = useRef(onSkip);
  useEffect(() => {
    skipRef.current = onSkip;
  });

  useEffect(() => {
    if (!active) return;
    // Überlebt das Ende der Animation: Der Klick kommt erst nach dem Loslassen.
    const swallowNextClick = () => {
      const stop = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        release();
      };
      const release = () => {
        window.removeEventListener("click", stop, true);
        window.clearTimeout(timer);
      };
      const timer = window.setTimeout(release, CLICK_WINDOW_MS);
      window.addEventListener("click", stop, true);
    };
    const onPointer = () => {
      skipRef.current();
      if (swallow) swallowNextClick();
    };
    const onKey = (event: KeyboardEvent) => {
      if (IGNORED_KEYS.has(event.key)) return;
      skipRef.current();
      if (swallow) {
        event.preventDefault();
        event.stopPropagation();
        swallowNextClick();
      }
    };
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [active, swallow]);
}
