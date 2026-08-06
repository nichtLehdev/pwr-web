"use client";

import { useCallback, useEffect, useState } from "react";
import type { GameId } from "../games";
import {
  loadGameState,
  recordResult as recordResultToStorage,
} from "./storage";
import type { GameAggregates, GameResultInput } from "./types";

/**
 * Local-first-Statistik eines Spiels: Bestwerte lesen und neue Ergebnisse
 * festhalten. `aggregates` ist bis zur Hydration `null` (SSR-sicher).
 */
export function useGameStats(gameId: GameId) {
  const [aggregates, setAggregates] = useState<GameAggregates | null>(null);

  useEffect(() => {
    setAggregates(loadGameState(gameId).aggregates);
  }, [gameId]);

  const recordResult = useCallback(
    (input: GameResultInput) => {
      const next = recordResultToStorage(gameId, input);
      setAggregates(next.aggregates);
      return next.aggregates;
    },
    [gameId],
  );

  return { aggregates, recordResult };
}
