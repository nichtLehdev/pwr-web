"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSkipGesture } from "../../../_components/use-skip-gesture";
import { celebrationSteps, type Celebration } from "../_lib/path";

/** Spielt die Schritte auf dem Pfad ab; überspringen springt direkt zum Endzustand. */
export function usePathCelebration(
  celebration: Celebration | null,
  onMove: (toId: string) => void,
  onEnd: () => void,
) {
  const steps = useMemo(
    () => (celebration ? celebrationSteps(celebration) : []),
    [celebration],
  );
  const [index, setIndex] = useState(0);
  const moved = useRef(false);
  const callbacks = useRef({ onMove, onEnd });
  useEffect(() => {
    callbacks.current = { onMove, onEnd };
  });

  const finish = useCallback(() => {
    if (!celebration) return;
    if (celebration.toId && !moved.current) {
      moved.current = true;
      callbacks.current.onMove(celebration.toId);
    }
    callbacks.current.onEnd();
  }, [celebration]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) finish();
  }, [finish]);

  const step = steps[index];
  useEffect(() => {
    if (!step) return;
    const timer = window.setTimeout(() => {
      const next = steps[index + 1];
      if (!next) return finish();
      if (next.stage === "walk" && celebration?.toId) {
        moved.current = true;
        callbacks.current.onMove(celebration.toId);
      }
      setIndex(index + 1);
    }, step.ms);
    return () => window.clearTimeout(timer);
  }, [celebration, finish, index, step, steps]);

  useSkipGesture(celebration !== null, finish, { swallow: true });

  return {
    stage: step?.stage ?? null,
    revealed: step?.revealed ?? 0,
    skip: finish,
  };
}
